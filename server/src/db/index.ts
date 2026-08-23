import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { config } from "../config";

export type DB = NodePgDatabase<typeof schema>;

let _db: DB | null = null;
let _pool: Pool | null = null;

export async function initDb(): Promise<DB> {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    ssl: connectionString.includes("render.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  _db = drizzle(pool, { schema });
  _pool = pool;
  return _db;
}

export function getDb(): DB {
  if (!_db) throw new Error("Database not initialized. Call initDb() before use.");
  return _db;
}

export function getPool(): Pool {
  if (!_pool) throw new Error("Database not initialized.");
  return _pool;
}

export { schema };
