import { initDb } from "./index";
import { runMigrations } from "./migrate";

async function main() {
  await initDb();
  await runMigrations();
  console.log("✓ Database migrations applied.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
