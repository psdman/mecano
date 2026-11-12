-- Utilisateurs (login + rôles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mecanicien' CHECK (role IN ('admin','mecanicien')),
  nom TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,          -- JSON complet de l'objet Client
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Véhicules
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehicles_client ON vehicles(client_id);

-- Interventions
CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  vehicule_id TEXT,
  statut TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interv_client ON interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interv_vehicle ON interventions(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_interv_statut ON interventions(statut);

-- Paiements
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  intervention_id TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pay_client ON payments(client_id);

-- Sessions (tokens opaques)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
