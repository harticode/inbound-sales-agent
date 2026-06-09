import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

function createPool() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://carrier:carrier@localhost:5432/carrier_sales";
  return new Pool({ connectionString });
}

export const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
