/**
 * Inject meta/OG/pixel + konten SEO statis ke dalam index.html sebelum di-serve.
 *
 * KENAPA server-side: konten evomi.id di-render client-side oleh React, jadi HTML
 * mentah yang dilihat crawler & scraper sosial (Facebook/WhatsApp) itu kosong.
 * Meta tag & konten harus disuntik di sini, bukan lewat JS di browser.
 */

type AnyContent = Record<string, any>;

/** Buang markup rich-text (**bold**, [#hex]..[/], <br>, [img:..], [icon:..]) → teks polos. */
export function stripRich(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<br\s*\/?>|\n/gi, " ")
    .replace(/\[img:[^\]|]+(?:\|[^\]]*)?\]/gi, " ")
    .replace(/\[icon:[^\]]*\]/gi, " ")
    .replace(/\[#[0-9A-Fa-f]{3,8}\]([\s\S]*?)\[\/\]/gi, "$1")
    .replace(/\[color:#[0-9A-Fa-f]{3,8}\]([\s\S]*?)\[\/color\]/gi, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Jadikan URL absolut untuk og:image / canonical (butuh URL penuh). */
function absoluteUrl(url: string, origin: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return origin.replace(/\/$/, "") + u;
  return origin.replace(/\/$/, "") + "/" + u;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

export interface SeoRequestInfo {
  /** Origin dari request, mis. https://evomi.id (tanpa trailing slash) */
  origin: string;
  /** Path yang diminta, mis. / */
  path: string;
}

/** Bangun tag <head> tambahan dari konten. */
export function buildHeadTags(content: AnyContent, req: SeoRequestInfo): string {
  const site = content?.site ?? {};
  const nav = content?.nav ?? {};

  const brand = stripRich(nav.brandName) || "evomi.id";
  const title = stripRich(site.pageTitle) || brand;
  const description = truncate(
    stripRich(site.metaDescription) || stripRich(content?.hero?.description) || "",
    200,
  );

  const configuredOrigin = (site.siteUrl || "").trim().replace(/\/$/, "");
  const origin = (configuredOrigin || req.origin).replace(/\/$/, "");
  const canonicalUrl = req.path && req.path !== "/" ? origin + req.path : origin + "/";

  const ogImage = absoluteUrl(site.ogImageUrl || "", origin);
  const favicon = (site.faviconUrl || "").trim();
  const robots = site.blockSearchEngines ? "noindex, nofollow" : "index, follow";

  const tags: string[] = [];
  tags.push(`<meta name="robots" content="${robots}" />`);
  if (description) {
    tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  }
  tags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  if (favicon) {
    tags.push(`<link rel="icon" href="${escapeHtml(favicon)}" />`);
    tags.push(`<link rel="apple-touch-icon" href="${escapeHtml(favicon)}" />`);
  }

  // Open Graph (Facebook, Instagram, WhatsApp)
  tags.push(`<meta property="og:type" content="website" />`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(brand)}" />`);
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  if (description) {
    tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  }
  tags.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  tags.push(`<meta property="og:locale" content="id_ID" />`);
  if (ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(title)}" />`);
  }

  // Twitter Card
  tags.push(
    `<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />`,
  );
  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  if (description) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  }
  if (ogImage) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  }

  // JSON-LD structured data
  const scents = Array.isArray(content?.scents?.cards) ? content.scents.cards : [];
  const jsonLd: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brand,
      url: origin + "/",
      ...(ogImage ? { logo: ogImage, image: ogImage } : {}),
      ...(description ? { description } : {}),
    },
  ];
  if (scents.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: stripRich(content?.scents?.title) || "Koleksi Aroma EVOMI",
      itemListElement: scents.slice(0, 12).map((s: AnyContent, i: number) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: stripRich(s?.name),
          ...(stripRich(s?.desc) ? { description: stripRich(s.desc) } : {}),
          brand: { "@type": "Brand", name: brand },
          ...(s?.imageUrl ? { image: absoluteUrl(s.imageUrl, origin) } : {}),
        },
      })),
    });
  }
  for (const block of jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, "\\u003c")}</script>`,
    );
  }

  // Meta Pixel (Facebook/Instagram Ads)
  const pixelId = (site.metaPixelId || "").trim();
  if (pixelId) {
    const safeId = pixelId.replace(/[^0-9]/g, "");
    if (safeId) {
      tags.push(`<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${safeId}');fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${safeId}&ev=PageView&noscript=1"/></noscript>`);
    }
  }

  // Google Tag (Google Ads / GA4)
  const gtagId = (site.googleTagId || "").trim();
  if (gtagId && /^[A-Za-z0-9-]+$/.test(gtagId)) {
    tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${gtagId}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gtagId}');
</script>`);
  }

  return "\n      " + tags.join("\n      ") + "\n    ";
}

/**
 * Konten SEO statis di dalam #root — crawler & tools non-JS melihat H1 + teks nyata.
 * React mengganti isi #root saat JS load, jadi user asli tetap melihat React biasa.
 */
export function buildBodyContent(content: AnyContent): string {
  const hero = content?.hero ?? {};
  const scents = content?.scents ?? {};
  const story = content?.story ?? {};
  const nav = content?.nav ?? {};

  const brand = stripRich(nav.brandName) || "evomi.id";
  const h1 = stripRich(hero.title) || `${brand} — Join the Waitlist`;
  const paragraphs: string[] = [];

  const sub1 = stripRich(hero.subtitleLine1);
  const sub2 = stripRich(hero.subtitleLine2);
  const lead = [sub1, sub2].filter(Boolean).join(" ");
  if (lead) paragraphs.push(lead);

  const desc = stripRich(hero.description);
  if (desc) paragraphs.push(desc);

  const storyTitle = [
    stripRich(story.titlePart1),
    stripRich(story.titleHighlight1),
    stripRich(story.titlePart2),
    stripRich(story.titleHighlight2),
    stripRich(story.titlePart3),
  ]
    .filter(Boolean)
    .join(" ");

  const storyCards = Array.isArray(story.cards) ? story.cards : [];
  const storyText = storyCards
    .map((c: AnyContent) => `${stripRich(c?.title)}: ${stripRich(c?.body)}`.trim())
    .filter((s: string) => s.length > 2);

  const scentCards = Array.isArray(scents.cards) ? scents.cards : [];

  const parts: string[] = [];
  parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  for (const p of paragraphs) parts.push(`<p>${escapeHtml(p)}</p>`);

  if (storyTitle) parts.push(`<h2>${escapeHtml(storyTitle)}</h2>`);
  for (const s of storyText) parts.push(`<p>${escapeHtml(s)}</p>`);

  if (scentCards.length > 0) {
    parts.push(`<h2>${escapeHtml(stripRich(scents.title) || "Koleksi Aroma")}</h2>`);
    const descLine = stripRich(scents.description);
    if (descLine) parts.push(`<p>${escapeHtml(descLine)}</p>`);
    const items = scentCards
      .map((s: AnyContent) => {
        const name = escapeHtml(stripRich(s?.name));
        const sub = escapeHtml(stripRich(s?.sub));
        const d = escapeHtml(stripRich(s?.desc));
        return `<li><strong>${name}${sub ? ` (${sub})` : ""}</strong> — ${d}</li>`;
      })
      .join("");
    parts.push(`<ul>${items}</ul>`);
  }

  // Disembunyikan visual tapi tetap ada di DOM & terbaca crawler; React menimpanya saat load.
  return `<div id="seo-content" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${parts.join(
    "",
  )}</div>`;
}

/** Transformasi index.html: buang tag statis lama, suntik meta dinamis + konten SEO. */
export function injectSeo(html: string, content: AnyContent, req: SeoRequestInfo): string {
  const site = content?.site ?? {};
  const nav = content?.nav ?? {};
  const title = escapeHtml(stripRich(site.pageTitle) || stripRich(nav.brandName) || "evomi.id");

  let out = html;

  // Ganti <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  // Buang meta description & robots statis (akan diganti versi dinamis)
  out = out.replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, "");
  out = out.replace(/\s*<meta\s+name=["']robots["'][^>]*>/gi, "");

  // Suntik head tags sebelum </head>
  const headTags = buildHeadTags(content, req);
  out = out.replace(/<\/head>/i, `${headTags}</head>`);

  // Suntik konten SEO di dalam #root
  const body = buildBodyContent(content);
  out = out.replace(
    /(<div\s+id=["']root["']\s*>)(\s*)(<\/div>)/i,
    `$1${body}$3`,
  );

  return out;
}
