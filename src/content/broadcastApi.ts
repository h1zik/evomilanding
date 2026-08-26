import { getAdminToken } from "@/app/admin/AdminLogin";

export interface BroadcastFailure {
  phone: string;
  reason: string;
}

export interface BroadcastCampaign {
  id: string;
  message: string;
  imageUrl: string | null;
  targetCount: number;
  successCount: number;
  failedCount: number;
  status: "sent" | "partial" | "failed";
  detail: string | null;
  failures: BroadcastFailure[];
  /** Batch voucher yang kodenya ikut dikirim di broadcast ini */
  voucherBatchId: string | null;
  createdAt: string;
}

export interface VoucherReport {
  batchId: string;
  /** Kode yang dikunci untuk broadcast ini */
  assigned: number;
  /** Penerima yang dilewati karena sudah pernah dapat kode dari batch ini */
  alreadyHave: number;
  /** Penerima yang tidak kebagian karena stok habis */
  missing: number;
  sent: number;
  /** Kode yang dikembalikan ke stok karena pengiriman gagal */
  released: number;
}

export interface FonnteStatus {
  configured: boolean;
  device?: {
    device?: string;
    name?: string;
    status?: string;
    quota?: string | number;
    messages?: string | number;
    expired?: string;
  } | null;
  message?: string;
}

export interface RecipientSummary {
  total: number;
  valid: number;
  invalid: { id: string; name: string; whatsapp: string }[];
}

export interface SendBroadcastPayload {
  message: string;
  imageUrl?: string;
  delay?: string;
  /** null = kirim ke semua pendaftar */
  recipientIds?: string[] | null;
  /** Kalau diisi, hanya kirim ke nomor ini (mode tes) */
  testNumber?: string;
  /** Kalau diisi, tiap penerima dapat satu kode unik dari batch ini */
  voucherBatchId?: string | null;
  /** Stok kode kurang dari jumlah penerima → tetap kirim ke sebagian */
  allowPartialVoucher?: boolean;
  /** Lewati pendaftar yang sudah pernah dapat kode dari batch ini (default: ya) */
  skipAlreadyAssigned?: boolean;
}

export interface SendBroadcastResult {
  campaign?: BroadcastCampaign;
  invalidSkipped?: number;
  voucher?: VoucherReport | null;
  test?: boolean;
  success?: number;
  failed?: number;
  detail?: string;
  failures?: BroadcastFailure[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": getAdminToken(),
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request gagal (HTTP ${res.status})`);
  }
  return data;
}

export function fetchFonnteStatus() {
  return request<FonnteStatus>("/api/broadcast/status");
}

export function fetchRecipientSummary() {
  return request<RecipientSummary>("/api/broadcast/recipients");
}

export function fetchBroadcastHistory(limit = 20) {
  return request<BroadcastCampaign[]>(`/api/broadcast/history?limit=${limit}`);
}

export function sendBroadcast(payload: SendBroadcastPayload) {
  return request<SendBroadcastResult>("/api/broadcast", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Placeholder yang server terjemahkan jadi kode voucher milik tiap penerima */
export const VOUCHER_TOKEN = "{voucher}";

const VOUCHER_PLACEHOLDER = /\{\s*(voucher|kode|kupon)\s*\}/gi;

export function hasVoucherPlaceholder(message: string): boolean {
  VOUCHER_PLACEHOLDER.lastIndex = 0;
  return VOUCHER_PLACEHOLDER.test(message);
}

/**
 * Preview pesan seperti yang diterima penerima — {name}/{nama} diganti nama
 * contoh, {voucher} diganti kode contoh.
 */
export function renderPreview(
  message: string,
  name: string,
  voucherCode = "EVOMI-XXXX-XXXX",
): string {
  return message
    .replace(/\{(name|nama)\}/gi, name)
    .replace(VOUCHER_PLACEHOLDER, voucherCode);
}
