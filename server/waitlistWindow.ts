/**
 * Salinan sisi server dari `src/content/waitlistWindow.ts` — server tidak mengimpor
 * dari `src/` (alias `@/` tidak tersedia di runtime tsx). Ubah keduanya bersamaan.
 */
const CAMPAIGN_TZ_OFFSET = "+07:00";
const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Bentuk longgar konten situs — server hanya butuh dua field ini. */
type SiteContentShape = {
  waitlist?: {
    close?: { enabled?: boolean; endsAt?: string; title?: string; message?: string };
  };
  hero?: { showcase?: { countdownEndsAt?: string } };
};

export function parseCampaignDeadline(value: string | null | undefined): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  const normalized = HAS_TIMEZONE.test(raw) ? raw : `${withSeconds}${CAMPAIGN_TZ_OFFSET}`;
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function waitlistDeadline(content: unknown): number | null {
  const c = (content ?? {}) as SiteContentShape;
  const close = c.waitlist?.close;
  if (!close?.enabled) return null;
  return parseCampaignDeadline(close.endsAt || c.hero?.showcase?.countdownEndsAt);
}

/** Pesan penolakan yang dipakai saat pendaftaran sudah ditutup. */
export function waitlistClosedMessage(content: unknown): string {
  const c = (content ?? {}) as SiteContentShape;
  const title = c.waitlist?.close?.title?.trim();
  return title || "Pendaftaran waitlist sudah ditutup";
}

export function isWaitlistClosed(content: unknown, now = Date.now()): boolean {
  const deadline = waitlistDeadline(content);
  return deadline !== null && now >= deadline;
}
