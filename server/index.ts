import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabaseHost, initDatabase, pool } from "./db.js";
import { ensureUploadsDir, resolveUploadsDir } from "./uploadPaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const uploadsDir = resolveUploadsDir(rootDir);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

ensureUploadsDir(uploadsDir);

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    const counts = await pool.query<{ content_rows: string; waitlist_rows: string }>(
      `SELECT
        (SELECT COUNT(*)::text FROM site_content) AS content_rows,
        (SELECT COUNT(*)::text FROM waitlist_submissions) AS waitlist_rows`,
    );
    const row = counts.rows[0];
    res.json({
      ok: true,
      database: "connected",
      dbHost: getDatabaseHost(),
      contentRows: Number(row?.content_rows ?? 0),
      waitlistRows: Number(row?.waitlist_rows ?? 0),
      uploadsDir,
      persistentHint:
        "Konten & waitlist di PostgreSQL. Upload gambar perlu UPLOAD_PUBLIC_DIR + volume di Railway.",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : "Database unavailable",
      dbHost: getDatabaseHost(),
    });
  }
});

app.get("/api/content", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT data FROM site_content WHERE id = 'main'`,
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Content not found" });
      return;
    }
    res.json(rows[0].data);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load content",
    });
  }
});

app.put("/api/content", async (req, res) => {
  try {
    const data = req.body;
    await pool.query(
      `INSERT INTO site_content (id, data, updated_at)
       VALUES ('main', $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(data)],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to save content",
    });
  }
});

app.get("/api/waitlist", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, whatsapp, scent,
              submitted_at AS "submittedAt"
       FROM waitlist_submissions
       ORDER BY submitted_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load waitlist",
    });
  }
});

app.post("/api/waitlist", async (req, res) => {
  try {
    const { id, name, whatsapp, scent, submittedAt } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO waitlist_submissions (id, name, whatsapp, scent, submitted_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           whatsapp = EXCLUDED.whatsapp,
           scent = EXCLUDED.scent
       RETURNING id, name, whatsapp, scent,
                 submitted_at AS "submittedAt"`,
      [id, name, whatsapp, scent, submittedAt ?? null],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to save submission",
    });
  }
});

app.put("/api/waitlist", async (req, res) => {
  const client = await pool.connect();
  try {
    const list = req.body as Array<{
      id: string;
      name: string;
      whatsapp: string;
      scent: string;
      submittedAt?: string;
    }>;
    await client.query("BEGIN");
    await client.query("DELETE FROM waitlist_submissions");
    for (const item of list) {
      await client.query(
        `INSERT INTO waitlist_submissions (id, name, whatsapp, scent, submitted_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))`,
        [
          item.id,
          item.name,
          item.whatsapp,
          item.scent,
          item.submittedAt ?? null,
        ],
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to sync waitlist",
    });
  } finally {
    client.release();
  }
});

app.delete("/api/waitlist/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM waitlist_submissions WHERE id = $1`, [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to delete",
    });
  }
});

function attachFrontend() {
  const distDir = path.join(rootDir, "dist");
  if (!fs.existsSync(distDir)) {
    console.warn("[api] dist/ tidak ditemukan — hanya mode API (gunakan npm run dev:web untuk frontend)");
    return;
  }
  app.use(express.static(distDir, { index: false }));
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log("[api] Serving frontend from dist/");
}

app.post("/api/upload", async (req, res) => {
  try {
    const { filename, mimeType, data, prefix } = req.body as {
      filename: string;
      mimeType: string;
      data: string;
      prefix?: string;
    };
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(mimeType)) {
      res.status(400).json({ error: "Format tidak didukung" });
      return;
    }
    const base64 = data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_UPLOAD_BYTES) {
      res.status(400).json({ error: "File terlalu besar (max 10MB)" });
      return;
    }
    const ext =
      path.extname(filename) ||
      (mimeType === "image/svg+xml" ? ".svg" : ".png");
    const safePrefix = (prefix || "upload").replace(/[^a-z0-9-]/gi, "");
    const safeName = `${safePrefix}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);
    res.json({ url: `/uploads/${safeName}` });
  } catch (err) {
    console.error("[api] Upload error:", err);
    res.status(400).json({ error: "Upload gagal" });
  }
});

const port = Number(process.env.PORT) || 3001;

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error("[api] DATABASE_URL belum di-set");
    process.exit(1);
  }
  await initDatabase();
  attachFrontend();
  app.listen(port, "0.0.0.0", () => {
    console.log(`[api] Server running at http://localhost:${port}`);
    console.log(`[api] PostgreSQL connected (host: ${getDatabaseHost() ?? "?"})`);
    console.log(`[api] Uploads directory: ${uploadsDir}`);
  });
}

start().catch((err) => {
  console.error("[api] Failed to start:", err);
  process.exit(1);
});
