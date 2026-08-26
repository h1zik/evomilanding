import type { Express } from "express";
import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { requireAdmin } from "./adminAuth.js";

/** Batas wajar supaya satu import tidak membanjiri database */
const MAX_CODES_PER_IMPORT = 5000;
const MAX_CODE_LENGTH = 64;

function createBatchId() {
  return `vb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createCodeId(index: number) {
  return `vc-${Date.now().toString(36)}-${index.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export interface ParsedCodes {
  codes: string[];
  /** Baris yang dibuang karena duplikat di dalam input yang sama */
  duplicates: string[];
  /** Baris yang dibuang karena format tidak dipakai (terlalu panjang / karakter terlarang) */
  invalid: string[];
}

/**
 * Terima kode dalam bentuk teks bebas (satu per baris, dipisah koma, titik koma,
 * atau tab) maupun array. Duplikat dibuang case-insensitive karena kode voucher
 * umumnya tidak membedakan besar-kecil huruf.
 */
export function parseCodes(input: unknown): ParsedCodes {
  const raw = Array.isArray(input)
    ? input.map((v) => String(v ?? ""))
    : String(input ?? "").split(/[\r\n,;\t]+/);

  const codes: string[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const code = item.trim();
    if (!code) continue;
    if (code.length > MAX_CODE_LENGTH || /[|,\r\n]/.test(code)) {
      invalid.push(code.slice(0, MAX_CODE_LENGTH));
      continue;
    }
    const key = code.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(code);
      continue;
    }
    seen.add(key);
    codes.push(code);
  }

  return { codes, duplicates, invalid };
}

const BATCH_SELECT = `
  SELECT b.id, b.name, b.note, b.created_at AS "createdAt",
         COUNT(c.id)::int AS "totalCount",
         COUNT(c.id) FILTER (WHERE c.status = 'available')::int AS "availableCount",
         COUNT(c.id) FILTER (WHERE c.status = 'assigned')::int AS "assignedCount",
         COUNT(c.id) FILTER (WHERE c.status = 'sent')::int AS "sentCount"
  FROM voucher_batches b
  LEFT JOIN voucher_codes c ON c.batch_id = b.id
`;

const CODE_SELECT = `
  SELECT id, code, status,
         lead_id AS "leadId", lead_name AS "leadName", lead_phone AS "leadPhone",
         campaign_id AS "campaignId",
         assigned_at AS "assignedAt", sent_at AS "sentAt"
  FROM voucher_codes
`;

/** Masukkan kode ke batch. Kode yang sudah ada di batch itu dilewati. */
async function insertCodes(
  client: PoolClient,
  batchId: string,
  codes: string[],
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < codes.length; i += 1) {
    const { rowCount } = await client.query(
      `INSERT INTO voucher_codes (id, batch_id, code)
       VALUES ($1, $2, $3)
       ON CONFLICT (batch_id, code) DO NOTHING`,
      [createCodeId(i), batchId, codes[i]],
    );
    inserted += rowCount ?? 0;
  }
  return inserted;
}

export interface VoucherTarget {
  leadId: string;
  phone: string;
  name: string;
}

export interface VoucherAssignment {
  codeId: string;
  code: string;
  leadId: string;
  phone: string;
  name: string;
}

export interface ClaimResult {
  assignments: VoucherAssignment[];
  /** Penerima yang dilewati karena sudah pernah dapat kode dari batch ini */
  alreadyHave: { leadId: string; name: string; phone: string; code: string }[];
  /** Penerima yang tidak kebagian karena stok kode habis */
  missing: VoucherTarget[];
  availableBefore: number;
}

/**
 * Kunci satu kode untuk tiap penerima dalam satu transaksi.
 *
 * Kode langsung berstatus `assigned` supaya proses lain tidak bisa mengambil
 * kode yang sama. Setelah pengiriman selesai, panggil {@link markVoucherCodesSent}
 * untuk yang berhasil dan {@link releaseVoucherCodes} untuk yang gagal.
 */
export async function claimVoucherCodes(
  batchId: string,
  targets: VoucherTarget[],
  options: { skipAlreadyAssigned?: boolean; allowPartial?: boolean } = {},
): Promise<ClaimResult> {
  const skipAlreadyAssigned = options.skipAlreadyAssigned !== false;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const batch = await client.query(`SELECT id FROM voucher_batches WHERE id = $1`, [
      batchId,
    ]);
    if (!batch.rowCount) {
      throw new Error("Batch voucher tidak ditemukan");
    }

    const { rows: stock } = await client.query<{ available: number }>(
      `SELECT COUNT(*)::int AS available FROM voucher_codes
       WHERE batch_id = $1 AND status = 'available'`,
      [batchId],
    );
    const availableBefore = stock[0]?.available ?? 0;

    const alreadyHave: ClaimResult["alreadyHave"] = [];
    let eligible = targets;

    if (skipAlreadyAssigned) {
      const { rows: existing } = await client.query<{ leadId: string; code: string }>(
        `SELECT lead_id AS "leadId", code FROM voucher_codes
         WHERE batch_id = $1 AND lead_id = ANY($2::text[])
           AND status IN ('assigned', 'sent')`,
        [batchId, targets.map((t) => t.leadId)],
      );
      const takenByLead = new Map(existing.map((r) => [r.leadId, r.code]));
      eligible = [];
      for (const target of targets) {
        const code = takenByLead.get(target.leadId);
        if (code) {
          alreadyHave.push({ ...target, code });
        } else {
          eligible.push(target);
        }
      }
    }

    if (eligible.length === 0) {
      await client.query("COMMIT");
      return { assignments: [], alreadyHave, missing: [], availableBefore };
    }

    // SKIP LOCKED: kalau ada broadcast lain berjalan bersamaan, ambil kode lain
    // daripada saling menunggu.
    const { rows: claimed } = await client.query<{ id: string; code: string }>(
      `UPDATE voucher_codes SET status = 'assigned', assigned_at = NOW()
       WHERE id IN (
         SELECT id FROM voucher_codes
         WHERE batch_id = $1 AND status = 'available'
         ORDER BY created_at, code
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       RETURNING id, code`,
      [batchId, eligible.length],
    );

    if (claimed.length < eligible.length && !options.allowPartial) {
      await client.query("ROLLBACK");
      throw new Error(
        `Kode voucher tidak cukup — tersedia ${claimed.length}, dibutuhkan ${eligible.length}. ` +
          "Tambah kode dulu atau aktifkan opsi kirim sebagian.",
      );
    }

    const assignments: VoucherAssignment[] = [];
    for (let i = 0; i < claimed.length; i += 1) {
      const target = eligible[i];
      await client.query(
        `UPDATE voucher_codes
         SET lead_id = $2, lead_name = $3, lead_phone = $4
         WHERE id = $1`,
        [claimed[i].id, target.leadId, target.name, target.phone],
      );
      assignments.push({
        codeId: claimed[i].id,
        code: claimed[i].code,
        leadId: target.leadId,
        phone: target.phone,
        name: target.name,
      });
    }

    await client.query("COMMIT");
    return {
      assignments,
      alreadyHave,
      missing: eligible.slice(claimed.length),
      availableBefore,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Kode benar-benar terpakai — dikunci permanen ke penerimanya */
export async function markVoucherCodesSent(codeIds: string[], campaignId: string) {
  if (codeIds.length === 0) return;
  await pool.query(
    `UPDATE voucher_codes
     SET status = 'sent', sent_at = NOW(), campaign_id = $2
     WHERE id = ANY($1::text[])`,
    [codeIds, campaignId],
  );
}

/** Pengiriman gagal — kembalikan kode ke stok supaya bisa dipakai ulang */
export async function releaseVoucherCodes(codeIds: string[]) {
  if (codeIds.length === 0) return;
  await pool.query(
    `UPDATE voucher_codes
     SET status = 'available', lead_id = NULL, lead_name = NULL, lead_phone = NULL,
         campaign_id = NULL, assigned_at = NULL, sent_at = NULL
     WHERE id = ANY($1::text[]) AND status <> 'sent'`,
    [codeIds],
  );
}

export function attachVoucherRoute(app: Express) {
  /** Daftar batch beserta ringkasan stoknya */
  app.get("/api/vouchers/batches", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `${BATCH_SELECT} GROUP BY b.id ORDER BY b.created_at DESC`,
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal membaca batch voucher",
      });
    }
  });

  /** Buat batch baru sekaligus import kodenya. Body: { name, note?, codes } */
  app.post("/api/vouchers/batches", requireAdmin, async (req, res) => {
    const { name, note, codes } = req.body as {
      name?: string;
      note?: string;
      codes?: string | string[];
    };
    const batchName = (name ?? "").trim();
    if (!batchName) {
      res.status(400).json({ error: "Nama batch wajib diisi" });
      return;
    }

    const parsed = parseCodes(codes);
    if (parsed.codes.length === 0) {
      res.status(400).json({ error: "Tidak ada kode voucher yang bisa dibaca" });
      return;
    }
    if (parsed.codes.length > MAX_CODES_PER_IMPORT) {
      res.status(400).json({
        error: `Terlalu banyak kode sekaligus (maksimal ${MAX_CODES_PER_IMPORT})`,
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const id = createBatchId();
      await client.query(
        `INSERT INTO voucher_batches (id, name, note) VALUES ($1, $2, $3)`,
        [id, batchName, (note ?? "").trim() || null],
      );
      const inserted = await insertCodes(client, id, parsed.codes);
      await client.query("COMMIT");

      const { rows } = await pool.query(
        `${BATCH_SELECT} WHERE b.id = $1 GROUP BY b.id`,
        [id],
      );
      res.json({
        batch: rows[0],
        imported: inserted,
        duplicates: parsed.duplicates,
        invalid: parsed.invalid,
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal menyimpan batch voucher",
      });
    } finally {
      client.release();
    }
  });

  /** Tambah kode ke batch yang sudah ada. Body: { codes } */
  app.post("/api/vouchers/batches/:id/codes", requireAdmin, async (req, res) => {
    const parsed = parseCodes((req.body as { codes?: string | string[] })?.codes);
    if (parsed.codes.length === 0) {
      res.status(400).json({ error: "Tidak ada kode voucher yang bisa dibaca" });
      return;
    }
    if (parsed.codes.length > MAX_CODES_PER_IMPORT) {
      res.status(400).json({
        error: `Terlalu banyak kode sekaligus (maksimal ${MAX_CODES_PER_IMPORT})`,
      });
      return;
    }

    const client = await pool.connect();
    try {
      const batch = await client.query(`SELECT id FROM voucher_batches WHERE id = $1`, [
        req.params.id,
      ]);
      if (!batch.rowCount) {
        res.status(404).json({ error: "Batch voucher tidak ditemukan" });
        return;
      }

      await client.query("BEGIN");
      const inserted = await insertCodes(client, req.params.id, parsed.codes);
      await client.query("COMMIT");

      const { rows } = await pool.query(
        `${BATCH_SELECT} WHERE b.id = $1 GROUP BY b.id`,
        [req.params.id],
      );
      res.json({
        batch: rows[0],
        imported: inserted,
        // Kode yang sudah ada di batch ini juga terhitung duplikat
        duplicates: [
          ...parsed.duplicates,
          ...Array(parsed.codes.length - inserted).fill("(sudah ada di batch)"),
        ],
        invalid: parsed.invalid,
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal menambah kode voucher",
      });
    } finally {
      client.release();
    }
  });

  /** Detail batch + daftar kodenya. Query: ?status=available|assigned|sent */
  app.get("/api/vouchers/batches/:id", requireAdmin, async (req, res) => {
    try {
      const { rows: batches } = await pool.query(
        `${BATCH_SELECT} WHERE b.id = $1 GROUP BY b.id`,
        [req.params.id],
      );
      if (batches.length === 0) {
        res.status(404).json({ error: "Batch voucher tidak ditemukan" });
        return;
      }

      const status = String(req.query.status ?? "");
      const filtered = ["available", "assigned", "sent"].includes(status);
      const { rows: codes } = await pool.query(
        `${CODE_SELECT} WHERE batch_id = $1 ${filtered ? "AND status = $2" : ""}
         ORDER BY status, created_at, code`,
        filtered ? [req.params.id, status] : [req.params.id],
      );

      res.json({ batch: batches[0], codes });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal membaca batch voucher",
      });
    }
  });

  /** Hapus batch. Batch yang sudah pernah dikirim butuh ?force=1 agar tidak terhapus tidak sengaja. */
  app.delete("/api/vouchers/batches/:id", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query<{ sent: number }>(
        `SELECT COUNT(*) FILTER (WHERE status = 'sent')::int AS sent
         FROM voucher_codes WHERE batch_id = $1`,
        [req.params.id],
      );
      const sent = rows[0]?.sent ?? 0;
      if (sent > 0 && req.query.force !== "1") {
        res.status(409).json({
          error: `Batch ini sudah membagikan ${sent} kode. Hapus paksa untuk melanjutkan.`,
          sentCount: sent,
        });
        return;
      }
      await pool.query(`DELETE FROM voucher_batches WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal menghapus batch",
      });
    }
  });

  /** Hapus satu kode yang belum dibagikan */
  app.delete("/api/vouchers/codes/:id", requireAdmin, async (req, res) => {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM voucher_codes WHERE id = $1 AND status = 'available'`,
        [req.params.id],
      );
      if (!rowCount) {
        res.status(409).json({
          error: "Kode tidak ditemukan atau sudah terpakai — tidak bisa dihapus",
        });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal menghapus kode",
      });
    }
  });

  /**
   * Lepas kode yang nyangkut di status `assigned` — terjadi kalau server mati
   * di tengah pengiriman. Body opsional: { codeIds }
   */
  app.post("/api/vouchers/batches/:id/release", requireAdmin, async (req, res) => {
    try {
      const codeIds = (req.body as { codeIds?: string[] })?.codeIds;
      const { rowCount } = Array.isArray(codeIds) && codeIds.length > 0
        ? await pool.query(
            `UPDATE voucher_codes
             SET status = 'available', lead_id = NULL, lead_name = NULL,
                 lead_phone = NULL, campaign_id = NULL, assigned_at = NULL
             WHERE batch_id = $1 AND status = 'assigned' AND id = ANY($2::text[])`,
            [req.params.id, codeIds],
          )
        : await pool.query(
            `UPDATE voucher_codes
             SET status = 'available', lead_id = NULL, lead_name = NULL,
                 lead_phone = NULL, campaign_id = NULL, assigned_at = NULL
             WHERE batch_id = $1 AND status = 'assigned'`,
            [req.params.id],
          );
      res.json({ released: rowCount ?? 0 });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal melepas kode",
      });
    }
  });

  /** Export CSV: kode mana jatuh ke siapa */
  app.get("/api/vouchers/batches/:id/export", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query<{
        code: string;
        status: string;
        leadName: string | null;
        leadPhone: string | null;
        sentAt: Date | null;
      }>(
        `SELECT code, status, lead_name AS "leadName", lead_phone AS "leadPhone",
                sent_at AS "sentAt"
         FROM voucher_codes WHERE batch_id = $1
         ORDER BY status, created_at, code`,
        [req.params.id],
      );

      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const csv = [
        "kode,status,nama,whatsapp,dikirim_pada",
        ...rows.map((r) =>
          [
            escape(r.code),
            escape(r.status),
            escape(r.leadName ?? ""),
            escape(r.leadPhone ?? ""),
            escape(r.sentAt ? new Date(r.sentAt).toISOString() : ""),
          ].join(","),
        ),
      ].join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="voucher-${req.params.id}.csv"`,
      );
      res.send(`﻿${csv}`);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Gagal export CSV",
      });
    }
  });
}
