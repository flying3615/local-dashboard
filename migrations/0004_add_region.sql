-- Add region column to items, property_listings, and schools tables.
-- Default to 'kapiti' so existing data is preserved.
ALTER TABLE items ADD COLUMN region TEXT NOT NULL DEFAULT 'kapiti';
ALTER TABLE property_listings ADD COLUMN region TEXT NOT NULL DEFAULT 'kapiti';
ALTER TABLE schools ADD COLUMN region TEXT NOT NULL DEFAULT 'kapiti';

CREATE INDEX IF NOT EXISTS items_region_idx ON items(region);
CREATE INDEX IF NOT EXISTS property_listings_region_idx ON property_listings(region);
CREATE INDEX IF NOT EXISTS schools_region_idx ON schools(region);
