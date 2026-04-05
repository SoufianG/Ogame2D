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
}

interface ResearchQueueRow {
  user_id: string;
  planet_id: string;
  research: string;
  target_level: number;
  remaining_time: number;
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
  tickTimer = setInterval(gameTick, TICK_INTERVAL);
}

export function stopGameLoop() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function gameTick() {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000); // unix seconds

  try {
    // === 1. Production de ressources ===
    tickProduction(db, TICK_INTERVAL / 1000);

    // === 2. Files de construction ===
    tickBuildingQueues(db, TICK_INTERVAL / 1000);

    // === 3. Files de recherche ===
    tickResearchQueues(db, TICK_INTERVAL / 1000);

    // === 4. Flottes ===
    tickFleets(db, now);
  } catch (err) {
    console.error('Game tick error:', err);
  }
}

// Rattrapage quand un joueur se reconnecte apres une absence
export function catchUp(userId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const planets = db.prepare('SELECT * FROM planets WHERE user_id = ?').all(userId) as PlanetRow[];

  for (const planet of planets) {
    const buildings = JSON.parse(planet.buildings) as Buildings;

    // Calculer le temps ecoule depuis la derniere mise a jour
    // On utilise last_login comme reference
    const user = db.prepare('SELECT last_login FROM users WHERE id = ?').get(userId) as { last_login: number | null };
    const lastActive = user?.last_login || now;
    const elapsed = Math.max(0, now - lastActive);

    if (elapsed < 10) continue; // Pas besoin de rattraper si < 10s

    const rates = computeProduction(buildings, planet.temperature);
    const metalStorage = computeStorage(buildings.metalStorage || 0);
    const crystalStorage = computeStorage(buildings.crystalStorage || 0);
    const deutStorage = computeStorage(buildings.deuteriumTank || 0);

    const hoursElapsed = elapsed / 3600;
    const newMetal = Math.min(metalStorage, planet.metal + rates.metalPerHour * hoursElapsed);
    const newCrystal = Math.min(crystalStorage, planet.crystal + rates.crystalPerHour * hoursElapsed);
    const newDeut = Math.min(deutStorage, planet.deuterium + rates.deuteriumPerHour * hoursElapsed);

    db.prepare('UPDATE planets SET metal = ?, crystal = ?, deuterium = ? WHERE id = ?').run(
      newMetal, newCrystal, newDeut, planet.id,
    );
  }

  // Resoudre les constructions completees pendant l'absence
  const queues = db.prepare(`
    SELECT bq.* FROM building_queues bq
    JOIN planets p ON p.id = bq.planet_id
    WHERE p.user_id = ? AND bq.remaining_time <= 0
  `).all(userId) as BuildingQueueRow[];

  for (const q of queues) {
    completeBuildingQueue(db, q);
  }

  // Resoudre les recherches completees
  const rq = db.prepare('SELECT * FROM research_queues WHERE user_id = ? AND remaining_time <= 0').get(userId) as ResearchQueueRow | undefined;
  if (rq) {
    completeResearchQueue(db, rq);
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
function tickBuildingQueues(db: ReturnType<typeof getDb>, deltaSeconds: number) {
  // Decrementer le temps restant
  db.prepare('UPDATE building_queues SET remaining_time = remaining_time - ?').run(deltaSeconds);

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
function tickResearchQueues(db: ReturnType<typeof getDb>, deltaSeconds: number) {
  db.prepare('UPDATE research_queues SET remaining_time = remaining_time - ?').run(deltaSeconds);

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

// === Flottes ===
function tickFleets(db: ReturnType<typeof getDb>, nowUnix: number) {
  // Flottes arrivees a destination (pas encore resolues)
  const arrived = db.prepare(
    'SELECT * FROM fleet_movements WHERE arrival_time <= ? AND resolved = 0',
  ).all(nowUnix) as FleetRow[];

  for (const fleet of arrived) {
    resolveFleetArrival(db, fleet, nowUnix);
  }

  // Flottes de retour
  const returned = db.prepare(
    'SELECT * FROM fleet_movements WHERE return_time IS NOT NULL AND return_time <= ? AND resolved = 1',
  ).all(nowUnix) as FleetRow[];

  for (const fleet of returned) {
    resolveFleetReturn(db, fleet);
  }
}

function resolveFleetArrival(db: ReturnType<typeof getDb>, fleet: FleetRow, nowUnix: number) {
  const ships = JSON.parse(fleet.ships) as Record<string, number>;
  const cargo = JSON.parse(fleet.cargo) as { metal: number; crystal: number; deuterium: number };

  if (fleet.mission === 'attack') {
    // Combat simplifie contre NPC (pas de planete joueur ciblee pour l'instant)
    // Le butin est genere aleatoirement
    const loot = {
      metal: Math.floor(Math.random() * 30000) + 5000,
      crystal: Math.floor(Math.random() * 15000) + 3000,
      deuterium: Math.floor(Math.random() * 8000) + 1000,
    };

    // Pertes aleatoires (10-30% des vaisseaux)
    const lossRate = 0.1 + Math.random() * 0.2;
    const survivingShips: Record<string, number> = {};
    for (const [type, count] of Object.entries(ships)) {
      const surviving = Math.max(1, Math.floor(count * (1 - lossRate)));
      survivingShips[type] = surviving;
    }

    // Mettre a jour la flotte avec survivants et butin
    db.prepare('UPDATE fleet_movements SET ships = ?, cargo = ?, resolved = 1 WHERE id = ?').run(
      JSON.stringify(survivingShips), JSON.stringify(loot), fleet.id,
    );

    // Message de combat
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
    // Rapport d'espionnage
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
    // Autres missions : marquer comme resolu
    db.prepare('UPDATE fleet_movements SET resolved = 1 WHERE id = ?').run(fleet.id);
  }
}

function resolveFleetReturn(db: ReturnType<typeof getDb>, fleet: FleetRow) {
  const ships = JSON.parse(fleet.ships) as Record<string, number>;
  const cargo = JSON.parse(fleet.cargo) as { metal: number; crystal: number; deuterium: number };

  // Trouver la planete d'origine
  const planet = db.prepare(
    'SELECT id, ships, metal, crystal, deuterium FROM planets WHERE galaxy = ? AND system = ? AND position = ? AND user_id = ?',
  ).get(fleet.origin_galaxy, fleet.origin_system, fleet.origin_position, fleet.user_id) as {
    id: string; ships: string; metal: number; crystal: number; deuterium: number;
  } | undefined;

  if (planet) {
    // Rendre les vaisseaux
    const planetShips = JSON.parse(planet.ships) as Record<string, number>;
    for (const [type, count] of Object.entries(ships)) {
      planetShips[type] = (planetShips[type] || 0) + count;
    }

    // Crediter le butin
    db.prepare('UPDATE planets SET ships = ?, metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      JSON.stringify(planetShips),
      cargo.metal || 0,
      cargo.crystal || 0,
      cargo.deuterium || 0,
      planet.id,
    );
  }

  // Supprimer le mouvement
  db.prepare('DELETE FROM fleet_movements WHERE id = ?').run(fleet.id);
}
