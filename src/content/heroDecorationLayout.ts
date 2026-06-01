import type { HeroDecoration } from "./types";

export type DecorationViewport = "desktop" | "mobile";

export type DecorationLayout = {
  x: number;
  y: number;
  width: number;
  rotation: number;
};

const MOBILE_WIDTH_SCALE = 0.52;

export function getDecorationLayout(
  d: HeroDecoration,
  viewport: DecorationViewport,
): DecorationLayout {
  if (viewport === "mobile" && d.mobile) {
    return {
      x: d.mobile.x,
      y: d.mobile.y,
      width: d.mobile.width,
      rotation: d.mobile.rotation ?? d.rotation,
    };
  }

  const base = {
    x: d.x,
    y: d.y,
    width: d.width,
    rotation: d.rotation,
  };

  if (viewport === "mobile") {
    return {
      ...base,
      width: Math.round(d.width * MOBILE_WIDTH_SCALE),
    };
  }

  return base;
}

export function ensureMobileLayout(d: HeroDecoration): HeroDecoration {
  if (d.mobile) return d;
  const scaled = getDecorationLayout(d, "mobile");
  return {
    ...d,
    mobile: {
      x: scaled.x,
      y: scaled.y,
      width: scaled.width,
      rotation: scaled.rotation,
    },
  };
}

export function patchDecorationLayout(
  d: HeroDecoration,
  viewport: DecorationViewport,
  patch: Partial<DecorationLayout>,
): HeroDecoration {
  if (viewport === "mobile") {
    const withMobile = ensureMobileLayout(d);
    const current = getDecorationLayout(withMobile, "mobile");
    const next = { ...current, ...patch };
    return {
      ...withMobile,
      mobile: {
        x: next.x,
        y: next.y,
        width: next.width,
        rotation: next.rotation,
      },
    };
  }

  return { ...d, ...patch };
}

export function copyDesktopToMobile(d: HeroDecoration): HeroDecoration {
  const scaled = getDecorationLayout(d, "mobile");
  return {
    ...d,
    mobile: {
      x: scaled.x,
      y: scaled.y,
      width: scaled.width,
      rotation: scaled.rotation,
    },
  };
}
