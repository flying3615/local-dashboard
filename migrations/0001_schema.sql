CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  trust_level TEXT NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  refresh_interval_minutes INTEGER NOT NULL,
  last_success_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_snapshots (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  area TEXT,
  address TEXT,
  published_at TEXT,
  starts_at TEXT,
  ends_at TEXT,
  status TEXT NOT NULL,
  tags TEXT NOT NULL,
  raw_snapshot_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
  FOREIGN KEY (raw_snapshot_id) REFERENCES raw_snapshots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS items_type_idx ON items(type);
CREATE INDEX IF NOT EXISTS items_source_id_idx ON items(source_id);

CREATE TABLE IF NOT EXISTS property_listings (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  price TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking INTEGER,
  land_area REAL,
  floor_area REAL,
  listed_at TEXT,
  open_home_times TEXT NOT NULL,
  platform TEXT NOT NULL,
  watch_status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS property_listings_watch_status_idx
  ON property_listings(watch_status);

CREATE TABLE IF NOT EXISTS item_links (
  id TEXT PRIMARY KEY,
  from_item_id TEXT NOT NULL,
  to_entity_type TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  link_reason TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS item_links_from_item_id_idx
  ON item_links(from_item_id);

CREATE INDEX IF NOT EXISTS item_links_target_idx
  ON item_links(to_entity_type, to_entity_id);

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school_type TEXT NOT NULL,
  years TEXT NOT NULL,
  gender TEXT NOT NULL,
  authority TEXT NOT NULL,
  has_zone INTEGER,
  website TEXT NOT NULL,
  area TEXT NOT NULL,
  commute_from_paraparaumu TEXT,
  watch_status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_events (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  starts_at TEXT,
  deadline TEXT,
  enrolment_year INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS school_events_school_id_idx
  ON school_events(school_id);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS notes_entity_idx
  ON notes(entity_type, entity_id);
