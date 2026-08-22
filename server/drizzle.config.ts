import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  driver: "pglite",
  dbCredentials: {
    url: process.env.DATABASE_DIR || (process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}/GyaanSetu/data`
      : "./.data"),
  },
  verbose: true,
  strict: true,
} satisfies Config;
