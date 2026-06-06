export type StoryIcon = "heart" | "leaf" | "sparkles";

export type CounterAvatarIconType = "star" | "dot" | "heart" | "sparkles" | "leaf" | "flame";

/** Ikon overlap di kiri angka live counter */
export interface CounterAvatar {
  id: string;
  icon: CounterAvatarIconType;
  bgColor: string;
  iconColor: string;
  /** Jika diisi, gambar menggantikan ikon preset */
  imageUrl: string;
}

export interface MarqueeItem {
  id: string;
  text: string;
  color?: string;
}

export interface StoryCard {
  id: string;
  icon: StoryIcon;
  title: string;
  titleColor: string;
  body: string;
  bg: string;
}

export interface ScentCard {
  id: string;
  name: string;
  sub: string;
  /** Latar area gambar/emoji (atas) */
  color: string;
  /** Latar area teks (bawah) */
  soft: string;
  nameColor: string;
  subColor: string;
  vibeColor: string;
  descColor: string;
  emoji: string;
  imageUrl: string;
  /** Gambar pojok kanan bawah (ganti bintang berputar) */
  stickerImageUrl: string;
  /** Warna bintang jika sticker kosong */
  stickerColor: string;
  vibe: string;
  desc: string;
}

export interface TestimonialCard {
  id: string;
  who: string;
  color: string;
  text: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
}

/** Maskot di hero (baris karakter di bawah deskripsi) */
export interface HeroMascot {
  id: string;
  name: string;
  nameColor: string;
  sub: string;
  subColor: string;
  imageUrl: string;
}

/** Layout dekor hero khusus tampilan mobile (< md) */
export interface HeroDecorationMobile {
  x: number;
  y: number;
  width: number;
  rotation?: number;
}

/** Gambar dekoratif hero — posisi dalam persen area hero */
export interface HeroDecoration {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  zIndex: number;
  /** Override posisi/ukuran di mobile; kosong = skala otomatis dari desktop */
  mobile?: HeroDecorationMobile;
}

/** Strip gambar di bawah CTA hero (mis. recycle / kampanye) */
export interface HeroHighlight {
  id: string;
  imageUrl: string;
  alt: string;
}

export interface LandingContent {
  nav: {
    brandName: string;
    brandLogoUrl: string;
  };
  hero: {
    counterLabel: string;
    counterSuffix: string;
    counterStart: number;
    /** Ikon overlap di kiri angka counter */
    counterAvatars: CounterAvatar[];
    /** Judul utama — mendukung <br>, [#hex]teks[/], **bold** */
    title: string;
    /** @deprecated Dipakai hanya jika `title` kosong (migrasi data lama) */
    titleLine1?: string;
    titleHighlight?: string;
    titleLine2?: string;
    /** Baris subjudul pertama (di bawah judul utama) */
    subtitleLine1?: string;
    /** Baris subjudul kedua */
    subtitleLine2?: string;
    description: string;
    ctaText: string;
    mascots: HeroMascot[];
    decorations: HeroDecoration[];
    highlights: HeroHighlight[];
  };
  marquee: MarqueeItem[];
  story: {
    badge: string;
    titlePart1: string;
    titleHighlight1: string;
    titleHighlight1Color: string;
    titlePart2: string;
    titleHighlight2: string;
    titleHighlight2Color: string;
    titlePart3: string;
    sideImageUrl: string;
    cards: StoryCard[];
  };
  scents: {
    /** Judul section — mendukung <br>, warna, gambar/ikon inline */
    title: string;
    /** @deprecated Dipakai jika `title` kosong (migrasi data lama) */
    titleBefore?: string;
    titleHighlight?: string;
    titleAfter?: string;
    description: string;
    cards: ScentCard[];
  };
  waitlist: {
    badge: string;
    titleBefore: string;
    /** Warna teks judul utama (sebelum angka diskon) */
    titleColor: string;
    discountPercent: string;
    /** Warna angka diskon, mis. 20% */
    discountPercentColor: string;
    description: string;
    counterLabel: string;
    form: {
      title: string;
      subtitle: string;
      nameLabel: string;
      namePlaceholder: string;
      whatsappLabel: string;
      whatsappPlaceholder: string;
      vibeLabel: string;
      submitText: string;
      disclaimer: string;
      successTitle: string;
      successMessage: string;
      referText: string;
    };
    errors: {
      whatsapp: string;
      name: string;
    };
    toastSuccess: string;
  };
  testimonials: {
    titleBefore: string;
    titleHighlight: string;
    titleAfter: string;
    cards: TestimonialCard[];
  };
  footer: {
    brandName: string;
    tagline: string;
    socialTitle: string;
    socialLinks: SocialLink[];
    legalTitle: string;
    legalItems: string[];
    bottomText: string;
  };
}
