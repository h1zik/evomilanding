import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

/** Untuk log / health — host database (tanpa password) */
export function getDatabaseHost(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url.replace(/^postgresql:/, "http:"));
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

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
      console.warn(
        "[db] Database kosong — diisi seed dari content.json. Pastikan PostgreSQL persisten (Railway: service Postgres terpisah + DATABASE_URL reference).",
      );
    } else {
      console.log("[db] site_content sudah ada — tidak di-overwrite");
    }
  } finally {
    client.release();
  }
}
