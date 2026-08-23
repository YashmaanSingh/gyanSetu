import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "./index";

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, "../../drizzle");
  await migrate(getDb(), { migrationsFolder });
}
