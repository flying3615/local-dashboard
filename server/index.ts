import cors from "cors";
import express from "express";

import { createDatabase } from "./db/database";
import { createRepositories } from "./db/repositories";
import { createApiRoutes, seedMockData } from "./api/routes";
import {
  allConfiguredAdapters,
  mockAdapters,
} from "./adapters/sourceConfig";

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || "data/dashboard.db";

const db = createDatabase(DB_PATH);
const repositories = createRepositories(db);

const adapters = [...mockAdapters(), ...allConfiguredAdapters().map((ca) => ca.adapter)];

for (const adapter of adapters) {
  repositories.sources.upsert({
    id: adapter.sourceId,
    name: adapter.source.name,
    type: adapter.source.type,
    url: adapter.source.url,
    trustLevel: adapter.source.trustLevel,
    enabled: adapter.source.enabled ?? false,
    refreshIntervalMinutes: adapter.source.refreshIntervalMinutes ?? 1440,
    lastSuccessAt: null,
    lastError: null,
  });
}

seedMockData(repositories);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", createApiRoutes(repositories, adapters));

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
