import type { HeroDecoration, HeroHighlight, HeroMascot, LandingContent } from "./types";
import { defaultContent } from "./defaultContent";

function resolveHeroTitle(hero: LandingContent["hero"]): string {
  if (hero.title?.trim()) return hero.title.trim();
  const line1 = hero.titleLine1?.trim() ?? "";
  const highlight = hero.titleHighlight?.trim() ?? "";
  const line2 = hero.titleLine2?.trim() ?? "";
  const colored = highlight ? `[#1172ba]${highlight}[/]` : "";
  const secondLine = [colored, line2].filter(Boolean).join(" ");
  if (line1 && secondLine) return `${line1}<br>${secondLine}`;
  return line1 || secondLine || defaultContent.hero.title;
}

function mascotsFromScents(content: LandingContent): HeroMascot[] {
  return content.scents.cards.map((card) => ({
    id: card.id,
    name: card.name,
    nameColor: card.color ?? "#000000",
    sub: card.sub,
    subColor: card.color ?? "#000000",
    imageUrl: card.imageUrl ?? "",
  }));
}

function normalizeMascot(m: HeroMascot, index: number, content: LandingContent): HeroMascot {
  const def = defaultContent.hero.mascots[index];
  const scent = content.scents.cards.find((c) => c.id === m.id);
  return {
    ...m,
    imageUrl: m.imageUrl ?? "",
    nameColor: m.nameColor ?? def?.nameColor ?? scent?.color ?? "#000000",
    subColor: m.subColor ?? def?.subColor ?? scent?.color ?? "#000000",
  };
}

function defaultHighlights(): HeroHighlight[] {
  return defaultContent.hero.highlights;
}

function defaultDecorations(): HeroDecoration[] {
  return defaultContent.hero.decorations;
}

const STORAGE_KEY = "evomi-landing-content";

/** Cache lokal — cadangan saja, sumber utama adalah PostgreSQL */
export function saveToStorage(content: LandingContent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch {
    /* ignore quota errors */
  }
}

export function loadFromStorage(): LandingContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LandingContent;
  } catch {
    return null;
  }
}

const FETCH_TIMEOUT_MS = 8_000;

export async function loadFromServer(): Promise<LandingContent | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch("/api/content", { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as LandingContent;
    saveToStorage(data);
    return data;
  } catch {
    return null;
  }
}

export async function saveToServer(content: LandingContent): Promise<boolean> {
  try {
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (res.ok) {
      saveToStorage(content);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function normalizeContent(content: LandingContent): LandingContent {
  const hero = { ...defaultContent.hero, ...(content.hero ?? {}) };
  const story = { ...defaultContent.story, ...(content.story ?? {}) };
  const scents = {
    ...defaultContent.scents,
    ...(content.scents ?? {}),
    cards: content.scents?.cards ?? defaultContent.scents.cards,
  };

  return {
    ...defaultContent,
    ...content,
    nav: {
      ...defaultContent.nav,
      ...(content.nav ?? {}),
      brandLogoUrl: content.nav?.brandLogoUrl ?? "",
      brandName: content.nav?.brandName ?? defaultContent.nav.brandName,
    },
    story: {
      ...story,
      sideImageUrl: story.sideImageUrl ?? "",
      titleHighlight1Color:
        story.titleHighlight1Color ?? defaultContent.story.titleHighlight1Color,
      titleHighlight2Color:
        story.titleHighlight2Color ?? defaultContent.story.titleHighlight2Color,
      cards: (story.cards ?? []).map((card, i) => ({
        ...card,
        titleColor:
          card.titleColor ?? defaultContent.story.cards[i]?.titleColor ?? "#1172ba",
      })),
    },
    scents: {
      ...scents,
      cards: scents.cards.map((card, i) => {
        const def = defaultContent.scents.cards[i];
        return {
          ...card,
          imageUrl: card.imageUrl ?? "",
          stickerImageUrl: card.stickerImageUrl ?? "",
          nameColor: card.nameColor ?? def?.nameColor ?? "#000000",
          subColor: card.subColor ?? def?.subColor ?? card.color ?? "#1172ba",
          vibeColor: card.vibeColor ?? def?.vibeColor ?? "#4a4a4a",
          descColor: card.descColor ?? def?.descColor ?? "#333333",
          stickerColor: card.stickerColor ?? def?.stickerColor ?? "#FFD521",
          soft: card.soft ?? def?.soft ?? "#ffffff",
        };
      }),
    },
    hero: {
      ...hero,
      title: resolveHeroTitle(hero),
      mascots:
        hero.mascots && hero.mascots.length > 0
          ? hero.mascots.map((m, i) => normalizeMascot(m, i, { ...content, scents }))
          : mascotsFromScents({ ...content, scents }),
      decorations: (hero.decorations ?? defaultDecorations()).map((d) => ({
        id: d.id,
        imageUrl: d.imageUrl ?? "",
        x: typeof d.x === "number" ? d.x : 50,
        y: typeof d.y === "number" ? d.y : 50,
        width: typeof d.width === "number" ? d.width : 120,
        rotation: typeof d.rotation === "number" ? d.rotation : 0,
        zIndex: typeof d.zIndex === "number" ? d.zIndex : 1,
        mobile: d.mobile
          ? {
              x: typeof d.mobile.x === "number" ? d.mobile.x : d.x,
              y: typeof d.mobile.y === "number" ? d.mobile.y : d.y,
              width: typeof d.mobile.width === "number" ? d.mobile.width : 80,
              rotation:
                typeof d.mobile.rotation === "number" ? d.mobile.rotation : d.rotation,
            }
          : undefined,
      })),
      highlights:
        hero.highlights != null
          ? hero.highlights.map((h) => ({
              ...h,
              imageUrl: h.imageUrl ?? "",
              alt: h.alt ?? "",
            }))
          : defaultHighlights(),
    },
  };
}

export async function loadContent(): Promise<LandingContent> {
  try {
    const fromServer = await loadFromServer();
    if (fromServer) return normalizeContent(fromServer);

    const cached = loadFromStorage();
    if (cached) return normalizeContent(cached);
  } catch {
    /* data rusak atau normalize gagal — pakai default */
  }

  return defaultContent;
}

export function exportContent(content: LandingContent): void {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "content.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}
