import type { LandingContent } from "./types";
import { defaultContent } from "./defaultContent";

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

export async function loadFromServer(): Promise<LandingContent | null> {
  try {
    const res = await fetch("/api/content");
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
  return {
    ...content,
    nav: {
      ...content.nav,
      brandLogoUrl: content.nav.brandLogoUrl ?? "",
    },
    story: {
      ...content.story,
      sideImageUrl: content.story.sideImageUrl ?? "",
    },
    scents: {
      ...content.scents,
      cards: content.scents.cards.map((card) => ({
        ...card,
        imageUrl: card.imageUrl ?? "",
      })),
    },
  };
}

export async function loadContent(): Promise<LandingContent> {
  const fromServer = await loadFromServer();
  if (fromServer) return normalizeContent(fromServer);

  const cached = loadFromStorage();
  if (cached) return normalizeContent(cached);

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
