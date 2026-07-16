-- Strategic Warfare Online - core schema
-- One shared persistent world: all nations live on this single server.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nations (
  id            SERIAL PRIMARY KEY,
  iso_code      TEXT NOT NULL UNIQUE,      -- ISO 3166-1 numeric or alpha-3 from world-atlas
  name          TEXT NOT NULL,
  centroid_lat  DOUBLE PRECISION NOT NULL,
  centroid_lon  DOUBLE PRECISION NOT NULL,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  money         NUMERIC NOT NULL DEFAULT 5000,
  income_rate   NUMERIC NOT NULL DEFAULT 50, -- money granted per tick
  claimed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nations_owner ON nations(owner_user_id);

CREATE TABLE IF NOT EXISTS units (
  id            SERIAL PRIMARY KEY,
  nation_id     INTEGER NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,             -- e.g. 'infantry'
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  dest_lat      DOUBLE PRECISION,
  dest_lon      DOUBLE PRECISION,
  speed_kmh     DOUBLE PRECISION NOT NULL DEFAULT 5,
  hp            INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_nation ON units(nation_id);
