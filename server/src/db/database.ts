import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || join(__dirname, '../../ogame2d.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function migrateDb(): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  const db = getDb();
  db.exec(schema);

  // Migrations idempotentes pour DB existantes
  const planetCols = db.prepare("PRAGMA table_info(planets)").all() as { name: string }[];
  const colNames = new Set(planetCols.map((c) => c.name));
  if (!colNames.has('is_npc')) {
    db.exec('ALTER TABLE planets ADD COLUMN is_npc INTEGER NOT NULL DEFAULT 0');
  }
  if (!colNames.has('npc_level')) {
    db.exec('ALTER TABLE planets ADD COLUMN npc_level INTEGER DEFAULT NULL');
  }
  if (!colNames.has('last_pillaged')) {
    db.exec('ALTER TABLE planets ADD COLUMN last_pillaged INTEGER DEFAULT NULL');
  }
  if (!colNames.has('production_factors')) {
    db.exec("ALTER TABLE planets ADD COLUMN production_factors TEXT NOT NULL DEFAULT '{}'");
  }

  // Seed user sentinel NPC
  const npcUser = db.prepare("SELECT id FROM users WHERE id = 'npc'").get();
  if (!npcUser) {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, is_active)
      VALUES ('npc', 'Empire NPC', 'npc@ogame2d.local', 'x', 1)
    `).run();
    db.prepare("INSERT OR IGNORE INTO research (user_id, data) VALUES ('npc', '{}')").run();
  }

  console.log('Database migrated successfully');
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
