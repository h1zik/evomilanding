/**
 * Integrasi Fonnte (WhatsApp gateway) — https://docs.fonnte.com
 *
 * Token diambil dari env FONNTE_TOKEN (token device, bukan token akun).
 */

const FONNTE_SEND_URL = "https://api.fonnte.com/send";
const FONNTE_DEVICE_URL = "https://api.fonnte.com/device";

/** Fonnte membatasi jumlah target per request — kirim per batch agar aman */
export const TARGETS_PER_REQUEST = 50;

export function getFonnteToken(): string | null {
  const token = process.env.FONNTE_TOKEN?.trim();
  return token ? token : null;
}

/**
 * Normalisasi nomor ke format internasional tanpa "+" (contoh: 6281234567890).
 * Menerima "0812...", "812...", "62812...", "+62 812-3456-7890".
 * Mengembalikan null kalau nomor tidak masuk akal.
 */
export function normalizePhone(raw: string): string | null {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("620")) digits = `62${digits.slice(3)}`;
  else if (digits.startsWith("62")) {
    /* sudah format internasional */
  } else if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  else return null;

  // 62 + 9..13 digit nomor lokal
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/** Nama dipakai untuk variabel {name} Fonnte — "|" & "," adalah delimiter target */
function sanitizeName(name: string): string {
  const clean = (name ?? "").replace(/[|,\r\n]/g, " ").trim();
  return clean || "Kak";
}

/** Isi variabel tidak boleh memakai delimiter target Fonnte ("|" & ",") */
function sanitizeVar(value: string): string {
  return (value ?? "").replace(/[|,\r\n]/g, " ").trim();
}

/**
 * Alias yang ramah admin untuk {var1}. Fonnte sendiri hanya mengenal
 * {name} dan {var1}..{varN}, jadi alias diterjemahkan sebelum request dikirim.
 */
export const VOUCHER_PLACEHOLDER = /\{\s*(voucher|kode|kupon)\s*\}/gi;

/** Regex di atas global — pakai helper ini supaya `lastIndex` tidak bocor antar pemanggilan */
export function hasVoucherPlaceholder(message: string): boolean {
  VOUCHER_PLACEHOLDER.lastIndex = 0;
  return VOUCHER_PLACEHOLDER.test(message);
}

export interface BroadcastTarget {
  phone: string;
  name: string;
  /** Nilai per-penerima untuk {var1}, {var2}, ... — dipakai untuk kode voucher */
  vars?: string[];
}

export interface FonnteSendResult {
  ok: boolean;
  /** Nomor yang diterima Fonnte untuk diproses */
  accepted: string[];
  /** Nomor yang ditolak Fonnte (tidak terdaftar WhatsApp / invalid) */
  rejected: string[];
  detail: string;
}

interface FonnteRawResponse {
  status?: boolean;
  detail?: string;
  reason?: string;
  id?: unknown[];
  process?: string;
  target?: string[];
  invalid?: string[];
  requestid?: number;
}

/**
 * Kirim satu batch pesan.
 * `message` boleh memakai placeholder {name} — Fonnte mengisinya dari nama target.
 */
async function sendBatch(
  token: string,
  targets: BroadcastTarget[],
  message: string,
  options: { imageUrl?: string; delay?: string },
): Promise<FonnteSendResult> {
  // Format target Fonnte: nomor|nama|var1|var2 — antar penerima dipisah koma
  const targetParam = targets
    .map((t) =>
      [t.phone, sanitizeName(t.name), ...(t.vars ?? []).map(sanitizeVar)].join("|"),
    )
    .join(",");

  const body: Record<string, string> = {
    target: targetParam,
    // Fonnte hanya mengenal {name} & {varN} — alias admin disamakan di sini
    message: message
      .replace(/\{nama\}/gi, "{name}")
      .replace(VOUCHER_PLACEHOLDER, "{var1}"),
    countryCode: "62",
    delay: options.delay?.trim() || "2-10",
  };
  if (options.imageUrl?.trim()) body.url = options.imageUrl.trim();

  const res = await fetch(FONNTE_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: FonnteRawResponse;
  try {
    json = JSON.parse(text) as FonnteRawResponse;
  } catch {
    return {
      ok: false,
      accepted: [],
      rejected: targets.map((t) => t.phone),
      detail: `Respons Fonnte tidak valid (HTTP ${res.status}): ${text.slice(0, 200)}`,
    };
  }

  if (!res.ok || json.status === false) {
    return {
      ok: false,
      accepted: [],
      rejected: targets.map((t) => t.phone),
      detail: json.reason || json.detail || `Fonnte menolak request (HTTP ${res.status})`,
    };
  }

  const rejected = (json.invalid ?? []).map(String);
  const rejectedSet = new Set(rejected);
  const accepted = targets.map((t) => t.phone).filter((p) => !rejectedSet.has(p));

  return {
    ok: true,
    accepted,
    rejected,
    detail: json.detail ?? "Terkirim ke antrian Fonnte",
  };
}

export interface BroadcastSummary {
  success: string[];
  failed: { phone: string; reason: string }[];
  details: string[];
}

/** Kirim ke semua target, dipecah per batch. Batch yang gagal tidak menghentikan sisanya. */
export async function sendBroadcast(
  token: string,
  targets: BroadcastTarget[],
  message: string,
  options: { imageUrl?: string; delay?: string } = {},
): Promise<BroadcastSummary> {
  const summary: BroadcastSummary = { success: [], failed: [], details: [] };

  for (let i = 0; i < targets.length; i += TARGETS_PER_REQUEST) {
    const batch = targets.slice(i, i + TARGETS_PER_REQUEST);
    try {
      const result = await sendBatch(token, batch, message, options);
      summary.success.push(...result.accepted);
      summary.failed.push(
        ...result.rejected.map((phone) => ({
          phone,
          reason: result.ok ? "Nomor tidak terdaftar di WhatsApp" : result.detail,
        })),
      );
      summary.details.push(result.detail);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Gagal menghubungi Fonnte";
      summary.failed.push(...batch.map((t) => ({ phone: t.phone, reason })));
      summary.details.push(reason);
    }
  }

  return summary;
}

export interface FonnteDeviceInfo {
  device?: string;
  name?: string;
  status?: string;
  quota?: string | number;
  messages?: string | number;
  expired?: string;
}

/** `status` bisa berupa string (state device) atau false (request ditolak) */
interface FonnteDeviceRaw {
  device?: string;
  name?: string;
  status?: unknown;
  quota?: string | number;
  messages?: string | number;
  expired?: string;
  reason?: string;
}

/** Cek status device (nomor WA yang terhubung + sisa kuota) */
export async function getDeviceInfo(token: string): Promise<FonnteDeviceInfo> {
  const res = await fetch(FONNTE_DEVICE_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  let json: FonnteDeviceRaw | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Respons Fonnte tidak valid (HTTP ${res.status})`);
  }

  if (!res.ok || json?.status === false) {
    throw new Error(json?.reason || `Gagal membaca device (HTTP ${res.status})`);
  }

  return {
    device: json?.device,
    name: json?.name,
    status: typeof json?.status === "string" ? json.status : undefined,
    quota: json?.quota,
    messages: json?.messages,
    expired: json?.expired,
  };
}
