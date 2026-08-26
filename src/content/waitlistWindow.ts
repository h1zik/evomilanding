import type { LandingContent } from "./types";

/**
 * Zona waktu kampanye. Nilai `datetime-local` dari admin (mis. "2026-09-01T00:00")
 * tidak menyimpan offset, jadi kita kunci ke WIB supaya pengunjung di zona waktu
 * mana pun — dan server — memakai batas waktu yang persis sama.
 *
 * Logika file ini digandakan di `server/waitlistWindow.ts` (server tidak mengimpor
 * dari `src/`). Ubah keduanya bersamaan.
 */
export const CAMPAIGN_TZ_OFFSET = "+07:00";

const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Ubah nilai datetime-local jadi epoch ms. Kosong / tidak valid = null. */
export function parseCampaignDeadline(value: string | null | undefined): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  const normalized = HAS_TIMEZONE.test(raw) ? raw : `${withSeconds}${CAMPAIGN_TZ_OFFSET}`;
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Batas waktu pendaftaran waitlist. null = tidak pernah ditutup otomatis.
 * `close.endsAt` kosong berarti ikut hitung mundur di hero.
 */
export function waitlistDeadline(content: LandingContent): number | null {
  const close = content.waitlist?.close;
  if (!close?.enabled) return null;
  return parseCampaignDeadline(close.endsAt || content.hero?.showcase?.countdownEndsAt);
}

/** Apakah pendaftaran sudah lewat batas waktu. */
export function isWaitlistClosed(content: LandingContent, now = Date.now()): boolean {
  const deadline = waitlistDeadline(content);
  return deadline !== null && now >= deadline;
}
