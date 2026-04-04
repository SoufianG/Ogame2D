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
  getDb().exec(schema);
  console.log('Database migrated successfully');
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
