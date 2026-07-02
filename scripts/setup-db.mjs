import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Put it in .env.local or pass it before running this script.");
  process.exit(1);
}

const root = process.cwd();
const migrationDir = path.join(root, "supabase", "migrations");
const files = (await fs.readdir(migrationDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const sql = postgres(databaseUrl, { max: 1 });

try {
  for (const file of files) {
    const fullPath = path.join(migrationDir, file);
    const content = await fs.readFile(fullPath, "utf8");
    console.log(`Applying ${file}`);
    await sql.unsafe(content);
  }
  console.log("Database setup complete.");
} finally {
  await sql.end();
}
