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
  createdAt: string;
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
}

export interface SendBroadcastResult {
  campaign?: BroadcastCampaign;
  invalidSkipped?: number;
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

/** Preview pesan seperti yang diterima penerima — {name}/{nama} diganti nama contoh */
export function renderPreview(message: string, name: string): string {
  return message.replace(/\{(name|nama)\}/gi, name);
}
