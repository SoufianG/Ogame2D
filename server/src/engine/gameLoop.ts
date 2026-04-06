import { getDb } from '../db/database.js';
import { computeProduction, computeStorage, type Buildings } from './production.js';

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

function resolveFleetArrival(db: ReturnType<typeof getDb>, fleet: FleetRow, nowUnix: number) {
  const ships = JSON.parse(fleet.ships) as Record<string, number>;

  if (fleet.mission === 'attack') {
    const loot = {
      metal: Math.floor(Math.random() * 30000) + 5000,
      crystal: Math.floor(Math.random() * 15000) + 3000,
      deuterium: Math.floor(Math.random() * 8000) + 1000,
    };

    const lossRate = 0.1 + Math.random() * 0.2;
    const survivingShips: Record<string, number> = {};
    for (const [type, count] of Object.entries(ships)) {
      const surviving = Math.max(1, Math.floor(count * (1 - lossRate)));
      survivingShips[type] = surviving;
    }

    db.prepare('UPDATE fleet_movements SET ships = ?, cargo = ?, resolved = 1 WHERE id = ?').run(
      JSON.stringify(survivingShips), JSON.stringify(loot), fleet.id,
    );

    const totalShips = Object.values(ships).reduce((a, b) => a + b, 0);
    const totalSurvivors = Object.values(survivingShips).reduce((a, b) => a + b, 0);
    db.prepare(`
      INSERT INTO messages (id, user_id, type, title, body, created_at)
      VALUES (?, ?, 'combat', ?, ?, ?)
    `).run(
      `msg-${nowUnix}-${Math.random().toString(36).slice(2, 8)}`,
      fleet.user_id,
      `Combat [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}]`,
      `Victoire ! ${totalSurvivors}/${totalShips} vaisseaux survivants. Butin: ${loot.metal} Fe, ${loot.crystal} Cr, ${loot.deuterium} De`,
      nowUnix,
    );
  } else if (fleet.mission === 'espionage') {
    const resources = {
      metal: Math.floor(Math.random() * 100000) + 10000,
      crystal: Math.floor(Math.random() * 50000) + 5000,
      deuterium: Math.floor(Math.random() * 20000) + 2000,
    };

    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);

    db.prepare(`
      INSERT INTO messages (id, user_id, type, title, body, data, created_at)
      VALUES (?, ?, 'espionage', ?, ?, ?, ?)
    `).run(
      `msg-${nowUnix}-${Math.random().toString(36).slice(2, 8)}`,
      fleet.user_id,
      `Espionnage [${fleet.dest_galaxy}:${fleet.dest_system}:${fleet.dest_position}]`,
      `Ressources detectees: ${resources.metal} Fe, ${resources.crystal} Cr, ${resources.deuterium} De`,
      JSON.stringify({ espionageReport: { resources, coordinates: { galaxy: fleet.dest_galaxy, system: fleet.dest_system, position: fleet.dest_position } } }),
      nowUnix,
    );
  } else {
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
  }
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
