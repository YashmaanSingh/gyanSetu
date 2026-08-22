import { createApp } from "./app";
import { initDb } from "./db";
import { runMigrations } from "./db/migrate";
import { config } from "./config";

async function start() {
  console.log("Initializing database...");
  await initDb();
  console.log("Running migrations...");
  await runMigrations();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`✓ GyaanSetu API listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
