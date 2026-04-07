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
  production_factors TEXT NOT NULL DEFAULT '{}', -- JSON Record<BuildingType, number 0-1>
  ships TEXT NOT NULL DEFAULT '{}',      -- JSON
  defenses TEXT NOT NULL DEFAULT '{}',   -- JSON
  is_npc INTEGER NOT NULL DEFAULT 0,
  npc_level INTEGER DEFAULT NULL,
  last_pillaged INTEGER DEFAULT NULL,
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

-- Files de construction vaisseaux/defenses (chantier naval)
CREATE TABLE IF NOT EXISTS shipyard_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  planet_id TEXT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,         -- ex: 'lightFighter', 'rocketLauncher'
  unit_category TEXT NOT NULL,     -- 'ship' ou 'defense'
  quantity INTEGER NOT NULL,
  remaining INTEGER NOT NULL,      -- nombre restant a construire
  unit_time INTEGER NOT NULL,      -- temps par unite en secondes
  elapsed INTEGER NOT NULL DEFAULT 0,  -- temps ecoule sur l'unite en cours
  started_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Champs de debris
CREATE TABLE IF NOT EXISTS debris_fields (
  galaxy INTEGER NOT NULL,
  system INTEGER NOT NULL,
  position INTEGER NOT NULL,
  metal REAL NOT NULL DEFAULT 0,
  crystal REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (galaxy, system, position)
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

-- Alliances
CREATE TABLE IF NOT EXISTS alliances (
  id TEXT PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL,        -- tag court (3-8 chars)
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  leader_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Membres d'alliance
CREATE TABLE IF NOT EXISTS alliance_members (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  rank TEXT NOT NULL DEFAULT 'member',  -- leader, officer, member
  joined_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Diplomatie entre alliances
CREATE TABLE IF NOT EXISTS alliance_diplomacy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  target_alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,  -- war, peace, nap (non-aggression pact)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(alliance_id, target_alliance_id)
);

-- Messages prives entre joueurs
CREATE TABLE IF NOT EXISTS private_messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Classements (cache, recalcule periodiquement)
CREATE TABLE IF NOT EXISTS rankings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  economy_points INTEGER NOT NULL DEFAULT 0,
  research_points INTEGER NOT NULL DEFAULT 0,
  military_points INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Achievements (succes debloques par joueur)
CREATE TABLE IF NOT EXISTS achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  claimed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, achievement_id)
);

-- Tutoriel (progression par joueur)
CREATE TABLE IF NOT EXISTS tutorial_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0
);

-- Index
CREATE INDEX IF NOT EXISTS idx_planets_user ON planets(user_id);
CREATE INDEX IF NOT EXISTS idx_planets_coords ON planets(galaxy, system, position);
CREATE INDEX IF NOT EXISTS idx_fleet_user ON fleet_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_fleet_arrival ON fleet_movements(arrival_time);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alliance_members ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_to ON private_messages(to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rankings_total ON rankings(total_points DESC);
