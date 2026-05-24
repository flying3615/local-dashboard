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
      last_seen_at TEXT,
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
      estimated_value_low INTEGER,
      estimated_value_high INTEGER,
      estimated_value_date TEXT,
      capital_value INTEGER,
      land_value INTEGER,
      improvement_value INTEGER,
      cv_date TEXT,
      estimated_rental_low INTEGER,
      estimated_rental_high INTEGER,
      estimated_rental_yield TEXT,
      decade_built TEXT,
      contour TEXT,
      building_construction TEXT,
      ownership_type TEXT,
      legal_description TEXT,
      certificate_of_title TEXT,
      image_url TEXT,
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

    CREATE TABLE IF NOT EXISTS adapter_caches (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Safe migration for existing databases (tolerate column-already-exists)
    const propertyMigrations = [
      "ALTER TABLE items ADD COLUMN last_seen_at TEXT",
      "ALTER TABLE property_listings ADD COLUMN estimated_value_low INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_value_high INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_value_date TEXT",
      "ALTER TABLE property_listings ADD COLUMN capital_value INTEGER",
      "ALTER TABLE property_listings ADD COLUMN land_value INTEGER",
      "ALTER TABLE property_listings ADD COLUMN improvement_value INTEGER",
      "ALTER TABLE property_listings ADD COLUMN cv_date TEXT",
      "ALTER TABLE property_listings ADD COLUMN estimated_rental_low INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_rental_high INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_rental_yield TEXT",
      "ALTER TABLE property_listings ADD COLUMN decade_built TEXT",
      "ALTER TABLE property_listings ADD COLUMN contour TEXT",
      "ALTER TABLE property_listings ADD COLUMN building_construction TEXT",
      "ALTER TABLE property_listings ADD COLUMN ownership_type TEXT",
      "ALTER TABLE property_listings ADD COLUMN legal_description TEXT",
      "ALTER TABLE property_listings ADD COLUMN certificate_of_title TEXT",
      "ALTER TABLE property_listings ADD COLUMN image_url TEXT",
      "ALTER TABLE items ADD COLUMN region TEXT NOT NULL DEFAULT 'kapiti'",
      "ALTER TABLE property_listings ADD COLUMN region TEXT NOT NULL DEFAULT 'kapiti'",
      "ALTER TABLE schools ADD COLUMN region TEXT NOT NULL DEFAULT 'kapiti'",
    ];
    for (const sql of propertyMigrations) {
      try { db.exec(sql); } catch { /* column already exists */ }
    }

    // Indexes for region filtering (safe to re-create)
    try { db.exec("CREATE INDEX IF NOT EXISTS items_region_idx ON items(region)"); } catch { /* ignore */ }
    try { db.exec("CREATE INDEX IF NOT EXISTS property_listings_region_idx ON property_listings(region)"); } catch { /* ignore */ }
    try { db.exec("CREATE INDEX IF NOT EXISTS schools_region_idx ON schools(region)"); } catch { /* ignore */ }
}
