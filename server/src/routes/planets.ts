import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();
router.use(authMiddleware);

// GET /api/planets — Toutes les planetes du joueur
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const planets = db.prepare(
    'SELECT * FROM planets WHERE user_id = ? ORDER BY galaxy, system, position',
  ).all(req.user!.userId) as Record<string, unknown>[];

  const parsed = planets.map((p) => ({
    ...p,
    buildings: JSON.parse(p.buildings as string),
    ships: JSON.parse(p.ships as string),
    defenses: JSON.parse(p.defenses as string),
  }));

  res.json(parsed);
});

// POST /api/planets — Creer la planete de depart
router.post('/', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  // Verifier s'il a deja une planete
  const existing = db.prepare('SELECT id FROM planets WHERE user_id = ?').get(userId);
  if (existing) {
    res.status(409).json({ error: 'Planete de depart deja creee' });
    return;
  }

  // Trouver une position libre dans un systeme aleatoire
  const system = Math.floor(Math.random() * 50) + 1;
  const rows = db.prepare(
    'SELECT position FROM planets WHERE galaxy = 1 AND system = ?',
  ).all(system) as { position: number }[];

  const occupied = rows.map((r) => r.position);

  const freePositions = Array.from({ length: 15 }, (_, i) => i + 1)
    .filter((p) => !occupied.includes(p));

  if (freePositions.length === 0) {
    res.status(503).json({ error: 'Aucune position libre, reessayez' });
    return;
  }

  const position = freePositions[Math.floor(Math.random() * freePositions.length)];
  const temperature = Math.floor(((15 - position) / 14) * 160 - 60);
  const size = Math.floor(Math.random() * 9) + 4;

  let biome: string;
  if (temperature < -50) biome = 'glacial';
  else if (temperature < 0) biome = 'tundra';
  else if (temperature < 30) biome = 'temperate';
  else if (temperature < 70) biome = 'arid';
  else biome = 'volcanic';

  const id = `planet-${randomUUID().slice(0, 8)}`;
  const defaultBuildings = JSON.stringify({
    metalMine: 0, crystalMine: 0, deuteriumSynthesizer: 0,
    solarPlant: 0, fusionReactor: 0,
    metalStorage: 0, crystalStorage: 0, deuteriumTank: 0,
    roboticsFactory: 0, shipyard: 0, researchLab: 0,
    allianceDepot: 0, terraformer: 0, missileSilo: 0,
    lunarBase: 0, sensorPhalanx: 0, jumpGate: 0,
  });

  db.prepare(`
    INSERT INTO planets (id, user_id, name, galaxy, system, position, size, temperature, biome, aquaticity, buildings)
    VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, 'Homeworld', system, position, size, temperature, biome, Math.random() * 0.6 + 0.1, defaultBuildings);

  const planet = db.prepare('SELECT * FROM planets WHERE id = ?').get(id) as Record<string, unknown>;

  res.status(201).json({
    ...planet,
    buildings: JSON.parse(planet.buildings as string),
    ships: JSON.parse(planet.ships as string),
    defenses: JSON.parse(planet.defenses as string),
  });
});

// PUT /api/planets/:id — Sauvegarder l'etat d'une planete
router.put('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { id } = req.params;

  // Verifier propriete
  const planet = db.prepare('SELECT id FROM planets WHERE id = ? AND user_id = ?').get(id, userId);
  if (!planet) {
    res.status(404).json({ error: 'Planete introuvable' });
    return;
  }

  const { metal, crystal, deuterium, buildings, ships, defenses } = req.body;

  db.prepare(`
    UPDATE planets SET
      metal = COALESCE(?, metal),
      crystal = COALESCE(?, crystal),
      deuterium = COALESCE(?, deuterium),
      buildings = COALESCE(?, buildings),
      ships = COALESCE(?, ships),
      defenses = COALESCE(?, defenses)
    WHERE id = ?
  `).run(
    metal ?? null,
    crystal ?? null,
    deuterium ?? null,
    buildings ? JSON.stringify(buildings) : null,
    ships ? JSON.stringify(ships) : null,
    defenses ? JSON.stringify(defenses) : null,
    id,
  );

  res.json({ ok: true });
});

// PUT /api/planets/:id/rename — Renommer une planete
router.put('/:id/rename', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { id } = req.params;
  const { name } = req.body as { name: string };

  if (!name || name.trim().length < 1 || name.trim().length > 24) {
    res.status(400).json({ error: 'Nom invalide (1-24 caracteres)' });
    return;
  }

  const planet = db.prepare('SELECT id FROM planets WHERE id = ? AND user_id = ?').get(id, userId);
  if (!planet) {
    res.status(404).json({ error: 'Planete introuvable' });
    return;
  }

  db.prepare('UPDATE planets SET name = ? WHERE id = ?').run(name.trim(), id);
  res.json({ ok: true });
});

export default router;
