import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pool } from "../db/client";

async function migrate() {
  const migrationsDir = join(process.cwd(), "drizzle/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    const statements = sql
      .split(/--> statement-breakpoint/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
