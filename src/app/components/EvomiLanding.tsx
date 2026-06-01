import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Heart, Flame, Leaf, Send, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useContent } from "@/content/ContentContext";
import { fillTemplate, renderInline } from "@/content/renderInline";
import { addSubmission, fetchWaitlistCount } from "@/content/waitlistStorage";
import { BrandMark } from "./BrandMark";
import type { StoryIcon } from "@/content/types";

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

function Squiggle({ className, color = "#fff" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 200 20" className={className} aria-hidden fill="none">
      <path d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
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
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-black font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {nav.brandLogoUrl ? (
              <img
                src={nav.brandLogoUrl}
                alt={nav.brandName}
                className="h-12 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 600, color: "#1172ba" }}>{nav.brandName}</span>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-20 right-10 hidden md:block">
          <StarBurst className="w-24 h-24" color="#FFD521" />
        </motion.div>
        <motion.div className="absolute bottom-32 left-10 hidden md:block" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 6, repeat: Infinity }}>
          <StarBurst className="w-16 h-16" color="#E33D35" />
        </motion.div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <div className="relative bg-white rounded-3xl px-10 py-6 text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E33D35] text-white tracking-[0.2em] px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD521] animate-pulse" />
                {hero.counterLabel}
              </div>
              <motion.div
                key={count}
                initial={{ scale: 1.15, color: "#E33D35" }}
                animate={{ scale: 1, color: "#1172ba" }}
                transition={{ duration: 0.4 }}
                className="tabular-nums tracking-tighter leading-none"
                style={{ fontSize: "clamp(72px, 12vw, 144px)", fontWeight: 700 }}
              >
                {count.toLocaleString("id-ID")}
              </motion.div>
              <div className="mt-2 tracking-tight" style={{ fontSize: 35, fontWeight: 600, color: "#1172ba" }}>
                {hero.counterSuffix}
              </div>
            </div>
          </motion.div>

          <h1 className="leading-[0.95] tracking-tight text-center" style={{ fontSize: "clamp(48px, 8vw, 112px)", fontWeight: 600 }}>
            <span className="block">{hero.titleLine1}</span>
            <span className="block">
              <span className="relative inline-block">
                <span style={{ color: "#1172ba" }}>{hero.titleHighlight}</span>
                <Squiggle className="absolute -bottom-3 left-0 w-full h-3" color="#FFD521" />
              </span>
              {" "}{hero.titleLine2}
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-black/80 text-center mx-auto">
            {renderInline(hero.description)}
          </p>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            {scents.cards.map((s) => (
              <span key={s.id} className="px-4 py-2 rounded-full border-2 border-black tracking-tight" style={{ backgroundColor: s.soft }}>
                {s.emoji} {s.name} {s.sub}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-5">
            <a href="#waitlist" className="group inline-flex items-center gap-3 bg-[#1172ba] text-white px-8 py-4 rounded-full border-2 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all">
              <span className="tracking-tight text-lg">{hero.ctaText}</span>
              <Send className="w-5 h-5 group-hover:rotate-12 transition" />
            </a>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <Marquee items={content.marquee} />

      {/* STORY */}
      <section id="story" className="relative py-24 px-6" style={{ backgroundColor: "#1172ba" }}>
        <div className="max-w-7xl mx-auto text-white">
          <div className="grid md:grid-cols-12 gap-10 items-end mb-16">
            <div className="md:col-span-7">
              <div className="inline-block px-3 py-1 rounded-full bg-[#FFD521] text-black tracking-tight mb-4">
                {story.badge}
              </div>
              <h2 className="leading-[1.05] tracking-tight" style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 600 }}>
                {story.titlePart1}
                <span className="italic" style={{ color: "#F899C6" }}>{story.titleHighlight1}</span>
                {story.titlePart2}
                <span className="italic" style={{ color: "#A5E194" }}>{story.titleHighlight2}</span>
                {story.titlePart3}
              </h2>
            </div>
            {story.sideImageUrl && (
              <div className="md:col-span-5">
                <img
                  src={story.sideImageUrl}
                  alt="Cerita EVOMI"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {story.cards.map((c) => {
              const Icon = STORY_ICONS[c.icon] ?? Heart;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -6, rotate: -1 }}
                  className="bg-white text-[#1172ba] rounded-3xl p-7 border-4 border-black shadow-[8px_8px_0_0_#000]"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-black mb-4" style={{ backgroundColor: c.bg }}>
                    <span className="text-black"><Icon className="w-7 h-7" /></span>
                  </div>
                  <h3 className="tracking-tight mb-2" style={{ fontSize: 26, fontWeight: 600 }}>{c.title}</h3>
                  <p className="text-black/70 leading-relaxed">{c.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SCENTS */}
      <section id="scents" className="relative py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <h2 className="leading-[1] tracking-tight" style={{ fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 600 }}>
              {scents.titleBefore}
              <span style={{ color: "#1172ba" }}>{scents.titleHighlight}</span>
              {scents.titleAfter}
            </h2>
            <p className="max-w-md text-black/70 text-lg">{scents.description}</p>
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
                    animate={{ rotate: 360 }}
                    transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-4 right-4 w-16 h-16"
                  >
                    <StarBurst className="w-full h-full" color="#FFD521" />
                  </motion.div>
                </div>
                <div className="relative z-10 -mt-5 w-full flex-1 overflow-hidden rounded-t-3xl bg-white p-5 pt-6">
                  <h3 style={{ fontSize: 28, fontWeight: 600 }} className="tracking-tight leading-none">
                    {s.name}
                    <br />
                    <span className="italic">{s.sub}</span>
                  </h3>
                  <p className="text-sm mt-2 text-black/70">{s.vibe}</p>
                  <p className="text-sm mt-3 text-black/80 leading-relaxed">{s.desc}</p>
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

            <h2 className="leading-[0.95] tracking-tight" style={{ fontSize: "clamp(32px, 8vw, 70px)", fontWeight: 600, color: "#fff" }}>
              {waitlist.titleBefore}
              <span style={{ fontSize: "1.6em", color: "#FFD521", display: "inline-block", lineHeight: 1 }}>{waitlist.discountPercent}</span>
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
