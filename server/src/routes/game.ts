import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

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

// === GALAXY VIEW ===

// GET /api/game/galaxy/:galaxy/:system
router.get('/galaxy/:galaxy/:system', (req: AuthRequest, res) => {
  const db = getDb();
  const { galaxy, system } = req.params;

  const planets = db.prepare(`
    SELECT p.position, p.name, p.size, p.temperature, p.biome,
           u.username as player_name, p.user_id,
           (SELECT 1 FROM moons WHERE planet_id = p.id) as has_moon
    FROM planets p
    JOIN users u ON u.id = p.user_id
    WHERE p.galaxy = ? AND p.system = ?
    ORDER BY p.position
  `).all(parseInt(galaxy as string), parseInt(system as string));

  res.json(planets);
});

export default router;
