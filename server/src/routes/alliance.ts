import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  tag: z.string().min(2).max(8).regex(/^[A-Za-z0-9]+$/),
  name: z.string().min(3).max(30),
  description: z.string().max(500).optional(),
});

// GET /api/alliance — Mon alliance
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const membership = db.prepare(`
    SELECT a.*, am.rank
    FROM alliance_members am
    JOIN alliances a ON a.id = am.alliance_id
    WHERE am.user_id = ?
  `).get(req.user!.userId) as Record<string, unknown> | undefined;

  if (!membership) {
    res.json(null);
    return;
  }

  const members = db.prepare(`
    SELECT am.user_id, u.username, am.rank, am.joined_at
    FROM alliance_members am
    JOIN users u ON u.id = am.user_id
    WHERE am.alliance_id = ?
    ORDER BY
      CASE am.rank WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END,
      am.joined_at
  `).all(membership.id as string) as Record<string, unknown>[];

  const diplomacy = db.prepare(`
    SELECT d.relation, a.tag, a.name, d.target_alliance_id
    FROM alliance_diplomacy d
    JOIN alliances a ON a.id = d.target_alliance_id
    WHERE d.alliance_id = ?
  `).all(membership.id as string) as Record<string, unknown>[];

  res.json({
    id: membership.id,
    tag: membership.tag,
    name: membership.name,
    description: membership.description,
    myRank: membership.rank,
    members,
    diplomacy,
  });
});

// POST /api/alliance — Creer une alliance
router.post('/', (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Donnees invalides', details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const userId = req.user!.userId;

  // Deja dans une alliance ?
  const existing = db.prepare('SELECT alliance_id FROM alliance_members WHERE user_id = ?').get(userId);
  if (existing) {
    res.status(409).json({ error: 'Vous etes deja dans une alliance' });
    return;
  }

  const { tag, name, description } = parsed.data;

  // Tag/nom unique ?
  const dupe = db.prepare('SELECT id FROM alliances WHERE tag = ? OR name = ?').get(tag, name);
  if (dupe) {
    res.status(409).json({ error: 'Ce tag ou nom est deja pris' });
    return;
  }

  const id = randomUUID();

  const txn = db.transaction(() => {
    db.prepare('INSERT INTO alliances (id, tag, name, description, leader_id) VALUES (?, ?, ?, ?, ?)').run(
      id, tag.toUpperCase(), name, description || '', userId,
    );
    db.prepare('INSERT INTO alliance_members (user_id, alliance_id, rank) VALUES (?, ?, ?)').run(
      userId, id, 'leader',
    );
  });
  txn();

  res.status(201).json({ id, tag: tag.toUpperCase(), name });
});

// POST /api/alliance/join/:allianceId
router.post('/join/:allianceId', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  const existing = db.prepare('SELECT alliance_id FROM alliance_members WHERE user_id = ?').get(userId);
  if (existing) {
    res.status(409).json({ error: 'Vous etes deja dans une alliance' });
    return;
  }

  const alliance = db.prepare('SELECT id FROM alliances WHERE id = ?').get(req.params.allianceId);
  if (!alliance) {
    res.status(404).json({ error: 'Alliance introuvable' });
    return;
  }

  db.prepare('INSERT INTO alliance_members (user_id, alliance_id, rank) VALUES (?, ?, ?)').run(
    userId, req.params.allianceId, 'member',
  );

  res.json({ ok: true });
});

// POST /api/alliance/leave
router.post('/leave', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  const membership = db.prepare(`
    SELECT am.alliance_id, am.rank, a.leader_id
    FROM alliance_members am
    JOIN alliances a ON a.id = am.alliance_id
    WHERE am.user_id = ?
  `).get(userId) as { alliance_id: string; rank: string; leader_id: string } | undefined;

  if (!membership) {
    res.status(404).json({ error: 'Vous n\'etes pas dans une alliance' });
    return;
  }

  if (membership.rank === 'leader') {
    // Le leader doit dissoudre ou transferer
    const memberCount = db.prepare(
      'SELECT COUNT(*) as count FROM alliance_members WHERE alliance_id = ?',
    ).get(membership.alliance_id) as { count: number };

    if (memberCount.count > 1) {
      res.status(400).json({ error: 'Transferez le leadership ou dissolvez l\'alliance d\'abord' });
      return;
    }

    // Seul membre : dissoudre
    const txn = db.transaction(() => {
      db.prepare('DELETE FROM alliance_diplomacy WHERE alliance_id = ? OR target_alliance_id = ?').run(
        membership.alliance_id, membership.alliance_id,
      );
      db.prepare('DELETE FROM alliance_members WHERE alliance_id = ?').run(membership.alliance_id);
      db.prepare('DELETE FROM alliances WHERE id = ?').run(membership.alliance_id);
    });
    txn();
  } else {
    db.prepare('DELETE FROM alliance_members WHERE user_id = ?').run(userId);
  }

  res.json({ ok: true });
});

// PUT /api/alliance/rank — Changer le rang d'un membre (leader/officer only)
router.put('/rank', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { targetUserId, newRank } = req.body as { targetUserId: string; newRank: string };

  if (!['member', 'officer'].includes(newRank)) {
    res.status(400).json({ error: 'Rang invalide' });
    return;
  }

  const myMembership = db.prepare(`
    SELECT am.alliance_id, am.rank FROM alliance_members am WHERE am.user_id = ?
  `).get(userId) as { alliance_id: string; rank: string } | undefined;

  if (!myMembership || !['leader', 'officer'].includes(myMembership.rank)) {
    res.status(403).json({ error: 'Permission insuffisante' });
    return;
  }

  const targetMembership = db.prepare(
    'SELECT user_id FROM alliance_members WHERE user_id = ? AND alliance_id = ?',
  ).get(targetUserId, myMembership.alliance_id);

  if (!targetMembership) {
    res.status(404).json({ error: 'Membre introuvable' });
    return;
  }

  db.prepare('UPDATE alliance_members SET rank = ? WHERE user_id = ?').run(newRank, targetUserId);
  res.json({ ok: true });
});

// POST /api/alliance/diplomacy — Declarer une relation diplomatique
router.post('/diplomacy', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { targetAllianceId, relation } = req.body as { targetAllianceId: string; relation: string };

  if (!['war', 'peace', 'nap'].includes(relation)) {
    res.status(400).json({ error: 'Relation invalide' });
    return;
  }

  const myMembership = db.prepare(`
    SELECT am.alliance_id, am.rank FROM alliance_members am WHERE am.user_id = ?
  `).get(userId) as { alliance_id: string; rank: string } | undefined;

  if (!myMembership || myMembership.rank !== 'leader') {
    res.status(403).json({ error: 'Seul le leader peut gerer la diplomatie' });
    return;
  }

  // Upsert
  db.prepare(`
    INSERT INTO alliance_diplomacy (alliance_id, target_alliance_id, relation)
    VALUES (?, ?, ?)
    ON CONFLICT(alliance_id, target_alliance_id) DO UPDATE SET relation = excluded.relation
  `).run(myMembership.alliance_id, targetAllianceId, relation);

  res.json({ ok: true });
});

// GET /api/alliance/list — Lister toutes les alliances
router.get('/list', (_req: AuthRequest, res) => {
  const db = getDb();
  const alliances = db.prepare(`
    SELECT a.id, a.tag, a.name, a.description,
           COUNT(am.user_id) as member_count,
           u.username as leader_name
    FROM alliances a
    JOIN users u ON u.id = a.leader_id
    LEFT JOIN alliance_members am ON am.alliance_id = a.id
    GROUP BY a.id
    ORDER BY member_count DESC
  `).all() as Record<string, unknown>[];

  res.json(alliances);
});

export default router;
