import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';
import { signToken } from '../utils/jwt.js';
import { randomUUID } from 'crypto';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Donnees invalides', details: parsed.error.flatten() });
    return;
  }

  const { username, email, password } = parsed.data;
  const db = getDb();

  // Verifier unicite
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    res.status(409).json({ error: 'Nom d\'utilisateur ou email deja pris' });
    return;
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
  ).run(id, username, email, passwordHash);

  // Creer la recherche initiale
  db.prepare('INSERT INTO research (user_id, data) VALUES (?, ?)').run(id, '{}');

  const token = signToken({ userId: id, username });

  res.status(201).json({ token, user: { id, username } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Donnees invalides' });
    return;
  }

  const { username, password } = parsed.data;
  const db = getDb();

  const user = db.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ?',
  ).get(username) as { id: string; username: string; password_hash: string } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Identifiants incorrects' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Identifiants incorrects' });
    return;
  }

  // Mettre a jour last_login
  db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').run(user.id);

  const token = signToken({ userId: user.id, username: user.username });

  res.json({ token, user: { id: user.id, username: user.username } });
});

export default router;
