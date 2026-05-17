import Database from "better-sqlite3";

import { applySchema } from "./schema";

export type AppDatabase = Database.Database;

export function createDatabase(databasePath: string): AppDatabase {
  const db = new Database(databasePath);
  configureDatabase(db);
  applySchema(db);
  return db;
}

export function createInMemoryDatabase(): AppDatabase {
  const db = new Database(":memory:");
  configureDatabase(db);
  applySchema(db);
  return db;
}

function configureDatabase(db: AppDatabase): void {
  db.pragma("foreign_keys = ON");
}
