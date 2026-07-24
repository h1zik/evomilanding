import type { Express, NextFunction, Request, Response } from "express";
import { pool } from "./db.js";
import {
  getDeviceInfo,
  getFonnteToken,
  normalizePhone,
  sendBroadcast,
  type BroadcastTarget,
} from "./fonnte.js";

/** Password admin sisi server — fallback ke VITE_ADMIN_PASSWORD agar sama dengan login panel */
function getAdminPassword(): string | null {
  const pwd =
    process.env.ADMIN_PASSWORD?.trim() || process.env.VITE_ADMIN_PASSWORD?.trim();
  return pwd ? pwd : null;
}

/**
 * Endpoint broadcast bisa mengirim pesan ke semua pendaftar (dan menghabiskan kuota),
 * jadi wajib menyertakan password admin di header `x-admin-password`.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = getAdminPassword();
  if (!expected) {
    res.status(500).json({
      error:
        "ADMIN_PASSWORD belum di-set di server. Tambahkan ke .env / environment variable Railway.",
    });
    return;
  }
  const given = req.header("x-admin-password");
  if (given !== expected) {
    res.status(401).json({ error: "Password admin tidak valid" });
    return;
  }
  next();
}

function createId() {
  return `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface WaitlistRow {
  id: string;
  name: string;
  whatsapp: string;
}

/** Ambil pendaftar → target Fonnte, buang nomor invalid & duplikat */
function toTargets(rows: WaitlistRow[]) {
  const targets: BroadcastTarget[] = [];
  const invalid: { id: string; name: string; whatsapp: string }[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const phone = normalizePhone(row.whatsapp);
    if (!phone) {
      invalid.push({ id: row.id, name: row.name, whatsapp: row.whatsapp });
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    targets.push({ phone, name: row.name });
  }

  return { targets, invalid };
}

export function attachBroadcastRoute(app: Express) {
  /** Status integrasi: token terpasang? device tersambung? sisa kuota? */
  app.get("/api/broadcast/status", requireAdmin, async (_req, res) => {
    const token = getFonnteToken();
    if (!token) {
      res.json({
        configured: false,
        message:
          "FONNTE_TOKEN belum di-set. Ambil token device di dashboard Fonnte, lalu isi di .env / environment Railway.",
      });
      return;
    }

    try {
      const device = await getDeviceInfo(token);
      res.json({ configured: true, device });
    } catch (err) {
      res.json({
        configured: true,
        device: null,
        message: err instanceof Error ? err.message : "Gagal membaca status device",
      });
    }
  });

  /** Ringkasan penerima: berapa nomor valid / invalid dari daftar waitlist */
  app.get("/api/broadcast/recipients", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query<WaitlistRow>(
        `SELECT id, name, whatsapp FROM waitlist_submissions ORDER BY submitted_at DESC`,
      );
      const { targets, invalid } = toTargets(rows);
      res.json({ total: rows.length, valid: targets.length, invalid });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal membaca pendaftar",
      });
    }
  });

  /** Kirim broadcast. Body: { message, imageUrl?, delay?, recipientIds?, testNumber? } */
  app.post("/api/broadcast", requireAdmin, async (req, res) => {
    const token = getFonnteToken();
    if (!token) {
      res.status(400).json({ error: "FONNTE_TOKEN belum di-set di server" });
      return;
    }

    const {
      message,
      imageUrl,
      delay,
      recipientIds,
      testNumber,
    } = req.body as {
      message?: string;
      imageUrl?: string;
      delay?: string;
      recipientIds?: string[] | null;
      testNumber?: string;
    };

    const text = (message ?? "").trim();
    if (!text) {
      res.status(400).json({ error: "Pesan tidak boleh kosong" });
      return;
    }
    if (text.length > 4000) {
      res.status(400).json({ error: "Pesan terlalu panjang (maksimal 4000 karakter)" });
      return;
    }

    try {
      // Mode tes — kirim ke satu nomor saja, tidak dicatat sebagai campaign
      if (testNumber) {
        const phone = normalizePhone(testNumber);
        if (!phone) {
          res.status(400).json({ error: "Nomor tes tidak valid" });
          return;
        }
        const summary = await sendBroadcast(
          token,
          [{ phone, name: "Admin" }],
          text,
          { imageUrl, delay },
        );
        res.json({
          test: true,
          success: summary.success.length,
          failed: summary.failed.length,
          detail: summary.details.join(" | "),
          failures: summary.failed,
        });
        return;
      }

      const ids = Array.isArray(recipientIds) ? recipientIds.filter(Boolean) : null;
      if (ids && ids.length === 0) {
        res.status(400).json({ error: "Belum ada penerima yang dipilih" });
        return;
      }

      const { rows } = ids
        ? await pool.query<WaitlistRow>(
            `SELECT id, name, whatsapp FROM waitlist_submissions
             WHERE id = ANY($1::text[]) ORDER BY submitted_at DESC`,
            [ids],
          )
        : await pool.query<WaitlistRow>(
            `SELECT id, name, whatsapp FROM waitlist_submissions ORDER BY submitted_at DESC`,
          );

      const { targets, invalid } = toTargets(rows);
      if (targets.length === 0) {
        res.status(400).json({
          error: "Tidak ada nomor valid untuk dikirimi pesan",
          invalid,
        });
        return;
      }

      const summary = await sendBroadcast(token, targets, text, { imageUrl, delay });

      const failures = [
        ...summary.failed,
        ...invalid.map((i) => ({
          phone: i.whatsapp,
          reason: "Format nomor tidak valid — dilewati",
        })),
      ];
      const status =
        summary.success.length === 0
          ? "failed"
          : failures.length > 0
            ? "partial"
            : "sent";

      const id = createId();
      const { rows: saved } = await pool.query(
        `INSERT INTO broadcast_campaigns
           (id, message, image_url, target_count, success_count, failed_count, status, detail, failures)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         RETURNING id, message, image_url AS "imageUrl", target_count AS "targetCount",
                   success_count AS "successCount", failed_count AS "failedCount",
                   status, detail, failures, created_at AS "createdAt"`,
        [
          id,
          text,
          imageUrl?.trim() || null,
          targets.length + invalid.length,
          summary.success.length,
          failures.length,
          status,
          summary.details.join(" | ").slice(0, 1000),
          JSON.stringify(failures.slice(0, 200)),
        ],
      );

      res.json({ campaign: saved[0], invalidSkipped: invalid.length });
    } catch (err) {
      console.error("[broadcast] error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal mengirim broadcast",
      });
    }
  });

  /** Riwayat broadcast */
  app.get("/api/broadcast/history", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const { rows } = await pool.query(
        `SELECT id, message, image_url AS "imageUrl", target_count AS "targetCount",
                success_count AS "successCount", failed_count AS "failedCount",
                status, detail, failures, created_at AS "createdAt"
         FROM broadcast_campaigns
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal membaca riwayat",
      });
    }
  });
}
