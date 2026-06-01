export type StoryIcon = "heart" | "leaf" | "sparkles";

export interface MarqueeItem {
  id: string;
  text: string;
  color?: string;
}

export interface StoryCard {
  id: string;
  icon: StoryIcon;
  title: string;
  body: string;
  bg: string;
}

export interface ScentCard {
  id: string;
  name: string;
  sub: string;
  color: string;
  soft: string;
  emoji: string;
  imageUrl: string;
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

export interface LandingContent {
  nav: {
    brandName: string;
    brandLogoUrl: string;
  };
  hero: {
    counterLabel: string;
    counterSuffix: string;
    counterStart: number;
    titleLine1: string;
    titleHighlight: string;
    titleLine2: string;
    description: string;
    ctaText: string;
  };
  marquee: MarqueeItem[];
  story: {
    badge: string;
    titlePart1: string;
    titleHighlight1: string;
    titlePart2: string;
    titleHighlight2: string;
    titlePart3: string;
    sideImageUrl: string;
    cards: StoryCard[];
  };
  scents: {
    titleBefore: string;
    titleHighlight: string;
    titleAfter: string;
    description: string;
    cards: ScentCard[];
  };
  waitlist: {
    badge: string;
    titleBefore: string;
    discountPercent: string;
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
