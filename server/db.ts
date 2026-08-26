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

      CREATE TABLE IF NOT EXISTS broadcast_campaigns (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        image_url TEXT,
        target_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'sent',
        detail TEXT,
        failures JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_broadcast_created_at
        ON broadcast_campaigns (created_at DESC);

      CREATE TABLE IF NOT EXISTS voucher_batches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS voucher_codes (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL REFERENCES voucher_batches (id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        -- available = siap dibagikan, assigned = sudah dikunci untuk 1 orang,
        -- sent = pesan berisi kode sudah masuk antrian Fonnte
        status TEXT NOT NULL DEFAULT 'available',
        lead_id TEXT,
        lead_name TEXT,
        lead_phone TEXT,
        campaign_id TEXT,
        assigned_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (batch_id, code)
      );

      CREATE INDEX IF NOT EXISTS idx_voucher_codes_batch_status
        ON voucher_codes (batch_id, status);

      CREATE INDEX IF NOT EXISTS idx_voucher_codes_lead
        ON voucher_codes (batch_id, lead_id);

      ALTER TABLE broadcast_campaigns
        ADD COLUMN IF NOT EXISTS voucher_batch_id TEXT;
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
