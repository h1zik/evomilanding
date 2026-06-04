import type { Express, Request, Response } from "express";

/** Situs kedua yang ditampilkan di /official (URL browser tetap evomi.id/official) */
export function getOfficialSiteUrl(): string {
  const raw = process.env.OFFICIAL_SITE_URL?.trim() || "https://evomoy.netlify.app";
  return raw.replace(/\/$/, "");
}

function officialEmbedHtml(targetUrl: string): string {
  const safeTarget = targetUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Evomi Official</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    iframe { border: 0; display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <iframe
    src="${safeTarget}"
    title="Evomi Official"
    allow="fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture"
    referrerpolicy="no-referrer-when-downgrade"
  ></iframe>
</body>
</html>`;
}

export function attachOfficialRoute(app: Express): void {
  const target = getOfficialSiteUrl();

  const serve = (_req: Request, res: Response) => {
    res.type("html").send(officialEmbedHtml(target));
  };

  app.get("/official", serve);
  app.get("/official/", serve);

  console.log(`[api] /official → embed ${target} (URL tetap /official)`);
}

/** SPA fallback jangan tangkap /official */
export const SPA_FALLBACK_PATTERN = /^(?!\/api\/|\/uploads\/|\/official(?:\/|$)).*$/;
