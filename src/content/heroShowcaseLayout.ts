import type { HeroShowcase, HeroShowcaseMobile } from "./types";

export type ShowcaseImageView = {
  imageOffsetX: number;
  imageOffsetY: number;
  imageScale: number;
  imageFit: "cover" | "contain";
  frameRatio: number;
};

export const DEFAULT_FRAME_RATIO = 2.9;
/** Frame desktop terlalu pipih di layar kecil — batasi rasionya saat mode otomatis. */
export const MAX_AUTO_MOBILE_RATIO = 1.7;

export function getDesktopRatio(showcase: HeroShowcase): number {
  return showcase.frameRatio > 0 ? showcase.frameRatio : DEFAULT_FRAME_RATIO;
}

/** Rasio frame mobile saat override rasio dibiarkan otomatis (0). */
export function autoMobileRatio(showcase: HeroShowcase): number {
  return Math.min(getDesktopRatio(showcase), MAX_AUTO_MOBILE_RATIO);
}

/** Nilai gambar yang benar-benar dipakai di layar HP (< md). */
export function resolveShowcaseMobileView(showcase: HeroShowcase): ShowcaseImageView {
  const mobile = showcase.mobile;
  const auto = autoMobileRatio(showcase);

  if (!mobile?.enabled) {
    return {
      imageOffsetX: showcase.imageOffsetX,
      imageOffsetY: showcase.imageOffsetY,
      imageScale: showcase.imageScale,
      imageFit: showcase.imageFit,
      frameRatio: auto,
    };
  }

  return {
    imageOffsetX: mobile.imageOffsetX,
    imageOffsetY: mobile.imageOffsetY,
    imageScale: mobile.imageScale,
    imageFit: mobile.imageFit,
    frameRatio: mobile.frameRatio > 0 ? mobile.frameRatio : auto,
  };
}

/** Nilai awal override mobile: salin dari pengaturan desktop supaya tidak melompat. */
export function showcaseMobileFromDesktop(showcase: HeroShowcase): HeroShowcaseMobile {
  return {
    enabled: true,
    imageOffsetX: showcase.imageOffsetX,
    imageOffsetY: showcase.imageOffsetY,
    imageScale: showcase.imageScale,
    imageFit: showcase.imageFit,
    frameRatio: autoMobileRatio(showcase),
  };
}
