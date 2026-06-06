import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Heart, Flame, Leaf, Send, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useContent } from "@/content/ContentContext";
import { fillTemplate, renderInline, renderRichText, stripRichText } from "@/content/renderInline";
import { addSubmission, fetchWaitlistCount } from "@/content/waitlistStorage";
import { BrandMark } from "./BrandMark";
import type { CounterAvatar, CounterAvatarIconType, HeroDecoration, HeroMascot, StoryIcon } from "@/content/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";
import { cn } from "./ui/utils";
import { getDecorationLayout, type DecorationViewport } from "@/content/heroDecorationLayout";

const STORY_ICONS = {
  heart: Heart,
  leaf: Leaf,
  sparkles: Sparkles,
} satisfies Record<StoryIcon, typeof Heart>;


function Marquee({ items }: { items: { id: string; text: string; color?: string }[] }) {
  return (
    <div className="overflow-hidden bg-[#1172ba] text-white border-y-4 border-white">
      <motion.div
        className="flex gap-12 whitespace-nowrap py-4"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="flex items-center gap-12 text-2xl tracking-tight">
            {items.map((item) => (
              <span key={`${i}-${item.id}`} style={item.color ? { color: item.color } : undefined}>
                {item.text}
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function HeroMascotCard({ mascot, hover = false }: { mascot: HeroMascot; hover?: boolean }) {
  const body = (
    <>
      {mascot.imageUrl ? (
        <img
          src={mascot.imageUrl}
          alt={`${mascot.name} ${mascot.sub}`}
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-24 md:h-24 object-contain drop-shadow-md"
        />
      ) : (
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-24 md:h-24 rounded-2xl border-2 border-dashed border-black/20 flex items-center justify-center text-3xl bg-white/50"
          title="Upload maskot di admin"
        >
          ✨
        </div>
      )}
      <p className="tracking-tight text-center leading-tight font-semibold mt-2">
        <span style={{ color: mascot.nameColor }}>{mascot.name}</span>
        {" "}
        <span style={{ color: mascot.subColor }}>{mascot.sub}</span>
      </p>
    </>
  );

  if (hover) {
    return (
      <motion.div
        className="flex flex-col items-center gap-2 max-w-[120px]"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
      >
        {body}
      </motion.div>
    );
  }

  return <div className="flex flex-col items-center max-w-[160px] mx-auto">{body}</div>;
}

function HeroMascotsMobileCarousel({ mascots }: { mascots: HeroMascot[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActive(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (mascots.length === 0) return null;

  if (mascots.length === 1) {
    return (
      <div className="md:hidden flex justify-center mt-10">
        <HeroMascotCard mascot={mascots[0]} />
      </div>
    );
  }

  return (
    <div className="md:hidden w-full max-w-xs mx-auto mt-10 px-2">
      <Carousel
        opts={{ loop: true, align: "center" }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {mascots.map((m) => (
            <CarouselItem key={m.id} className="pl-0 basis-full">
              <HeroMascotCard mascot={m} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          variant="outline"
          className="left-0 top-[38%] size-9 rounded-full border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:bg-[#1172ba] hover:text-white hover:border-black disabled:opacity-40"
        />
        <CarouselNext
          variant="outline"
          className="right-0 top-[38%] size-9 rounded-full border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:bg-[#1172ba] hover:text-white hover:border-black disabled:opacity-40"
        />
      </Carousel>
      <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Pilih maskot">
        {mascots.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={m.name}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === active ? "w-6 bg-[#1172ba]" : "w-2 bg-black/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function HeroDecorationLayer({
  decorations,
  viewport,
}: {
  decorations: HeroDecoration[];
  viewport: DecorationViewport;
}) {
  return (
    <>
      {[...decorations]
        .sort((a, b) => a.zIndex - b.zIndex)
        .filter((d) => d.imageUrl)
        .map((d) => {
          const layout = getDecorationLayout(d, viewport);
          return (
            <img
              key={`${d.id}-${viewport}`}
              src={d.imageUrl}
              alt=""
              className="absolute h-auto max-w-none select-none"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: layout.width,
                zIndex: d.zIndex,
                transform: `translate(-50%, -50%) rotate(${layout.rotation}deg)`,
              }}
            />
          );
        })}
    </>
  );
}

function StarBurst({ className, color = "#FFD521" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        d="M50 0 L60 38 L100 50 L60 62 L50 100 L40 62 L0 50 L40 38 Z"
        fill={color}
      />
    </svg>
  );
}

function CounterAvatarIconGlyph({
  icon,
  iconColor,
}: {
  icon: CounterAvatarIconType;
  iconColor: string;
}) {
  const shapeCls = "w-[68%] h-[68%] max-w-none shrink-0";
  const dotCls = "w-[48%] h-[48%] max-w-none shrink-0";

  switch (icon) {
    case "star":
      return <StarBurst className={shapeCls} color={iconColor} />;
    case "dot":
      return (
        <span
          className={cn("block rounded-full", dotCls)}
          style={{ backgroundColor: iconColor }}
        />
      );
    case "heart":
      return (
        <Heart
          className={cn(shapeCls, "fill-current")}
          style={{ color: iconColor }}
          strokeWidth={0}
        />
      );
    case "sparkles":
      return <Sparkles className={shapeCls} style={{ color: iconColor }} strokeWidth={2.25} />;
    case "leaf":
      return <Leaf className={shapeCls} style={{ color: iconColor }} strokeWidth={2.25} />;
    case "flame":
      return <Flame className={shapeCls} style={{ color: iconColor }} strokeWidth={2.25} />;
    default:
      return <StarBurst className={shapeCls} color={iconColor} />;
  }
}

function LiveCounterBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#EBEBEB] px-2.5 py-1">
      <span className="relative flex size-4 shrink-0 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-[#E33D35]/20" />
        <span className="absolute inset-[18%] rounded-full bg-[#E33D35]/35" />
        <span className="relative size-2 rounded-full bg-[#E33D35]" />
      </span>
      <span
        className="uppercase whitespace-nowrap text-black tracking-[0.08em] font-semibold"
        style={{ fontSize: 13 }}
      >
        {label}
      </span>
    </div>
  );
}

function CounterAvatarStack({ avatars }: { avatars: CounterAvatar[] }) {
  if (avatars.length === 0) return null;

  return (
    <div
      className="shrink-0 flex items-center rounded-full border border-black/10 bg-white p-px shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      aria-hidden
    >
      <div className="flex items-center">
        {avatars.map((avatar, index) => (
          <div
            key={avatar.id}
            className="relative flex size-14 md:size-16 items-center justify-center overflow-visible rounded-full border-2 border-white shrink-0"
            style={{
              backgroundColor: avatar.bgColor,
              marginLeft: index > 0 ? -18 : 0,
              zIndex: index + 1,
            }}
          >
            {avatar.imageUrl ? (
              <img
                src={avatar.imageUrl}
                alt=""
                className="w-[65%] h-[65%] max-w-none object-contain"
              />
            ) : (
              <CounterAvatarIconGlyph icon={avatar.icon} iconColor={avatar.iconColor} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvomiLanding() {
  const { content, loading } = useContent();
  const [count, setCount] = useState(0);
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [scent, setScent] = useState(content.scents.cards[0]?.name ?? "");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (content.scents.cards[0]) {
      setScent(content.scents.cards[0].name);
    }
  }, [content.scents.cards]);

  useEffect(() => {
    let cancelled = false;

    async function loadCount() {
      const total = await fetchWaitlistCount();
      if (!cancelled) setCount(total);
    }

    void loadCount();
    const id = setInterval(() => void loadCount(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error(content.waitlist.errors.whatsapp);
      return;
    }
    if (!name.trim()) {
      toast.error(content.waitlist.errors.name);
      return;
    }
    await addSubmission({
      name: name.trim(),
      whatsapp: digits,
      scent,
    });
    const total = await fetchWaitlistCount();
    setCount(total);
    setSubmitted(true);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ["#1172ba", "#DD74A5", "#5EA14A", "#E33D35", "#FFD521", "#60BBFF"],
    });
    toast.success(content.waitlist.toastSuccess);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <p className="text-[#1172ba] font-semibold">Memuat...</p>
      </div>
    );
  }

  const { nav, hero, story, scents, waitlist, testimonials, footer } = content;

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white text-black font-sans">
      {/* NAV */}
      <nav className="relative bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          {nav.brandLogoUrl ? (
            <img
              src={nav.brandLogoUrl}
              alt={stripRichText(nav.brandName)}
              className="h-12 w-auto max-w-[200px] object-contain mx-auto"
            />
          ) : (
            <span className="text-center text-[24px] font-semibold text-[#1172ba] leading-snug max-md:px-2">
              {renderRichText(nav.brandName)}
            </span>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[90vh] w-full overflow-visible">
        {/* Desktop: dekor di belakang teks */}
        <div
          className="absolute inset-0 pointer-events-none overflow-visible hidden md:block z-0"
          aria-hidden
        >
          <HeroDecorationLayer decorations={hero.decorations} viewport="desktop" />
        </div>
        {/* Mobile: dekor di atas kartu counter (opaque) supaya tidak ketutup putih */}
        <div
          className="absolute inset-0 pointer-events-none overflow-visible md:hidden z-20"
          aria-hidden
        >
          <HeroDecorationLayer decorations={hero.decorations} viewport="mobile" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-16 flex flex-col items-center text-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 md:mb-10"
          >
            <div className="flex items-center justify-center gap-5 md:gap-7">
              <CounterAvatarStack avatars={hero.counterAvatars} />
              <motion.div
                key={count}
                initial={{ scale: 1.08, color: "#E33D35" }}
                animate={{ scale: 1, color: "#1172ba" }}
                transition={{ duration: 0.4 }}
                className="tabular-nums tracking-tighter leading-none text-[#1172ba] mx-1 md:mx-2"
                style={{ fontSize: "clamp(56px, 10vw, 96px)", fontWeight: 700 }}
              >
                {count.toLocaleString("id-ID")}
              </motion.div>
              <div className="flex flex-col items-start text-left gap-1.5">
                <LiveCounterBadge label={hero.counterLabel} />
                <p
                  className="text-sm md:text-base font-medium text-black leading-snug max-w-[9rem] md:max-w-[11rem]"
                >
                  {hero.counterSuffix}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col items-center text-center w-full max-md:px-1">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="leading-[1.15] tracking-tight text-black w-full max-w-3xl mx-auto"
              style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 600 }}
            >
              {renderRichText(hero.title)}
            </motion.h1>

            {(hero.subtitleLine1 || hero.subtitleLine2) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 md:mt-10 flex flex-col items-center gap-1 w-full max-w-4xl mx-auto"
              >
                {hero.subtitleLine1 ? (
                  <p
                    className="leading-[1.4] font-normal text-black w-full max-w-3xl mx-auto"
                    style={{ fontSize: "clamp(20px, 3.5vw, 34px)" }}
                  >
                    {renderRichText(hero.subtitleLine1)}
                  </p>
                ) : null}
                {hero.subtitleLine2 ? (
                  <p
                    className="leading-[1.4] font-normal text-black w-full max-w-4xl mx-auto"
                    style={{ fontSize: "clamp(20px, 3.5vw, 34px)" }}
                  >
                    {renderRichText(hero.subtitleLine2)}
                  </p>
                ) : null}
              </motion.div>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 md:mt-8 max-w-[760px] text-sm md:text-base leading-relaxed text-black/65 text-center mx-auto"
          >
            {renderRichText(hero.description)}
          </motion.p>

          <HeroMascotsMobileCarousel mascots={hero.mascots} />

          <div className="mt-8 md:mt-10 hidden md:flex flex-wrap gap-8 sm:gap-10 justify-center items-end">
            {hero.mascots.map((m) => (
              <HeroMascotCard key={m.id} mascot={m} hover />
            ))}
          </div>

          <div className="mt-8 md:mt-10 flex flex-col items-center gap-5 w-full">
            <a href="#waitlist" className="group inline-flex items-center gap-3 bg-[#1172ba] text-white px-8 py-4 rounded-full border-2 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all">
              <span className="tracking-tight text-lg">{hero.ctaText}</span>
              <Send className="w-5 h-5 group-hover:rotate-12 transition" />
            </a>
          </div>

          {(() => {
            const highlightItems = hero.highlights.filter((h) => h.imageUrl);
            if (highlightItems.length === 0) return null;

            const isSingle = highlightItems.length === 1;
            const gridClass =
              highlightItems.length === 2
                ? "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                : highlightItems.length === 3
                  ? "grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-3 md:gap-4 items-center"
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center";

            return (
              <div
                className={`mt-12 w-full ${isSingle ? "max-w-[min(100vw-2rem,1280px)]" : "max-w-6xl"} ${isSingle ? "" : gridClass}`}
              >
                {highlightItems.map((h) => (
                  <img
                    key={h.id}
                    src={h.imageUrl}
                    alt={h.alt || "Kampanye EVOMI"}
                    className="block w-full h-auto max-w-full object-contain object-center rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* MARQUEE */}
      <Marquee items={content.marquee} />

      {/* STORY */}
      <section id="story" className="relative overflow-visible pt-10 pb-24 px-6" style={{ backgroundColor: "#1172ba" }}>
        <div className="max-w-6xl mx-auto text-white overflow-visible flex flex-col items-center gap-8 md:gap-10">
            <h2
              className="leading-[0.95] tracking-tight text-center max-w-4xl mx-auto"
              style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 600 }}
            >
              {story.titlePart1}
              <span style={{ color: story.titleHighlight1Color }}>
                {story.titleHighlight1}
              </span>
              {story.titlePart2}
              <span style={{ color: story.titleHighlight2Color }}>
                {story.titleHighlight2}
              </span>
              {story.titlePart3}
            </h2>

          {(() => {
            if (story.sideImageUrl) {
              return (
                <div className="flex justify-center w-full px-2">
                  <img
                    src={story.sideImageUrl}
                    alt="Produk EVOMI"
                    className="w-full max-w-5xl h-auto object-contain object-top block m-0 p-0 align-top"
                  />
                </div>
              );
            }

            const scentProducts = scents.cards.filter((s) => s.imageUrl);
            if (scentProducts.length > 0) {
              return (
                <div className="flex flex-wrap justify-center items-end gap-3 sm:gap-5 md:gap-8 w-full px-2">
                  {scentProducts.map((s, i) => (
                    <motion.img
                      key={s.id}
                      src={s.imageUrl}
                      alt={s.name}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                      className="w-[clamp(72px,18vw,200px)] h-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.25)]"
                    />
                  ))}
                </div>
              );
            }

            return null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 w-full">
            {story.cards.map((c, i) => {
              const Icon = STORY_ICONS[c.icon] ?? Heart;
              const titleColor = c.titleColor || "#1172ba";
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl p-6 md:p-7 border-[3px] border-black shadow-[5px_5px_0_0_#000]"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                    style={{ backgroundColor: c.bg }}
                  >
                    <Icon className="w-7 h-7" style={{ color: titleColor }} strokeWidth={2.25} />
                  </div>
                  <h3
                    className="tracking-tight mb-2"
                    style={{ fontSize: 24, fontWeight: 600, color: titleColor }}
                  >
                    {c.title}
                  </h3>
                  <p className="text-black/70 leading-relaxed text-[15px]">{c.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SCENTS */}
      <section id="scents" className="relative py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 flex flex-col items-center w-full px-2">
            <h2
              className="leading-[1.1] tracking-tight text-center [&_br]:block"
              style={{ fontSize: "clamp(24px, 5.5vw, 80px)", fontWeight: 500 }}
            >
              {renderRichText(scents.title, { inlineImageHeight: "0.85em" })}
            </h2>
            <p className="mt-4 max-w-3xl text-black/70 text-lg leading-relaxed">{scents.description}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scents.cards.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -8, rotate: i % 2 === 0 ? -2 : 2 }}
                className="relative flex flex-col rounded-3xl border-4 border-black overflow-hidden bg-white shadow-[8px_8px_0_0_#000]"
              >
                <div
                  className="aspect-[3/4] relative shrink-0 overflow-hidden"
                  style={{ backgroundColor: s.color }}
                >
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt={s.name}
                      className="absolute inset-0 w-full h-full object-cover translate-y-5"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[140px] opacity-60">{s.emoji}</div>
                  )}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white border-2 border-black text-sm tracking-tight">
                    No. 0{i + 1}
                  </div>
                  <motion.div
                    animate={{ rotate: [-12, 12, -12] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-4 right-4 w-16 h-16 origin-center"
                  >
                    {s.stickerImageUrl ? (
                      <img
                        src={s.stickerImageUrl}
                        alt=""
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <StarBurst className="w-full h-full" color={s.stickerColor} />
                    )}
                  </motion.div>
                </div>
                <div className="relative z-10 -mt-5 w-full flex-1 overflow-hidden rounded-t-3xl bg-white p-5 pt-6 flex flex-col gap-5">
                  <h3
                    style={{ fontSize: 28, fontWeight: 600 }}
                    className="tracking-tight leading-none"
                  >
                    <span style={{ color: s.nameColor }}>{s.name}</span>
                    <br />
                    <span className="italic" style={{ color: s.subColor }}>
                      {s.sub}
                    </span>
                  </h3>
                  <p className="text-sm" style={{ color: s.vibeColor }}>
                    {s.vibe}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: s.descColor }}>
                    {s.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WAITLIST + FOMO */}
      <section id="waitlist" className="relative py-24 px-6" style={{ backgroundColor: "#1172ba" }}>
        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center justify-items-center lg:justify-items-stretch">
          <div className="w-full text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-6 border-2 border-white" style={{ color: "#1172ba" }}>
              <Flame className="w-4 h-4" style={{ color: "#1172ba" }} />
              <span className="tracking-tight">{waitlist.badge}</span>
            </div>

            <h2
              className="leading-[0.95] tracking-tight"
              style={{
                fontSize: "clamp(32px, 8vw, 70px)",
                fontWeight: 600,
                color: waitlist.titleColor || "#FFFFFF",
              }}
            >
              {waitlist.titleBefore}
              <span
                style={{
                  fontSize: "1.6em",
                  color: waitlist.discountPercentColor || "#FFD521",
                  display: "inline-block",
                  lineHeight: 1,
                }}
              >
                {waitlist.discountPercent}
              </span>
            </h2>

            <p className="mt-6 text-lg max-w-md mx-auto lg:mx-0 text-white">
              {renderInline(waitlist.description)}
            </p>

            <motion.div
              key={count}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="mt-8 inline-flex items-center gap-4 bg-white px-6 py-4 rounded-2xl border-4 border-white shadow-[6px_6px_0_0_#1172ba]" style={{ color: "#1172ba" }}
            >
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-[#A5E194] animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#A5E194] animate-ping" />
              </div>
              <div>
                <div className="text-3xl tabular-nums tracking-tight" style={{ fontWeight: 600 }}>
                  {count.toLocaleString("id-ID")}
                </div>
                <div className="text-xs tracking-[0.2em] opacity-70">{waitlist.counterLabel}</div>
              </div>
            </motion.div>
          </div>

          {/* FORM */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-md mx-auto lg:max-w-none lg:mx-0 bg-white rounded-3xl border-4 border-black p-5 sm:p-8 shadow-[8px_8px_0_0_#000] lg:shadow-[12px_12px_0_0_#000]"
          >
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="tracking-tight" style={{ fontSize: 30, fontWeight: 600 }}>{waitlist.form.title}</h3>
                  <p className="text-black/60 mt-1">{waitlist.form.subtitle}</p>
                </div>

                <label className="block">
                  <span className="block text-sm tracking-tight mb-2">{waitlist.form.nameLabel}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={waitlist.form.namePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border-2 border-black bg-[#FFF8EE] outline-none focus:bg-white focus:shadow-[4px_4px_0_0_#1172ba] transition"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm tracking-tight mb-2">{waitlist.form.whatsappLabel}</span>
                  <div className="flex gap-2 min-w-0">
                    <span className="shrink-0 px-3 sm:px-4 py-3 rounded-xl border-2 border-black bg-[#FFF8EE] flex items-center" style={{ fontWeight: 600 }}>
                      +62
                    </span>
                    <input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder={waitlist.form.whatsappPlaceholder}
                      inputMode="tel"
                      className="min-w-0 flex-1 px-4 py-3 rounded-xl border-2 border-black bg-[#FFF8EE] outline-none focus:bg-white focus:shadow-[4px_4px_0_0_#5EA14A] transition tabular-nums"
                    />
                  </div>
                </label>

                <div>
                  <span className="block text-sm tracking-tight mb-2">{waitlist.form.vibeLabel}</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1172ba] text-white px-6 py-4 rounded-xl border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2"
                  style={{ fontWeight: 600 }}
                >
                  {waitlist.form.submitText} <Sparkles className="w-5 h-5 text-[#FFD521]" />
                </button>

                <p className="text-xs text-black/50 text-center">
                  {waitlist.form.disclaimer}
                </p>
              </form>
            ) : (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-[#A5E194] border-4 border-black"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <h3 className="mt-6 tracking-tight" style={{ fontSize: 32, fontWeight: 600 }}>
                  {fillTemplate(waitlist.form.successTitle, { name: name.split(" ")[0] })}
                </h3>
                <p className="mt-2 text-black/70">
                  {renderInline(fillTemplate(waitlist.form.successMessage, { scent, count: count.toLocaleString("id-ID") }))}
                </p>
                <button
                  onClick={() => { setSubmitted(false); setName(""); setWhatsapp(""); }}
                  className="mt-6 underline tracking-tight"
                >
                  {waitlist.form.referText}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="tracking-tight mb-10" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 600 }}>
            {testimonials.titleBefore}
            <span>{testimonials.titleHighlight}</span>
            {testimonials.titleAfter}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.cards.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl border-4 border-black p-6 shadow-[6px_6px_0_0_#000]"
                style={{ backgroundColor: t.color }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center" style={{ fontWeight: 600 }}>
                    {t.who[1]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="tracking-tight" style={{ fontWeight: 600 }}>{t.who}</div>
                </div>
                <p className="leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4 flex gap-1">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-black" />)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1172ba] text-white px-6 py-14">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BrandMark logoUrl={nav.brandLogoUrl} name={footer.brandName} size={36} />
              <span style={{ fontSize: 28, fontWeight: 600 }}>{footer.brandName}</span>
            </div>
            <p className="text-white/60 max-w-xs">{footer.tagline}</p>
          </div>
          <div>
            <div className="tracking-[0.2em] text-xs text-white/50 mb-3">{footer.socialTitle}</div>
            <ul className="space-y-2">
              {footer.socialLinks.map((link) => (
                <li key={link.id}>
                  <a className="hover:text-[#FFD521]" href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="tracking-[0.2em] text-xs text-white/50 mb-3">{footer.legalTitle}</div>
            <ul className="space-y-2 text-white/80">
              {footer.legalItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 text-center text-white/40 text-xs tracking-[0.3em]">
          {footer.bottomText}
        </div>
      </footer>
    </div>
  );
}
