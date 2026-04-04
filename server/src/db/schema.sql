-- OGame2D Database Schema

-- Joueurs
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Planetes
CREATE TABLE IF NOT EXISTS planets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  galaxy INTEGER NOT NULL,
  system INTEGER NOT NULL,
  position INTEGER NOT NULL,
  size INTEGER NOT NULL,
  temperature INTEGER NOT NULL,
  biome TEXT NOT NULL,
  aquaticity REAL NOT NULL DEFAULT 0.3,
  metal REAL NOT NULL DEFAULT 500,
  crystal REAL NOT NULL DEFAULT 500,
  deuterium REAL NOT NULL DEFAULT 0,
  buildings TEXT NOT NULL DEFAULT '{}',  -- JSON
  ships TEXT NOT NULL DEFAULT '{}',      -- JSON
  defenses TEXT NOT NULL DEFAULT '{}',   -- JSON
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(galaxy, system, position)
);

-- Lunes
CREATE TABLE IF NOT EXISTS moons (
  id TEXT PRIMARY KEY,
  planet_id TEXT UNIQUE NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  buildings TEXT NOT NULL DEFAULT '{}',
  ships TEXT NOT NULL DEFAULT '{}',
  defenses TEXT NOT NULL DEFAULT '{}'
);

-- Recherches (globales par joueur)
CREATE TABLE IF NOT EXISTS research (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}'  -- JSON Record<ResearchType, number>
);

-- Files de construction
CREATE TABLE IF NOT EXISTS building_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  planet_id TEXT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  building TEXT NOT NULL,
  target_level INTEGER NOT NULL,
  remaining_time INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  started_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- File de recherche (une seule par joueur)
CREATE TABLE IF NOT EXISTS research_queues (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  planet_id TEXT NOT NULL,
  research TEXT NOT NULL,
  target_level INTEGER NOT NULL,
  remaining_time INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  started_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Mouvements de flotte
CREATE TABLE IF NOT EXISTS fleet_movements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ships TEXT NOT NULL,          -- JSON
  origin_galaxy INTEGER NOT NULL,
  origin_system INTEGER NOT NULL,
  origin_position INTEGER NOT NULL,
  dest_galaxy INTEGER NOT NULL,
  dest_system INTEGER NOT NULL,
  dest_position INTEGER NOT NULL,
  mission TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT '{}',
  speed INTEGER NOT NULL DEFAULT 100,
  departure_time INTEGER NOT NULL,
  arrival_time INTEGER NOT NULL,
  return_time INTEGER,
  resolved INTEGER NOT NULL DEFAULT 0
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,  -- JSON (combat result, espionage report, etc.)
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index
CREATE INDEX IF NOT EXISTS idx_planets_user ON planets(user_id);
CREATE INDEX IF NOT EXISTS idx_planets_coords ON planets(galaxy, system, position);
CREATE INDEX IF NOT EXISTS idx_fleet_user ON fleet_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_fleet_arrival ON fleet_movements(arrival_time);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at);
