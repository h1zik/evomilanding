import type { Express, Request } from "express";
import { pool } from "./db.js";
import { requireAdmin } from "./adminAuth.js";
import {
  getDeviceInfo,
  getFonnteToken,
  hasVoucherPlaceholder,
  normalizePhone,
  sendBroadcast,
  type BroadcastTarget,
} from "./fonnte.js";
import {
  claimVoucherCodes,
  markVoucherCodesSent,
  releaseVoucherCodes,
  type VoucherAssignment,
} from "./voucherRoute.js";

/** Kode contoh untuk mode tes — tidak mengambil stok voucher asli */
const TEST_VOUCHER_CODE = "CONTOH-VOUCHER-123";

function createId() {
  return `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Fonnte harus menerima URL absolut agar bisa mengunduh gambar dari server. */
function resolvePublicImageUrl(req: Request, rawUrl?: string): string | undefined {
  const value = rawUrl?.trim();
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    if (!value.startsWith("/")) {
      throw new Error("URL gambar tidak valid");
    }
    const host = req.get("host");
    if (!host) {
      throw new Error("Domain publik server tidak tersedia");
    }
    url = new URL(value, `${req.protocol}://${host}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL gambar harus memakai HTTP atau HTTPS");
  }
  return url.toString();
}

interface WaitlistRow {
  id: string;
  name: string;
  whatsapp: string;
}

/** Target Fonnte yang masih membawa id pendaftar — dibutuhkan saat menautkan voucher */
interface ResolvedTarget extends BroadcastTarget {
  leadId: string;
}

/** Ambil pendaftar → target Fonnte, buang nomor invalid & duplikat */
function toTargets(rows: WaitlistRow[]) {
  const targets: ResolvedTarget[] = [];
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
    targets.push({ leadId: row.id, phone, name: row.name });
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
      voucherBatchId,
      allowPartialVoucher,
      skipAlreadyAssigned,
    } = req.body as {
      message?: string;
      imageUrl?: string;
      delay?: string;
      recipientIds?: string[] | null;
      testNumber?: string;
      /** Kalau diisi, tiap penerima dapat satu kode unik dari batch ini */
      voucherBatchId?: string | null;
      /** Stok kode kurang → tetap kirim ke sebagian penerima */
      allowPartialVoucher?: boolean;
      /** Lewati pendaftar yang sudah pernah dapat kode dari batch ini (default: ya) */
      skipAlreadyAssigned?: boolean;
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

    const batchId = voucherBatchId?.trim() || null;
    if (batchId && !hasVoucherPlaceholder(text)) {
      res.status(400).json({
        error:
          "Pesan belum memuat placeholder {voucher} — tanpa itu kode tidak akan muncul di pesan penerima.",
      });
      return;
    }

    let publicImageUrl: string | undefined;
    try {
      publicImageUrl = resolvePublicImageUrl(req, imageUrl);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "URL gambar tidak valid",
      });
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
          [{ phone, name: "Admin", vars: batchId ? [TEST_VOUCHER_CODE] : undefined }],
          text,
          { imageUrl: publicImageUrl, delay },
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

      const id = createId();

      /**
       * Mode voucher: kunci satu kode unik per penerima sebelum mengirim.
       * Kode yang pengirimannya gagal dikembalikan ke stok di bawah, jadi
       * broadcast bisa diulang tanpa kode terbuang.
       */
      let sendTargets: BroadcastTarget[] = targets;
      let assignments: VoucherAssignment[] = [];
      let voucherReport: {
        batchId: string;
        assigned: number;
        alreadyHave: number;
        missing: number;
        sent: number;
        released: number;
      } | null = null;

      if (batchId) {
        const claim = await claimVoucherCodes(batchId, targets, {
          skipAlreadyAssigned: skipAlreadyAssigned !== false,
          allowPartial: allowPartialVoucher === true,
        });
        assignments = claim.assignments;

        if (assignments.length === 0) {
          res.status(400).json({
            error:
              claim.alreadyHave.length > 0
                ? "Semua penerima terpilih sudah pernah menerima kode dari batch ini."
                : "Tidak ada kode voucher tersedia di batch ini.",
            voucher: {
              batchId,
              assigned: 0,
              alreadyHave: claim.alreadyHave.length,
              missing: claim.missing.length,
            },
          });
          return;
        }

        sendTargets = assignments.map((a) => ({
          phone: a.phone,
          name: a.name,
          vars: [a.code],
        }));
        voucherReport = {
          batchId,
          assigned: assignments.length,
          alreadyHave: claim.alreadyHave.length,
          missing: claim.missing.length,
          sent: 0,
          released: 0,
        };
      }

      const summary = await sendBroadcast(token, sendTargets, text, {
        imageUrl: publicImageUrl,
        delay,
      });

      if (batchId && voucherReport) {
        const delivered = new Set(summary.success);
        const sentIds = assignments.filter((a) => delivered.has(a.phone)).map((a) => a.codeId);
        const stuckIds = assignments
          .filter((a) => !delivered.has(a.phone))
          .map((a) => a.codeId);
        await markVoucherCodesSent(sentIds, id);
        await releaseVoucherCodes(stuckIds);
        voucherReport.sent = sentIds.length;
        voucherReport.released = stuckIds.length;
      }

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

      const { rows: saved } = await pool.query(
        `INSERT INTO broadcast_campaigns
           (id, message, image_url, target_count, success_count, failed_count, status, detail, failures, voucher_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
         RETURNING id, message, image_url AS "imageUrl", target_count AS "targetCount",
                   success_count AS "successCount", failed_count AS "failedCount",
                   status, detail, failures, voucher_batch_id AS "voucherBatchId",
                   created_at AS "createdAt"`,
        [
          id,
          text,
          publicImageUrl ?? null,
          sendTargets.length + invalid.length,
          summary.success.length,
          failures.length,
          status,
          summary.details.join(" | ").slice(0, 1000),
          JSON.stringify(failures.slice(0, 200)),
          batchId,
        ],
      );

      res.json({
        campaign: saved[0],
        invalidSkipped: invalid.length,
        voucher: voucherReport,
      });
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
                status, detail, failures, voucher_batch_id AS "voucherBatchId",
                created_at AS "createdAt"
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
