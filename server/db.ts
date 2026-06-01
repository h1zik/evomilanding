import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_content (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS waitlist_submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        scent TEXT NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_waitlist_submitted_at
        ON waitlist_submissions (submitted_at DESC);
    `);

    const existing = await client.query(
      `SELECT id FROM site_content WHERE id = 'main'`,
    );
    if (existing.rowCount === 0) {
      const contentPath = path.join(rootDir, "public", "content.json");
      let seed: unknown = { nav: { brandName: "evomi.id", brandLogoUrl: "" } };
      if (fs.existsSync(contentPath)) {
        seed = JSON.parse(fs.readFileSync(contentPath, "utf-8"));
      }
      await client.query(
        `INSERT INTO site_content (id, data) VALUES ('main', $1::jsonb)`,
        [JSON.stringify(seed)],
      );
      console.log("[db] Seeded site_content from content.json");
    }
  } finally {
    client.release();
  }
}
