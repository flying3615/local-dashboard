import type Database from "better-sqlite3";

export function applySchema(db: Database.Database): void {
  db.exec(`
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
  `);
}
