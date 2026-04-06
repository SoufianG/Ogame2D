import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { computeProduction, computeStorage, getBuildingCost, getBuildingTime, getResearchTime } from '../engine/production.js';
import { BUILDINGS } from '../data/buildings.js';
import { RESEARCH } from '../data/research.js';
import { ALL_UNITS, getUnitTime } from '../data/ships.js';

const router = Router();
router.use(authMiddleware);

// === GAME STATE (full state for a player) ===

interface PlanetRow {
  id: string;
  user_id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  size: number;
  temperature: number;
  biome: string;
  aquaticity: number;
  metal: number;
  crystal: number;
  deuterium: number;
  buildings: string;
  ships: string;
  defenses: string;
  created_at: number;
}

// GET /api/game/state — Etat complet du joueur (planetes + production + queues)
router.get('/state', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const now = Math.floor(Date.now() / 1000);

  const planets = db.prepare(
    'SELECT * FROM planets WHERE user_id = ? ORDER BY galaxy, system, position',
  ).all(userId) as PlanetRow[];

  const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
  const research = researchRow ? JSON.parse(researchRow.data) : {};

  const researchQueue = db.prepare('SELECT * FROM research_queues WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;

  const planetsData = planets.map((p) => {
    const buildings = JSON.parse(p.buildings);
    const ships = JSON.parse(p.ships);
    const defenses = JSON.parse(p.defenses);
    const production = computeProduction(buildings, p.temperature);
    const storage = {
      metal: computeStorage(buildings.metalStorage || 0),
      crystal: computeStorage(buildings.crystalStorage || 0),
      deuterium: computeStorage(buildings.deuteriumTank || 0),
    };

    const buildingQueues = db.prepare(
      'SELECT * FROM building_queues WHERE planet_id = ? ORDER BY id',
    ).all(p.id) as Record<string, unknown>[];

    const shipyardQueues = db.prepare(
      'SELECT * FROM shipyard_queues WHERE planet_id = ? ORDER BY id',
    ).all(p.id) as Record<string, unknown>[];

    return {
      id: p.id,
      name: p.name,
      galaxy: p.galaxy,
      system: p.system,
      position: p.position,
      size: p.size,
      temperature: p.temperature,
      biome: p.biome,
      aquaticity: p.aquaticity,
      metal: p.metal,
      crystal: p.crystal,
      deuterium: p.deuterium,
      buildings,
      ships,
      defenses,
      production,
      storage,
      buildingQueues: buildingQueues.map((q) => ({
        id: q.id,
        building: q.building,
        targetLevel: q.target_level,
        remainingTime: Math.max(0, ((q.started_at as number) + (q.total_time as number)) - now),
        totalTime: q.total_time,
      })),
      shipyardQueues: shipyardQueues.map((q) => ({
        id: q.id,
        unitType: q.unit_type,
        unitCategory: q.unit_category,
        quantity: q.quantity,
        remaining: q.remaining,
        unitTime: q.unit_time,
        elapsed: q.elapsed,
      })),
    };
  });

  // Calculer le niveau effectif du labo (IRN)
  const irnLvl = research.intergalacticResearchNetwork || 0;
  const labLevels = planets.map((p) => {
    const b = JSON.parse(p.buildings);
    return (b.researchLab || 0) as number;
  }).sort((a, b) => b - a);
  const labsUsed = Math.min(irnLvl + 1, labLevels.length);
  const effectiveLab = labLevels.slice(0, labsUsed).reduce((sum, l) => sum + l, 0);

  const fleets = db.prepare(
    'SELECT * FROM fleet_movements WHERE user_id = ? ORDER BY departure_time DESC',
  ).all(userId) as Record<string, unknown>[];

  res.json({
    planets: planetsData,
    research,
    effectiveLab,
    researchQueue: researchQueue ? {
      planetId: researchQueue.planet_id,
      research: researchQueue.research,
      targetLevel: researchQueue.target_level,
      remainingTime: Math.max(0, ((researchQueue.started_at as number) + (researchQueue.total_time as number)) - now),
      totalTime: researchQueue.total_time,
    } : null,
    fleets: fleets.map((f) => ({
      id: f.id,
      ships: JSON.parse(f.ships as string),
      origin: { galaxy: f.origin_galaxy, system: f.origin_system, position: f.origin_position },
      destination: { galaxy: f.dest_galaxy, system: f.dest_system, position: f.dest_position },
      mission: f.mission,
      cargo: JSON.parse(f.cargo as string),
      departureTime: f.departure_time,
      arrivalTime: f.arrival_time,
      returnTime: f.return_time,
    })),
  });
});

// === BUILD — Lancer une construction ===

// POST /api/game/build
router.post('/build', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { planetId, building } = req.body as { planetId: string; building: string };

  if (!planetId || !building || !BUILDINGS[building]) {
    res.status(400).json({ error: 'Parametres invalides' });
    return;
  }

  // Verifier propriete de la planete
  const planet = db.prepare('SELECT * FROM planets WHERE id = ? AND user_id = ?').get(planetId, userId) as PlanetRow | undefined;
  if (!planet) {
    res.status(404).json({ error: 'Planete introuvable' });
    return;
  }

  // Verifier qu'il n'y a pas deja une construction en cours sur cette planete
  const existing = db.prepare('SELECT id FROM building_queues WHERE planet_id = ?').get(planetId);
  if (existing) {
    res.status(409).json({ error: 'Construction deja en cours sur cette planete' });
    return;
  }

  const buildings = JSON.parse(planet.buildings);
  const currentLevel = buildings[building] || 0;
  const targetLevel = currentLevel + 1;

  // Calculer le cout
  const def = BUILDINGS[building];
  const cost = getBuildingCost(def.baseCost, def.costFactor, targetLevel);

  // Verifier les ressources
  if (planet.metal < cost.metal || planet.crystal < cost.crystal || planet.deuterium < cost.deuterium) {
    res.status(400).json({ error: 'Ressources insuffisantes' });
    return;
  }

  // Verifier les prerequis
  if (def.prerequisites.buildings) {
    for (const [req_building, req_level] of Object.entries(def.prerequisites.buildings)) {
      if ((buildings[req_building] || 0) < req_level) {
        res.status(400).json({ error: `Prerequis non rempli: ${req_building} niveau ${req_level}` });
        return;
      }
    }
  }
  if (def.prerequisites.research) {
    const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
    const researchData = researchRow ? JSON.parse(researchRow.data) : {};
    for (const [req_research, req_level] of Object.entries(def.prerequisites.research)) {
      if ((researchData[req_research] || 0) < req_level) {
        res.status(400).json({ error: `Prerequis non rempli: ${req_research} niveau ${req_level}` });
        return;
      }
    }
  }

  // Temps de construction
  const roboticsLevel = buildings.roboticsFactory || 0;
  const buildTime = getBuildingTime(cost, roboticsLevel);

  // Deduire les ressources et creer la queue
  db.prepare('UPDATE planets SET metal = metal - ?, crystal = crystal - ?, deuterium = deuterium - ? WHERE id = ?').run(
    cost.metal, cost.crystal, cost.deuterium, planetId,
  );

  db.prepare(
    'INSERT INTO building_queues (planet_id, building, target_level, remaining_time, total_time) VALUES (?, ?, ?, ?, ?)',
  ).run(planetId, building, targetLevel, buildTime, buildTime);

  res.json({
    ok: true,
    building,
    targetLevel,
    cost,
    buildTime,
  });
});

// POST /api/game/build/cancel
router.post('/build/cancel', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { planetId } = req.body as { planetId: string };

  const queue = db.prepare(`
    SELECT bq.* FROM building_queues bq
    JOIN planets p ON p.id = bq.planet_id
    WHERE bq.planet_id = ? AND p.user_id = ?
  `).get(planetId, userId) as { id: number; building: string; target_level: number } | undefined;

  if (!queue) {
    res.status(404).json({ error: 'Aucune construction en cours' });
    return;
  }

  // Rembourser les ressources
  const def = BUILDINGS[queue.building];
  if (def) {
    const cost = getBuildingCost(def.baseCost, def.costFactor, queue.target_level);
    db.prepare('UPDATE planets SET metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      cost.metal, cost.crystal, cost.deuterium, planetId,
    );
  }

  db.prepare('DELETE FROM building_queues WHERE id = ?').run(queue.id);
  res.json({ ok: true });
});

// === SHIPYARD — Construire des vaisseaux ou defenses ===

// POST /api/game/shipyard/build
router.post('/shipyard/build', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { planetId, unitType, quantity } = req.body as { planetId: string; unitType: string; quantity: number };

  if (!planetId || !unitType || !quantity || quantity < 1) {
    res.status(400).json({ error: 'Parametres invalides' });
    return;
  }

  const def = ALL_UNITS[unitType];
  if (!def) {
    res.status(400).json({ error: 'Unite inconnue' });
    return;
  }

  const planet = db.prepare('SELECT * FROM planets WHERE id = ? AND user_id = ?').get(planetId, userId) as PlanetRow | undefined;
  if (!planet) {
    res.status(404).json({ error: 'Planete introuvable' });
    return;
  }

  const buildings = JSON.parse(planet.buildings);
  const shipyardLevel = buildings.shipyard || 0;

  if (shipyardLevel < 1) {
    res.status(400).json({ error: 'Chantier Naval requis' });
    return;
  }

  // Verifier les prerequis
  if (def.prerequisites.buildings) {
    for (const [reqBuilding, reqLevel] of Object.entries(def.prerequisites.buildings)) {
      if ((buildings[reqBuilding] || 0) < reqLevel) {
        res.status(400).json({ error: `Prerequis: ${reqBuilding} niv. ${reqLevel}` });
        return;
      }
    }
  }
  if (def.prerequisites.research) {
    const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
    const researchData = researchRow ? JSON.parse(researchRow.data) : {};
    for (const [reqResearch, reqLevel] of Object.entries(def.prerequisites.research)) {
      if ((researchData[reqResearch] || 0) < reqLevel) {
        res.status(400).json({ error: `Prerequis: ${reqResearch} niv. ${reqLevel}` });
        return;
      }
    }
  }

  // Cout total
  const totalCost = {
    metal: def.cost.metal * quantity,
    crystal: def.cost.crystal * quantity,
    deuterium: def.cost.deuterium * quantity,
  };

  if (planet.metal < totalCost.metal || planet.crystal < totalCost.crystal || planet.deuterium < totalCost.deuterium) {
    res.status(400).json({ error: 'Ressources insuffisantes' });
    return;
  }

  const unitTime = getUnitTime(def.cost, shipyardLevel);

  // Deduire les ressources
  db.prepare('UPDATE planets SET metal = metal - ?, crystal = crystal - ?, deuterium = deuterium - ? WHERE id = ?').run(
    totalCost.metal, totalCost.crystal, totalCost.deuterium, planetId,
  );

  // Ajouter a la queue (on empile si une queue existe deja)
  db.prepare(`
    INSERT INTO shipyard_queues (planet_id, unit_type, unit_category, quantity, remaining, unit_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(planetId, unitType, def.category, quantity, quantity, unitTime);

  res.json({ ok: true, unitType, quantity, unitTime, totalCost });
});

// POST /api/game/shipyard/cancel
router.post('/shipyard/cancel', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { planetId, queueId } = req.body as { planetId: string; queueId: number };

  const queue = db.prepare(`
    SELECT sq.* FROM shipyard_queues sq
    JOIN planets p ON p.id = sq.planet_id
    WHERE sq.id = ? AND sq.planet_id = ? AND p.user_id = ?
  `).get(queueId, planetId, userId) as {
    id: number; unit_type: string; unit_category: string;
    remaining: number; unit_time: number;
  } | undefined;

  if (!queue) {
    res.status(404).json({ error: 'Queue introuvable' });
    return;
  }

  // Rembourser les unites restantes (pas celles deja construites)
  const def = ALL_UNITS[queue.unit_type];
  if (def) {
    const refund = {
      metal: def.cost.metal * queue.remaining,
      crystal: def.cost.crystal * queue.remaining,
      deuterium: def.cost.deuterium * queue.remaining,
    };
    db.prepare('UPDATE planets SET metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      refund.metal, refund.crystal, refund.deuterium, planetId,
    );
  }

  db.prepare('DELETE FROM shipyard_queues WHERE id = ?').run(queue.id);
  res.json({ ok: true });
});

// === RESEARCH — Lancer une recherche ===

// POST /api/game/research/start
router.post('/research/start', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { planetId, research } = req.body as { planetId: string; research: string };

  if (!planetId || !research || !RESEARCH[research]) {
    res.status(400).json({ error: 'Parametres invalides' });
    return;
  }

  // Verifier qu'il n'y a pas deja une recherche en cours
  const existingQueue = db.prepare('SELECT user_id FROM research_queues WHERE user_id = ?').get(userId);
  if (existingQueue) {
    res.status(409).json({ error: 'Recherche deja en cours' });
    return;
  }

  // Verifier propriete de la planete
  const planet = db.prepare('SELECT * FROM planets WHERE id = ? AND user_id = ?').get(planetId, userId) as PlanetRow | undefined;
  if (!planet) {
    res.status(404).json({ error: 'Planete introuvable' });
    return;
  }

  const buildings = JSON.parse(planet.buildings);
  const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
  const researchData = researchRow ? JSON.parse(researchRow.data) : {};

  const currentLevel = researchData[research] || 0;
  const targetLevel = currentLevel + 1;

  const def = RESEARCH[research];
  const factor = Math.pow(def.costFactor, targetLevel - 1);
  const cost = {
    metal: Math.floor(def.baseCost.metal * factor),
    crystal: Math.floor(def.baseCost.crystal * factor),
    deuterium: Math.floor(def.baseCost.deuterium * factor),
  };

  // Verifier les ressources
  if (planet.metal < cost.metal || planet.crystal < cost.crystal || planet.deuterium < cost.deuterium) {
    res.status(400).json({ error: 'Ressources insuffisantes' });
    return;
  }

  // Verifier les prerequis
  if (def.prerequisites.buildings) {
    for (const [req_building, req_level] of Object.entries(def.prerequisites.buildings)) {
      if ((buildings[req_building] || 0) < req_level) {
        res.status(400).json({ error: `Prerequis non rempli: ${req_building} niveau ${req_level}` });
        return;
      }
    }
  }
  if (def.prerequisites.research) {
    for (const [req_research, req_level] of Object.entries(def.prerequisites.research)) {
      if ((researchData[req_research] || 0) < req_level) {
        res.status(400).json({ error: `Prerequis non rempli: ${req_research} niveau ${req_level}` });
        return;
      }
    }
  }

  // Temps de recherche — IRN : sommer les N meilleurs labos (N = IRN level + 1)
  const irnLevel = researchData.intergalacticResearchNetwork || 0;
  const allPlanets = db.prepare('SELECT buildings FROM planets WHERE user_id = ?').all(userId) as { buildings: string }[];
  const allLabLevels = allPlanets.map((p) => {
    const b = JSON.parse(p.buildings);
    return b.researchLab || 0;
  }).sort((a: number, b: number) => b - a);
  const labCount = Math.min(irnLevel + 1, allLabLevels.length);
  const effectiveLabLevel = allLabLevels.slice(0, labCount).reduce((sum: number, l: number) => sum + l, 0);
  const researchTime = getResearchTime(cost, effectiveLabLevel);

  // Deduire les ressources
  db.prepare('UPDATE planets SET metal = metal - ?, crystal = crystal - ?, deuterium = deuterium - ? WHERE id = ?').run(
    cost.metal, cost.crystal, cost.deuterium, planetId,
  );

  db.prepare(
    'INSERT INTO research_queues (user_id, planet_id, research, target_level, remaining_time, total_time) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, planetId, research, targetLevel, researchTime, researchTime);

  res.json({
    ok: true,
    research,
    targetLevel,
    cost,
    researchTime,
  });
});

// POST /api/game/research/cancel
router.post('/research/cancel', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  const queue = db.prepare('SELECT * FROM research_queues WHERE user_id = ?').get(userId) as {
    planet_id: string; research: string; target_level: number;
  } | undefined;

  if (!queue) {
    res.status(404).json({ error: 'Aucune recherche en cours' });
    return;
  }

  // Rembourser
  const def = RESEARCH[queue.research];
  if (def) {
    const factor = Math.pow(def.costFactor, queue.target_level - 1);
    const cost = {
      metal: Math.floor(def.baseCost.metal * factor),
      crystal: Math.floor(def.baseCost.crystal * factor),
      deuterium: Math.floor(def.baseCost.deuterium * factor),
    };
    db.prepare('UPDATE planets SET metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      cost.metal, cost.crystal, cost.deuterium, queue.planet_id,
    );
  }

  db.prepare('DELETE FROM research_queues WHERE user_id = ?').run(userId);
  res.json({ ok: true });
});

// === RESEARCH ===

// GET /api/game/research
router.get('/research', (req: AuthRequest, res) => {
  const db = getDb();
  const row = db.prepare('SELECT data FROM research WHERE user_id = ?').get(req.user!.userId) as { data: string } | undefined;
  res.json(row ? JSON.parse(row.data) : {});
});

// PUT /api/game/research
router.put('/research', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('UPDATE research SET data = ? WHERE user_id = ?').run(
    JSON.stringify(req.body),
    req.user!.userId,
  );
  res.json({ ok: true });
});

// === FLEET MOVEMENTS ===

// GET /api/game/fleets
router.get('/fleets', (req: AuthRequest, res) => {
  const db = getDb();
  const fleets = db.prepare(
    'SELECT * FROM fleet_movements WHERE user_id = ? ORDER BY departure_time DESC',
  ).all(req.user!.userId) as Record<string, unknown>[];

  const parsed = fleets.map((f) => ({
    id: f.id,
    ships: JSON.parse(f.ships as string),
    origin: { galaxy: f.origin_galaxy, system: f.origin_system, position: f.origin_position },
    destination: { galaxy: f.dest_galaxy, system: f.dest_system, position: f.dest_position },
    mission: f.mission,
    cargo: JSON.parse(f.cargo as string),
    speed: f.speed,
    departureTime: f.departure_time,
    arrivalTime: f.arrival_time,
    returnTime: f.return_time,
  }));

  res.json(parsed);
});

// === MESSAGES ===

// GET /api/game/messages
router.get('/messages', (req: AuthRequest, res) => {
  const db = getDb();
  const messages = db.prepare(
    'SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
  ).all(req.user!.userId) as Record<string, unknown>[];

  const parsed = messages.map((m) => ({
    id: m.id,
    type: m.type,
    title: m.title,
    body: m.body,
    read: !!m.is_read,
    timestamp: (m.created_at as number) * 1000,
    ...(m.data ? JSON.parse(m.data as string) : {}),
  }));

  res.json(parsed);
});

// PUT /api/game/messages/:id/read
router.put('/messages/:id/read', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user!.userId,
  );
  res.json({ ok: true });
});

// DELETE /api/game/messages/:id
router.delete('/messages/:id', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user!.userId,
  );
  res.json({ ok: true });
});

// === FLEET — Envoyer une flotte ===

// Vitesses de base par type de vaisseau
const SHIP_SPEEDS: Record<string, number> = {
  smallCargo: 5000, largeCargo: 7500, recycler: 2000, espionageProbe: 100000000,
  solarSatellite: 0, colonyShip: 2500, lightFighter: 12500, heavyFighter: 10000,
  cruiser: 15000, battleship: 10000, bomber: 4000, destroyer: 5000, deathstar: 100,
};

const SHIP_CARGO: Record<string, number> = {
  smallCargo: 5000, largeCargo: 25000, recycler: 20000, colonyShip: 7500,
};

// POST /api/game/fleet/send
router.post('/fleet/send', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { planetId, destination, ships, mission, speed, cargo } = req.body as {
    planetId: string;
    destination: { galaxy: number; system: number; position: number };
    ships: Record<string, number>;
    mission: string;
    speed: number;
    cargo?: { metal: number; crystal: number; deuterium: number };
  };

  if (!planetId || !destination || !ships || !mission) {
    res.status(400).json({ error: 'Parametres invalides' });
    return;
  }

  const planet = db.prepare('SELECT * FROM planets WHERE id = ? AND user_id = ?').get(planetId, userId) as PlanetRow | undefined;
  if (!planet) {
    res.status(404).json({ error: 'Planete introuvable' });
    return;
  }

  const planetShips = JSON.parse(planet.ships) as Record<string, number>;

  // Verifier la disponibilite des vaisseaux
  for (const [type, count] of Object.entries(ships)) {
    if ((planetShips[type] || 0) < count) {
      res.status(400).json({ error: `Pas assez de ${type}` });
      return;
    }
  }

  // Distance
  const origin = { galaxy: planet.galaxy, system: planet.system, position: planet.position };
  let distance: number;
  if (origin.galaxy !== destination.galaxy) {
    distance = 20000 * Math.abs(origin.galaxy - destination.galaxy);
  } else if (origin.system !== destination.system) {
    distance = 2700 + 95 * Math.abs(origin.system - destination.system);
  } else {
    distance = 1000 + 5 * Math.abs(origin.position - destination.position);
  }

  // Vitesse la plus lente
  const slowest = Math.min(...Object.keys(ships).map((type) => SHIP_SPEEDS[type] || 1000));
  const flightTime = Math.max(5, Math.floor(10 + (35000 / ((speed || 100) / 100) * Math.sqrt(distance * 10 / slowest))));

  // Consommation deuterium
  const totalShips = Object.values(ships).reduce((a, b) => a + b, 0);
  const fuelCost = Math.floor(distance * totalShips * 0.01);

  // Cargo : valider la capacite et les ressources disponibles
  const cargoData = cargo || { metal: 0, crystal: 0, deuterium: 0 };
  const totalCargoLoad = cargoData.metal + cargoData.crystal + cargoData.deuterium;

  // Calculer capacite cargo totale de la flotte
  const fleetCargo = Object.entries(ships).reduce((sum, [type, count]) => {
    return sum + (SHIP_CARGO[type] || 0) * count;
  }, 0);

  if (totalCargoLoad > fleetCargo) {
    res.status(400).json({ error: `Cargo insuffisant (${fleetCargo} max)` });
    return;
  }

  // Verifier ressources pour carburant + cargo charge
  const totalDeutNeeded = fuelCost + cargoData.deuterium;
  if (planet.deuterium < totalDeutNeeded) {
    res.status(400).json({ error: 'Deuterium insuffisant pour le carburant et le cargo' });
    return;
  }
  if (planet.metal < cargoData.metal) {
    res.status(400).json({ error: 'Metal insuffisant pour le cargo' });
    return;
  }
  if (planet.crystal < cargoData.crystal) {
    res.status(400).json({ error: 'Cristal insuffisant pour le cargo' });
    return;
  }

  // Retirer les vaisseaux
  for (const [type, count] of Object.entries(ships)) {
    planetShips[type] = (planetShips[type] || 0) - count;
    if (planetShips[type] <= 0) delete planetShips[type];
  }

  const now = Math.floor(Date.now() / 1000);
  const fleetId = `fleet-${now}-${Math.random().toString(36).slice(2, 8)}`;
  const arrivalTime = now + flightTime;
  const returnTime = mission !== 'deploy' ? now + flightTime * 2 : null;

  db.prepare('UPDATE planets SET ships = ?, metal = metal - ?, crystal = crystal - ?, deuterium = deuterium - ? WHERE id = ?').run(
    JSON.stringify(planetShips), cargoData.metal, cargoData.crystal, fuelCost + cargoData.deuterium, planetId,
  );

  db.prepare(`
    INSERT INTO fleet_movements (id, user_id, ships, origin_galaxy, origin_system, origin_position,
      dest_galaxy, dest_system, dest_position, mission, cargo, speed, departure_time, arrival_time, return_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    fleetId, userId, JSON.stringify(ships),
    origin.galaxy, origin.system, origin.position,
    destination.galaxy, destination.system, destination.position,
    mission, JSON.stringify(cargoData), speed || 100, now, arrivalTime, returnTime,
  );

  res.json({ ok: true, fleetId, arrivalTime: arrivalTime * 1000, fuelCost });
});

// === GALAXY VIEW ===

// GET /api/game/galaxy/:galaxy/:system
router.get('/galaxy/:galaxy/:system', (req: AuthRequest, res) => {
  const db = getDb();
  const { galaxy, system } = req.params;

  const INACTIVE_DAYS = 7;
  const VACATION_DAYS = 3;

  const planets = db.prepare(`
    SELECT p.position, p.name, p.size, p.temperature, p.biome,
           u.username as player_name, p.user_id,
           u.last_login,
           (SELECT 1 FROM moons WHERE planet_id = p.id) as has_moon,
           CASE
             WHEN u.last_login IS NULL THEN 'inactive'
             WHEN (unixepoch() - u.last_login) > ${INACTIVE_DAYS * 86400} THEN 'inactive'
             WHEN (unixepoch() - u.last_login) > ${VACATION_DAYS * 86400} THEN 'vacation'
             ELSE 'active'
           END as status
    FROM planets p
    JOIN users u ON u.id = p.user_id
    WHERE p.galaxy = ? AND p.system = ?
    ORDER BY p.position
  `).all(parseInt(galaxy as string), parseInt(system as string));

  res.json(planets);
});

export default router;
