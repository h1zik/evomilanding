import { getAdminToken } from "@/app/admin/AdminLogin";

export type VoucherStatus = "available" | "assigned" | "sent";

export interface VoucherBatch {
  id: string;
  name: string;
  note: string | null;
  createdAt: string;
  totalCount: number;
  availableCount: number;
  assignedCount: number;
  sentCount: number;
}

export interface VoucherCode {
  id: string;
  code: string;
  status: VoucherStatus;
  leadId: string | null;
  leadName: string | null;
  leadPhone: string | null;
  campaignId: string | null;
  assignedAt: string | null;
  sentAt: string | null;
}

export interface ImportResult {
  batch: VoucherBatch;
  imported: number;
  duplicates: string[];
  invalid: string[];
}

function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-admin-password": getAdminToken(),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: adminHeaders() });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request gagal (HTTP ${res.status})`);
  }
  return data;
}

export function fetchVoucherBatches() {
  return request<VoucherBatch[]>("/api/vouchers/batches");
}

export function fetchVoucherBatch(id: string, status?: VoucherStatus) {
  const query = status ? `?status=${status}` : "";
  return request<{ batch: VoucherBatch; codes: VoucherCode[] }>(
    `/api/vouchers/batches/${id}${query}`,
  );
}

export function createVoucherBatch(payload: {
  name: string;
  note?: string;
  codes: string;
}) {
  return request<ImportResult>("/api/vouchers/batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addVoucherCodes(batchId: string, codes: string) {
  return request<ImportResult>(`/api/vouchers/batches/${batchId}/codes`, {
    method: "POST",
    body: JSON.stringify({ codes }),
  });
}

export function deleteVoucherBatch(batchId: string, force = false) {
  return request<{ ok: true }>(
    `/api/vouchers/batches/${batchId}${force ? "?force=1" : ""}`,
    { method: "DELETE" },
  );
}

export function deleteVoucherCode(codeId: string) {
  return request<{ ok: true }>(`/api/vouchers/codes/${codeId}`, {
    method: "DELETE",
  });
}

/** Kembalikan kode yang nyangkut di status "assigned" ke stok */
export function releaseStuckCodes(batchId: string) {
  return request<{ released: number }>(`/api/vouchers/batches/${batchId}/release`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** Unduh CSV lewat fetch karena endpoint butuh header password admin */
export async function downloadVoucherCsv(batch: VoucherBatch) {
  const res = await fetch(`/api/vouchers/batches/${batch.id}/export`, {
    headers: adminHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Export gagal (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `voucher-${batch.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Hitung berapa kode yang bisa dibaca dari textarea — untuk preview sebelum submit */
export function countCodes(raw: string): number {
  const seen = new Set<string>();
  for (const item of raw.split(/[\r\n,;\t]+/)) {
    const code = item.trim();
    if (code) seen.add(code.toLowerCase());
  }
  return seen.size;
}
