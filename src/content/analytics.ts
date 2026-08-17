/**
 * Pengiriman event ke Google Tag (GA4 / Google Ads).
 *
 * Script gtag disuntik server-side di server/seoHead.ts dan HANYA dimuat kalau
 * "Google Tag ID" diisi di admin. Jadi window.gtag sering tidak ada — di lokal,
 * di staging, atau kalau tracking sengaja dimatikan. Semua fungsi di sini wajib
 * aman (no-op) dalam kondisi itu; tracking tidak boleh menggagalkan alur user.
 *
 * PENTING: jangan pernah kirim data pribadi (nama, nomor WhatsApp) sebagai
 * parameter event — melanggar kebijakan Google dan tidak dibutuhkan untuk
 * mengukur konversi.
 */

type GtagFn = (command: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

/** Kirim satu event GA4. Diam saja kalau tag tidak terpasang. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
  } catch {
    /* jangan sampai error tracking mengganggu halaman */
  }
}

/**
 * Konversi utama landing page: satu pendaftar waitlist baru.
 * `generate_lead` adalah recommended event GA4, jadi otomatis dikenali
 * sebagai konversi di GA4 & bisa diimpor ke Google Ads.
 */
export function trackWaitlistSignup(totalSignups?: number): void {
  trackEvent("generate_lead", {
    method: "waitlist_whatsapp",
    ...(typeof totalSignups === "number" && totalSignups > 0
      ? { waitlist_size: totalSignups }
      : {}),
  });
}
