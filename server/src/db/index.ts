import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { config } from "../config";

export type DB = PgliteDatabase<typeof schema>;

let _db: DB | null = null;
let _client: PGlite | null = null;

export async function initDb(): Promise<DB> {
  if (_db) return _db;
  const client = new PGlite(config.dataDir);
  await client.waitReady;
  _db = drizzle(client, { schema });
  _client = client;
  return _db;
}

export function getDb(): DB {
  if (!_db) throw new Error("Database not initialized. Call initDb() before use.");
  return _db;
}

export function getClient(): PGlite {
  if (!_client) throw new Error("Database not initialized.");
  return _client;
}

export { schema };
