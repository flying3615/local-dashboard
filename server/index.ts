import cors from "cors";
import express from "express";

import { createDatabase } from "./db/database";
import { createRepositories } from "./db/repositories";
import { createApiRoutes, seedMockData } from "./api/routes";
import {
  initialFetchIfNeeded,
  registerAdapterSources,
  runtimeAdapters,
  shouldSeedMockData,
} from "./startup";

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || "data/dashboard.db";

const db = createDatabase(DB_PATH);
const repositories = createRepositories(db);

const adapters = runtimeAdapters(process.env);
registerAdapterSources(repositories, adapters);

if (shouldSeedMockData(process.env)) {
  seedMockData(repositories);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", createApiRoutes(repositories, adapters));

initialFetchIfNeeded(repositories, adapters)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Initial fetch failed:", error);
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT} (initial fetch failed)`);
    });
  });
