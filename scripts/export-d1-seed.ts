import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

const dbPath = process.argv[2] ?? "data/dashboard.db";
const outPath = process.argv[3] ?? "tmp/d1-seed.sql";

const db = new Database(dbPath, { readonly: true });

const tables = [
  "sources",
  "raw_snapshots",
  "items",
  "property_listings",
  "item_links",
  "schools",
  "school_events",
  "notes",
];

const statements: string[] = [
  "PRAGMA foreign_keys=OFF;",
  ...tables.map((table) => `DELETE FROM ${table};`),
];

for (const table of tables) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<
    string,
    unknown
  >[];

  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map((column) => sqlValue(row[column])).join(", ");
    statements.push(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values});`,
    );
  }
}

statements.push("PRAGMA foreign_keys=ON;");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${statements.join("\n")}\n`);
db.close();

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}
