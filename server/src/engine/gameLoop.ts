import { getDb } from '../db/database.js';
import { computeProduction, computeStorage, type Buildings } from './production.js';
import { simulateCombat } from './combat.js';

const TICK_INTERVAL = 5000; // 5 secondes
let tickTimer: ReturnType<typeof setInterval> | null = null;

interface PlanetRow {
  id: string;
  user_id: string;
  metal: number;
  crystal: number;
  deuterium: number;
  temperature: number;
  buildings: string;
  ships: string;
  defenses: string;
}

interface BuildingQueueRow {
  id: number;
  planet_id: string;
  building: string;
  target_level: number;
  remaining_time: number;
  total_time: number;
  started_at: number;
}

interface ResearchQueueRow {
  user_id: string;
  planet_id: string;
  research: string;
  target_level: number;
  remaining_time: number;
  total_time: number;
  started_at: number;
}

interface ShipyardQueueRow {
  id: number;
  planet_id: string;
  unit_type: string;
  unit_category: string;
  quantity: number;
  remaining: number;
  unit_time: number;
  elapsed: number;
  started_at: number;
}

interface FleetRow {
  id: string;
  user_id: string;
  ships: string;
  origin_galaxy: number;
  origin_system: number;
  origin_position: number;
  dest_galaxy: number;
  dest_system: number;
  dest_position: number;
  mission: string;
  cargo: string;
  arrival_time: number;
  return_time: number | null;
  resolved: number;
}

export function startGameLoop() {
  if (tickTimer) return;
  console.log('Game loop started (every 5s)');
  // Au demarrage, recalculer les remaining_time de toutes les queues
  // pour rattraper le temps ecoule pendant l'arret du serveur
  recalculateAllQueues();
  tickTimer = setInterval(gameTick, TICK_INTERVAL);
}

export function stopGameLoop() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

// Recalculer remaining_time a partir de started_at + total_time
// Appele au demarrage du serveur pour rattraper le temps d'arret
function recalculateAllQueues() {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Buildings
  db.prepare(`
    UPDATE building_queues
    SET remaining_time = MAX(0, (started_at + total_time) - ?)
  `).run(now);

  // Research
  db.prepare(`
    UPDATE research_queues
    SET remaining_time = MAX(0, (started_at + total_time) - ?)
  `).run(now);

  // Shipyard: recalculer elapsed en fonction du temps ecoule
  const shipQueues = db.prepare('SELECT * FROM shipyard_queues ORDER BY id').all() as ShipyardQueueRow[];
  for (const q of shipQueues) {
    const totalElapsed = now - q.started_at;
    // Combien d'unites completees par le temps ecoule total
    const unitsCompleted = Math.min(q.quantity, Math.floor(totalElapsed / q.unit_time));
    const remaining = q.quantity - unitsCompleted;
    const elapsed = totalElapsed - (unitsCompleted * q.unit_time);

    if (remaining <= 0) {
      // Toutes les unites sont terminees — les ajouter d'un coup
      for (let i = 0; i < q.quantity - (q.quantity - q.remaining); i++) {
        addUnitToPlanet(db, q.planet_id, q.unit_type, q.unit_category);
      }
      db.prepare('DELETE FROM shipyard_queues WHERE id = ?').run(q.id);
    } else {
      // Ajouter les unites completees depuis le dernier etat connu
      const newlyCompleted = (q.quantity - q.remaining) < unitsCompleted
        ? unitsCompleted - (q.quantity - q.remaining) : 0;
      for (let i = 0; i < newlyCompleted; i++) {
        addUnitToPlanet(db, q.planet_id, q.unit_type, q.unit_category);
      }
      db.prepare('UPDATE shipyard_queues SET remaining = ?, elapsed = ? WHERE id = ?').run(
        remaining, Math.floor(elapsed), q.id,
      );
    }
  }

  // Completer les constructions et recherches terminees
  const completedBuildings = db.prepare('SELECT * FROM building_queues WHERE remaining_time <= 0').all() as BuildingQueueRow[];
  for (const q of completedBuildings) {
    completeBuildingQueue(db, q);
  }

  const completedResearch = db.prepare('SELECT * FROM research_queues WHERE remaining_time <= 0').all() as ResearchQueueRow[];
  for (const q of completedResearch) {
    completeResearchQueue(db, q);
  }

  console.log(`Queues recalculated at startup (now=${now})`);
}

function gameTick() {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  try {
    // === 1. Production de ressources ===
    tickProduction(db, TICK_INTERVAL / 1000);

    // === 2. Files de construction (basé sur timestamps absolus) ===
    tickBuildingQueues(db, now);

    // === 3. Files de recherche (basé sur timestamps absolus) ===
    tickResearchQueues(db, now);

    // === 4. Files chantier naval ===
    tickShipyardQueues(db, TICK_INTERVAL / 1000);

    // === 5. Flottes ===
    tickFleets(db, now);
  } catch (err) {
    console.error('Game tick error:', err);
  }
}

// Rattrapage quand un joueur se reconnecte apres une absence
export function catchUp(userId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // D'abord, recalculer les remaining_time des queues de ce joueur
  // basé sur started_at + total_time (timestamps absolus)
  db.prepare(`
    UPDATE building_queues
    SET remaining_time = MAX(0, (started_at + total_time) - ?)
    WHERE planet_id IN (SELECT id FROM planets WHERE user_id = ?)
  `).run(now, userId);

  db.prepare(`
    UPDATE research_queues
    SET remaining_time = MAX(0, (started_at + total_time) - ?)
    WHERE user_id = ?
  `).run(now, userId);

  // Completer les constructions terminees
  const queues = db.prepare(`
    SELECT bq.* FROM building_queues bq
    JOIN planets p ON p.id = bq.planet_id
    WHERE p.user_id = ? AND bq.remaining_time <= 0
  `).all(userId) as BuildingQueueRow[];

  for (const q of queues) {
    completeBuildingQueue(db, q);
  }

  // Completer les recherches terminees
  const rq = db.prepare('SELECT * FROM research_queues WHERE user_id = ? AND remaining_time <= 0').get(userId) as ResearchQueueRow | undefined;
  if (rq) {
    completeResearchQueue(db, rq);
  }

  // Rattraper la production pour les planetes du joueur
  const planets = db.prepare('SELECT * FROM planets WHERE user_id = ?').all(userId) as PlanetRow[];
  const user = db.prepare('SELECT last_login FROM users WHERE id = ?').get(userId) as { last_login: number | null };
  const lastActive = user?.last_login || now;
  const elapsed = Math.max(0, now - lastActive);

  if (elapsed < 10) return;

  for (const planet of planets) {
    // Re-lire les buildings au cas ou une construction vient d'etre completee
    const freshPlanet = db.prepare('SELECT buildings, metal, crystal, deuterium FROM planets WHERE id = ?').get(planet.id) as {
      buildings: string; metal: number; crystal: number; deuterium: number;
    };
    const buildings = JSON.parse(freshPlanet.buildings) as Buildings;

    const rates = computeProduction(buildings, planet.temperature);
    const metalStorage = computeStorage(buildings.metalStorage || 0);
    const crystalStorage = computeStorage(buildings.crystalStorage || 0);
    const deutStorage = computeStorage(buildings.deuteriumTank || 0);

    const hoursElapsed = elapsed / 3600;
    const newMetal = Math.min(metalStorage, freshPlanet.metal + rates.metalPerHour * hoursElapsed);
    const newCrystal = Math.min(crystalStorage, freshPlanet.crystal + rates.crystalPerHour * hoursElapsed);
    const newDeut = Math.min(deutStorage, freshPlanet.deuterium + rates.deuteriumPerHour * hoursElapsed);

    db.prepare('UPDATE planets SET metal = ?, crystal = ?, deuterium = ? WHERE id = ?').run(
      newMetal, newCrystal, newDeut, planet.id,
    );
  }
}

// === Production ===
function tickProduction(db: ReturnType<typeof getDb>, deltaSeconds: number) {
  const planets = db.prepare('SELECT * FROM planets').all() as PlanetRow[];
  const hoursElapsed = deltaSeconds / 3600;

  const updateStmt = db.prepare('UPDATE planets SET metal = ?, crystal = ?, deuterium = ? WHERE id = ?');

  const txn = db.transaction(() => {
    for (const planet of planets) {
      const buildings = JSON.parse(planet.buildings) as Buildings;
      const rates = computeProduction(buildings, planet.temperature);

      const metalStorage = computeStorage(buildings.metalStorage || 0);
      const crystalStorage = computeStorage(buildings.crystalStorage || 0);
      const deutStorage = computeStorage(buildings.deuteriumTank || 0);

      const newMetal = Math.min(metalStorage, planet.metal + rates.metalPerHour * hoursElapsed);
      const newCrystal = Math.min(crystalStorage, planet.crystal + rates.crystalPerHour * hoursElapsed);
      const newDeut = Math.min(deutStorage, planet.deuterium + rates.deuteriumPerHour * hoursElapsed);

      if (newMetal !== planet.metal || newCrystal !== planet.crystal || newDeut !== planet.deuterium) {
        updateStmt.run(newMetal, newCrystal, newDeut, planet.id);
      }
    }
  });
  txn();
}

// === Construction ===
function tickBuildingQueues(db: ReturnType<typeof getDb>, nowUnix: number) {
  // Recalculer remaining_time a partir des timestamps absolus
  db.prepare(`
    UPDATE building_queues
    SET remaining_time = MAX(0, (started_at + total_time) - ?)
  `).run(nowUnix);

  // Recuperer les constructions terminees
  const completed = db.prepare('SELECT * FROM building_queues WHERE remaining_time <= 0').all() as BuildingQueueRow[];

  for (const q of completed) {
    completeBuildingQueue(db, q);
  }
}

function completeBuildingQueue(db: ReturnType<typeof getDb>, q: BuildingQueueRow) {
  const planet = db.prepare('SELECT buildings FROM planets WHERE id = ?').get(q.planet_id) as { buildings: string } | undefined;
  if (!planet) {
    db.prepare('DELETE FROM building_queues WHERE id = ?').run(q.id);
    return;
  }

  const buildings = JSON.parse(planet.buildings);
  buildings[q.building] = q.target_level;

  db.prepare('UPDATE planets SET buildings = ? WHERE id = ?').run(JSON.stringify(buildings), q.planet_id);
  db.prepare('DELETE FROM building_queues WHERE id = ?').run(q.id);
}

// === Recherche ===
function tickResearchQueues(db: ReturnType<typeof getDb>, nowUnix: number) {
  db.prepare(`
    UPDATE research_queues
    SET remaining_time = MAX(0, (started_at + total_time) - ?)
  `).run(nowUnix);

  const completed = db.prepare('SELECT * FROM research_queues WHERE remaining_time <= 0').all() as ResearchQueueRow[];

  for (const q of completed) {
    completeResearchQueue(db, q);
  }
}

function completeResearchQueue(db: ReturnType<typeof getDb>, q: ResearchQueueRow) {
  const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(q.user_id) as { data: string } | undefined;
  if (!researchRow) {
    db.prepare('DELETE FROM research_queues WHERE user_id = ?').run(q.user_id);
    return;
  }

  const research = JSON.parse(researchRow.data);
  research[q.research] = q.target_level;

  db.prepare('UPDATE research SET data = ? WHERE user_id = ?').run(JSON.stringify(research), q.user_id);
  db.prepare('DELETE FROM research_queues WHERE user_id = ?').run(q.user_id);
}

// === Chantier Naval ===
function tickShipyardQueues(db: ReturnType<typeof getDb>, deltaSeconds: number) {
  const queues = db.prepare('SELECT * FROM shipyard_queues ORDER BY id').all() as ShipyardQueueRow[];

  for (const q of queues) {
    let remainingDelta = deltaSeconds + q.elapsed;
    let remaining = q.remaining;

    while (remaining > 0 && remainingDelta >= q.unit_time) {
      remainingDelta -= q.unit_time;
      remaining--;
      addUnitToPlanet(db, q.planet_id, q.unit_type, q.unit_category);
    }

    if (remaining <= 0) {
      db.prepare('DELETE FROM shipyard_queues WHERE id = ?').run(q.id);
    } else {
      db.prepare('UPDATE shipyard_queues SET remaining = ?, elapsed = ? WHERE id = ?').run(
        remaining, remainingDelta, q.id,
      );
    }
  }
}

function addUnitToPlanet(db: ReturnType<typeof getDb>, planetId: string, unitType: string, category: string) {
  const field = category === 'ship' ? 'ships' : 'defenses';
  const planet = db.prepare(`SELECT ${field} FROM planets WHERE id = ?`).get(planetId) as Record<string, string> | undefined;
  if (!planet) return;

  const units = JSON.parse(planet[field]) as Record<string, number>;
  units[unitType] = (units[unitType] || 0) + 1;
  db.prepare(`UPDATE planets SET ${field} = ? WHERE id = ?`).run(JSON.stringify(units), planetId);
}

// === Flottes ===
function tickFleets(db: ReturnType<typeof getDb>, nowUnix: number) {
  const arrived = db.prepare(
    'SELECT * FROM fleet_movements WHERE arrival_time <= ? AND resolved = 0',
  ).all(nowUnix) as FleetRow[];

  for (const fleet of arrived) {
    resolveFleetArrival(db, fleet, nowUnix);
  }

  const returned = db.prepare(
    'SELECT * FROM fleet_movements WHERE return_time IS NOT NULL AND return_time <= ? AND resolved = 1',
  ).all(nowUnix) as FleetRow[];

  for (const fleet of returned) {
    resolveFleetReturn(db, fleet);
  }
}

function getTargetPlanet(db: ReturnType<typeof getDb>, fleet: FleetRow) {
  return db.prepare(
    'SELECT * FROM planets WHERE galaxy = ? AND system = ? AND position = ?',
  ).get(fleet.dest_galaxy, fleet.dest_system, fleet.dest_position) as {
    id: string; user_id: string; name: string;
    metal: number; crystal: number; deuterium: number;
    buildings: string; ships: string; defenses: string; temperature: number;
    galaxy: number; system: number; position: number;
  } | undefined;
}

function getResearchData(db: ReturnType<typeof getDb>, userId: string): Record<string, number> {
  const row = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : {};
}

function msgId(nowUnix: number): string {
  return `msg-${nowUnix}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveFleetArrival(db: ReturnType<typeof getDb>, fleet: FleetRow, nowUnix: number) {
  const ships = JSON.parse(fleet.ships) as Record<string, number>;

  if (fleet.mission === 'attack') {
    resolveAttack(db, fleet, ships, nowUnix);
  } else if (fleet.mission === 'espionage') {
    resolveEspionage(db, fleet, ships, nowUnix);
  } else if (fleet.mission === 'colonize') {
    resolveColonize(db, fleet, ships, nowUnix);
  } else if (fleet.mission === 'transport') {
    resolveTransport(db, fleet, ships, nowUnix);
  } else if (fleet.mission === 'recycle') {
    resolveRecycle(db, fleet, ships, nowUnix);
  } else {
    // deploy ou autre
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
  }
}

// === ATTAQUE ===
function resolveAttack(db: ReturnType<typeof getDb>, fleet: FleetRow, ships: Record<string, number>, nowUnix: number) {
  const target = getTargetPlanet(db, fleet);

  if (!target) {
    // Pas de planete a cette position — retour a vide
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
    db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      msgId(nowUnix), fleet.user_id, 'system', 'Attaque echouee',
      `Aucune planete en [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}].`, nowUnix,
    );
    return;
  }

  const attackerResearch = getResearchData(db, fleet.user_id);
  const defenderResearch = getResearchData(db, target.user_id);
  const targetShips = JSON.parse(target.ships) as Record<string, number>;
  const targetDefenses = JSON.parse(target.defenses) as Record<string, number>;

  const result = simulateCombat({
    attacker: {
      ships,
      weaponTech: attackerResearch.weaponsTech || 0,
      shieldTech: attackerResearch.shieldingTech || 0,
      armourTech: attackerResearch.armourTech || 0,
    },
    defender: {
      ships: targetShips,
      defenses: targetDefenses,
      weaponTech: defenderResearch.weaponsTech || 0,
      shieldTech: defenderResearch.shieldingTech || 0,
      armourTech: defenderResearch.armourTech || 0,
      resources: { metal: target.metal, crystal: target.crystal, deuterium: target.deuterium },
    },
  });

  // Mettre a jour la flotte attaquante (survivants + butin)
  db.prepare('UPDATE fleet_movements SET ships = ?, cargo = ?, resolved = 1 WHERE id = ?').run(
    JSON.stringify(result.attackerSurvivors), JSON.stringify(result.loot), fleet.id,
  );

  // Mettre a jour la planete cible (vaisseaux survivants, defenses survivantes, ressources pillees)
  // Les defenses sont reconstruites a 70% apres le combat (regle OGame)
  const newDefenses: Record<string, number> = {};
  for (const [type, count] of Object.entries(targetDefenses)) {
    const lost = result.defenderLosses[type] || 0;
    const survived = count - lost;
    const rebuilt = Math.floor(lost * 0.7);
    newDefenses[type] = survived + rebuilt;
    if (newDefenses[type] <= 0) delete newDefenses[type];
  }

  const newTargetShips: Record<string, number> = {};
  for (const [type, count] of Object.entries(targetShips)) {
    const survived = (result.defenderSurvivors[type] || 0);
    if (survived > 0) newTargetShips[type] = survived;
  }

  db.prepare('UPDATE planets SET ships = ?, defenses = ?, metal = metal - ?, crystal = crystal - ?, deuterium = deuterium - ? WHERE id = ?').run(
    JSON.stringify(newTargetShips),
    JSON.stringify(newDefenses),
    result.loot.metal, result.loot.crystal, result.loot.deuterium,
    target.id,
  );

  // Debris
  if (result.debris.metal > 0 || result.debris.crystal > 0) {
    db.prepare(`
      INSERT INTO debris_fields (galaxy, system, position, metal, crystal)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(galaxy, system, position) DO UPDATE SET metal = metal + ?, crystal = crystal + ?
    `).run(
      fleet.dest_galaxy, fleet.dest_system, fleet.dest_position,
      result.debris.metal, result.debris.crystal,
      result.debris.metal, result.debris.crystal,
    );
  }

  // Chance de lune
  if (result.moonChance > 0 && Math.random() * 100 < result.moonChance) {
    const existingMoon = db.prepare('SELECT id FROM moons WHERE planet_id = ?').get(target.id);
    if (!existingMoon) {
      db.prepare('INSERT INTO moons (id, planet_id, name, size) VALUES (?, ?, ?, ?)').run(
        `moon-${nowUnix}-${Math.random().toString(36).slice(2, 8)}`,
        target.id, `Lune de ${target.name}`, Math.floor(Math.random() * 5) + 3,
      );
    }
  }

  // Messages aux deux camps
  const winnerLabel = result.winner === 'attacker' ? 'Attaquant' : result.winner === 'defender' ? 'Defenseur' : 'Match nul';
  const combatData = JSON.stringify({ combatResult: result });
  const coords = `[${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}]`;

  // Message attaquant
  db.prepare('INSERT INTO messages (id, user_id, type, title, body, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    msgId(nowUnix), fleet.user_id, 'combat',
    `Combat ${coords}`,
    `Vainqueur: ${winnerLabel}. Butin: ${result.loot.metal} Fe, ${result.loot.crystal} Cr, ${result.loot.deuterium} De.`,
    combatData, nowUnix,
  );

  // Message defenseur
  if (target.user_id !== fleet.user_id) {
    const attackerName = db.prepare('SELECT username FROM users WHERE id = ?').get(fleet.user_id) as { username: string } | undefined;
    db.prepare('INSERT INTO messages (id, user_id, type, title, body, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      msgId(nowUnix), target.user_id, 'combat',
      `Attaque sur ${target.name} ${coords}`,
      `Attaque de ${attackerName?.username || 'Inconnu'}. Vainqueur: ${winnerLabel}.`,
      combatData, nowUnix,
    );
  }
}

// === ESPIONNAGE ===
function resolveEspionage(db: ReturnType<typeof getDb>, fleet: FleetRow, ships: Record<string, number>, nowUnix: number) {
  const target = getTargetPlanet(db, fleet);
  db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);

  if (!target) {
    db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      msgId(nowUnix), fleet.user_id, 'system', 'Espionnage echoue',
      `Aucune planete en [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}].`, nowUnix,
    );
    return;
  }

  const attackerResearch = getResearchData(db, fleet.user_id);
  const defenderResearch = getResearchData(db, target.user_id);

  const spyLevel = attackerResearch.espionageTech || 0;
  const counterSpy = defenderResearch.espionageTech || 0;
  const probeCount = ships.espionageProbe || 1;

  // Visibilite progressive : base = spyLevel * probeCount^0.5 - counterSpy
  const visibility = spyLevel * Math.sqrt(probeCount) - counterSpy;

  // Toujours voir les ressources
  const report: Record<string, unknown> = {
    planetName: target.name,
    coordinates: { galaxy: target.galaxy, system: target.system, position: target.position },
    resources: { metal: Math.floor(target.metal), crystal: Math.floor(target.crystal), deuterium: Math.floor(target.deuterium) },
  };

  // Niv 2+ : voir la flotte
  if (visibility >= 2) {
    report.ships = JSON.parse(target.ships);
  }

  // Niv 4+ : voir les defenses
  if (visibility >= 4) {
    report.defenses = JSON.parse(target.defenses);
  }

  // Niv 6+ : voir les batiments
  if (visibility >= 6) {
    report.buildings = JSON.parse(target.buildings);
  }

  // Niv 8+ : voir les recherches
  if (visibility >= 8) {
    report.research = defenderResearch;
  }

  // Chance de perte des sondes : 2% par niveau de contre-espionnage
  const lossChance = counterSpy * 0.02;
  let probesLost = false;
  if (Math.random() < lossChance) {
    probesLost = true;
    // Les sondes sont perdues — ne pas les renvoyer
    db.prepare('UPDATE fleet_movements SET ships = ? WHERE id = ?').run(
      JSON.stringify({}), fleet.id,
    );
  }

  // Message attaquant
  db.prepare('INSERT INTO messages (id, user_id, type, title, body, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    msgId(nowUnix), fleet.user_id, 'espionage',
    `Espionnage [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}]`,
    probesLost ? 'Sondes detectees et detruites !' : `Rapport d'espionnage de ${target.name}`,
    JSON.stringify({ espionageReport: report }), nowUnix,
  );

  // Message defenseur (alerte d'espionnage)
  if (target.user_id !== fleet.user_id) {
    const attackerName = db.prepare('SELECT username FROM users WHERE id = ?').get(fleet.user_id) as { username: string } | undefined;
    db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      msgId(nowUnix), target.user_id, 'espionage',
      `Activite d'espionnage detectee`,
      `${attackerName?.username || 'Inconnu'} a espionne ${target.name}.`, nowUnix,
    );
  }
}

// === COLONISATION ===
function resolveColonize(db: ReturnType<typeof getDb>, fleet: FleetRow, ships: Record<string, number>, nowUnix: number) {
  // Verifier qu'il n'y a pas deja une planete a cette position
  const existing = db.prepare('SELECT id FROM planets WHERE galaxy = ? AND system = ? AND position = ?').get(
    fleet.dest_galaxy, fleet.dest_system, fleet.dest_position,
  );

  if (existing) {
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
    db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      msgId(nowUnix), fleet.user_id, 'system', 'Colonisation echouee',
      `Position [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}] deja occupee.`, nowUnix,
    );
    return;
  }

  // Temperature selon la position
  const temp = Math.floor(140 - (fleet.dest_position / 15) * 240 + (Math.random() - 0.5) * 30);
  const biomes = ['glacial', 'tundra', 'temperate', 'arid', 'volcanic'];
  const biome = temp > 80 ? 'volcanic' : temp > 40 ? 'arid' : temp > 0 ? 'temperate' : temp > -40 ? 'tundra' : 'glacial';
  const size = Math.floor(Math.random() * 9) + 4;
  const planetId = `planet-${nowUnix}-${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(`
    INSERT INTO planets (id, user_id, name, galaxy, system, position, size, temperature, biome, aquaticity, metal, crystal, deuterium, buildings, ships, defenses)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 500, 500, 0, '{}', '{}', '{}')
  `).run(
    planetId, fleet.user_id, `Colonie`, fleet.dest_galaxy, fleet.dest_system, fleet.dest_position,
    size, temp, biome, Math.random() * 0.7 + 0.05,
  );

  // Retirer le vaisseau de colonisation des survivants
  const newShips = { ...ships };
  if (newShips.colonyShip) {
    newShips.colonyShip--;
    if (newShips.colonyShip <= 0) delete newShips.colonyShip;
  }

  // Les autres vaisseaux rentrent
  const hasShipsLeft = Object.values(newShips).some((c) => c > 0);
  if (hasShipsLeft) {
    db.prepare('UPDATE fleet_movements SET ships = ?, resolved = 1 WHERE id = ?').run(
      JSON.stringify(newShips), fleet.id,
    );
  } else {
    // Plus de vaisseaux, supprimer le mouvement directement
    db.prepare('DELETE FROM fleet_movements WHERE id = ?').run(fleet.id);
  }

  db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    msgId(nowUnix), fleet.user_id, 'colonization',
    `Nouvelle colonie !`,
    `Planete colonisee en [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}].`, nowUnix,
  );
}

// === TRANSPORT ===
function resolveTransport(db: ReturnType<typeof getDb>, fleet: FleetRow, _ships: Record<string, number>, nowUnix: number) {
  const target = getTargetPlanet(db, fleet);
  const cargo = JSON.parse(fleet.cargo) as { metal: number; crystal: number; deuterium: number };

  if (target && (cargo.metal > 0 || cargo.crystal > 0 || cargo.deuterium > 0)) {
    db.prepare('UPDATE planets SET metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      cargo.metal, cargo.crystal, cargo.deuterium, target.id,
    );
    // Vider le cargo pour le retour
    db.prepare('UPDATE fleet_movements SET cargo = ?, resolved = 1 WHERE id = ?').run(
      JSON.stringify({ metal: 0, crystal: 0, deuterium: 0 }), fleet.id,
    );
  } else {
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
  }

  db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    msgId(nowUnix), fleet.user_id, 'transport',
    `Transport livre`,
    `Ressources livrees en [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}]: ${cargo.metal} Fe, ${cargo.crystal} Cr, ${cargo.deuterium} De.`, nowUnix,
  );
}

// === RECYCLAGE ===
function resolveRecycle(db: ReturnType<typeof getDb>, fleet: FleetRow, ships: Record<string, number>, nowUnix: number) {
  const debris = db.prepare('SELECT * FROM debris_fields WHERE galaxy = ? AND system = ? AND position = ?').get(
    fleet.dest_galaxy, fleet.dest_system, fleet.dest_position,
  ) as { metal: number; crystal: number } | undefined;

  if (!debris || (debris.metal <= 0 && debris.crystal <= 0)) {
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
    db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      msgId(nowUnix), fleet.user_id, 'system', 'Recyclage',
      `Aucun debris en [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}].`, nowUnix,
    );
    return;
  }

  // Capacite de cargo des recycleurs
  const recyclerCount = ships.recycler || 0;
  const totalCargo = recyclerCount * 20000;

  const collected = {
    metal: Math.min(debris.metal, totalCargo / 2),
    crystal: Math.min(debris.crystal, totalCargo / 2),
  };
  // Ajuster si un type a moins que sa moitie — redistribuer
  const metalLeft = totalCargo - collected.metal;
  collected.crystal = Math.min(debris.crystal, metalLeft);
  const crystalLeft = totalCargo - collected.crystal;
  collected.metal = Math.min(debris.metal, crystalLeft);

  // Retirer des debris
  const remainingMetal = debris.metal - collected.metal;
  const remainingCrystal = debris.crystal - collected.crystal;

  if (remainingMetal <= 0 && remainingCrystal <= 0) {
    db.prepare('DELETE FROM debris_fields WHERE galaxy = ? AND system = ? AND position = ?').run(
      fleet.dest_galaxy, fleet.dest_system, fleet.dest_position,
    );
  } else {
    db.prepare('UPDATE debris_fields SET metal = ?, crystal = ? WHERE galaxy = ? AND system = ? AND position = ?').run(
      remainingMetal, remainingCrystal, fleet.dest_galaxy, fleet.dest_system, fleet.dest_position,
    );
  }

  // Charger dans le cargo de la flotte
  db.prepare('UPDATE fleet_movements SET cargo = ?, resolved = 1 WHERE id = ?').run(
    JSON.stringify({ metal: Math.floor(collected.metal), crystal: Math.floor(collected.crystal), deuterium: 0 }),
    fleet.id,
  );

  db.prepare('INSERT INTO messages (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    msgId(nowUnix), fleet.user_id, 'system', 'Recyclage termine',
    `Collecte en [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}]: ${Math.floor(collected.metal)} Fe, ${Math.floor(collected.crystal)} Cr.`, nowUnix,
  );
}

function resolveFleetReturn(db: ReturnType<typeof getDb>, fleet: FleetRow) {
  const ships = JSON.parse(fleet.ships) as Record<string, number>;
  const cargo = JSON.parse(fleet.cargo) as { metal: number; crystal: number; deuterium: number };

  const planet = db.prepare(
    'SELECT id, ships, metal, crystal, deuterium FROM planets WHERE galaxy = ? AND system = ? AND position = ? AND user_id = ?',
  ).get(fleet.origin_galaxy, fleet.origin_system, fleet.origin_position, fleet.user_id) as {
    id: string; ships: string; metal: number; crystal: number; deuterium: number;
  } | undefined;

  if (planet) {
    const planetShips = JSON.parse(planet.ships) as Record<string, number>;
    for (const [type, count] of Object.entries(ships)) {
      planetShips[type] = (planetShips[type] || 0) + count;
    }

    db.prepare('UPDATE planets SET ships = ?, metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      JSON.stringify(planetShips),
      cargo.metal || 0,
      cargo.crystal || 0,
      cargo.deuterium || 0,
      planet.id,
    );
  }

  db.prepare('DELETE FROM fleet_movements WHERE id = ?').run(fleet.id);
}
