import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();
router.use(authMiddleware);

const sendSchema = z.object({
  toUsername: z.string().min(1),
  subject: z.string().min(1).max(100),
  body: z.string().min(1).max(2000),
});

// GET /api/social/inbox — Messages recus
router.get('/inbox', (req: AuthRequest, res) => {
  const db = getDb();
  const messages = db.prepare(`
    SELECT pm.id, pm.subject, pm.body, pm.is_read, pm.created_at,
           u.username as from_username
    FROM private_messages pm
    JOIN users u ON u.id = pm.from_user_id
    WHERE pm.to_user_id = ?
    ORDER BY pm.created_at DESC
    LIMIT 50
  `).all(req.user!.userId) as Record<string, unknown>[];

  res.json(messages.map((m) => ({
    ...m,
    read: !!m.is_read,
    timestamp: (m.created_at as number) * 1000,
  })));
});

// GET /api/social/sent — Messages envoyes
router.get('/sent', (req: AuthRequest, res) => {
  const db = getDb();
  const messages = db.prepare(`
    SELECT pm.id, pm.subject, pm.body, pm.created_at,
           u.username as to_username
    FROM private_messages pm
    JOIN users u ON u.id = pm.to_user_id
    WHERE pm.from_user_id = ?
    ORDER BY pm.created_at DESC
    LIMIT 50
  `).all(req.user!.userId) as Record<string, unknown>[];

  res.json(messages.map((m) => ({
    ...m,
    timestamp: (m.created_at as number) * 1000,
  })));
});

// POST /api/social/send — Envoyer un message
router.post('/send', (req: AuthRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Donnees invalides' });
    return;
  }

  const db = getDb();
  const { toUsername, subject, body } = parsed.data;

  const recipient = db.prepare('SELECT id FROM users WHERE username = ?').get(toUsername) as { id: string } | undefined;
  if (!recipient) {
    res.status(404).json({ error: 'Joueur introuvable' });
    return;
  }

  if (recipient.id === req.user!.userId) {
    res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un message' });
    return;
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO private_messages (id, from_user_id, to_user_id, subject, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user!.userId, recipient.id, subject, body);

  res.status(201).json({ id });
});

// PUT /api/social/read/:id — Marquer comme lu
router.put('/read/:id', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('UPDATE private_messages SET is_read = 1 WHERE id = ? AND to_user_id = ?').run(
    req.params.id, req.user!.userId,
  );
  res.json({ ok: true });
});

// DELETE /api/social/:id — Supprimer un message
router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('DELETE FROM private_messages WHERE id = ? AND (to_user_id = ? OR from_user_id = ?)').run(
    req.params.id, req.user!.userId, req.user!.userId,
  );
  res.json({ ok: true });
});

// GET /api/social/players — Rechercher un joueur
router.get('/players', (req: AuthRequest, res) => {
  const db = getDb();
  const q = (req.query.q as string || '').trim();
  if (q.length < 2) {
    res.json([]);
    return;
  }

  const players = db.prepare(`
    SELECT u.id, u.username, u.last_login,
           a.tag as alliance_tag
    FROM users u
    LEFT JOIN alliance_members am ON am.user_id = u.id
    LEFT JOIN alliances a ON a.id = am.alliance_id
    WHERE u.username LIKE ? AND u.id != ?
    LIMIT 20
  `).all(`%${q}%`, req.user!.userId) as Record<string, unknown>[];

  res.json(players);
});

export default router;
