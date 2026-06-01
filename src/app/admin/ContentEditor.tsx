import type { LandingContent, ScentCard, StoryIcon, TestimonialCard } from "@/content/types";
import { createId } from "@/content/storage";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import {
  CardShell,
  Field,
  FieldGroup,
  NumberField,
  SectionHeader,
} from "./components/AdminFields";
import { BrandLogoUpload } from "./components/BrandLogoUpload";
import { ImageUploadField } from "./components/ImageUploadField";
import { DecorationCanvasEditor } from "./components/DecorationCanvasEditor";

type PatchFn = (updater: (prev: LandingContent) => LandingContent) => void;

type EditorProps = {
  draft: LandingContent;
  patch: PatchFn;
  patchImage: PatchFn;
};

export function HeroSection({ draft, patch, patchImage }: EditorProps) {
  return (
    <div>
      <SectionHeader
        title="Hero & Navigasi"
        description="Bagian paling atas landing page — logo, counter live, judul utama, dan tombol CTA."
      />
      <div className="space-y-5">
        <FieldGroup title="Navigasi & brand">
          <BrandLogoUpload
            logoUrl={draft.nav.brandLogoUrl ?? ""}
            brandName={draft.nav.brandName}
            onChange={(url) => patchImage((c) => ({ ...c, nav: { ...c.nav, brandLogoUrl: url } }))}
          />
          <Field
            label="Nama brand (teks di samping logo)"
            value={draft.nav.brandName}
            onChange={(v) => patch((c) => ({ ...c, nav: { ...c.nav, brandName: v } }))}
          />
        </FieldGroup>
        <FieldGroup title="Live counter">
          <p className="text-sm text-black/55 mb-3">
            Angka di landing diambil dari jumlah pendaftar waitlist di database (diperbarui otomatis).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Label badge" value={draft.hero.counterLabel} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, counterLabel: v } }))} />
            <Field label="Teks di bawah angka" value={draft.hero.counterSuffix} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, counterSuffix: v } }))} />
          </div>
        </FieldGroup>
        <FieldGroup title="Judul & deskripsi">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Baris judul 1" value={draft.hero.titleLine1} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, titleLine1: v } }))} />
            <Field label="Kata highlight (warna biru)" value={draft.hero.titleHighlight} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, titleHighlight: v } }))} />
          </div>
          <Field label="Baris judul 2" value={draft.hero.titleLine2} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, titleLine2: v } }))} />
          <Field label="Deskripsi" value={draft.hero.description} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, description: v } }))} multiline hint="Gunakan **teks** untuk bold" />
          <Field label="Teks tombol CTA" value={draft.hero.ctaText} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, ctaText: v } }))} />
        </FieldGroup>

        <FieldGroup title="Maskot hero (baris karakter)">
          <p className="text-sm text-black/55 mb-3">
            Upload gambar maskot dan atur nama. Tampil di bawah deskripsi, di atas tombol CTA.
          </p>
          <div className="flex justify-end mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patch((c) => ({
                  ...c,
                  hero: {
                    ...c.hero,
                    mascots: [
                      ...c.hero.mascots,
                      {
                        id: createId("mascot"),
                        name: "Nama",
                        sub: "Subtitle",
                        imageUrl: "",
                      },
                    ],
                  },
                }))
              }
            >
              <Plus className="size-4" /> Tambah maskot
            </Button>
          </div>
          <div className="space-y-4">
            {draft.hero.mascots.map((m, i) => (
              <CardShell
                key={m.id}
                title={`Maskot ${i + 1}`}
                subtitle={`${m.name} ${m.sub}`.trim()}
                onDelete={() =>
                  patch((c) => ({
                    ...c,
                    hero: {
                      ...c.hero,
                      mascots: c.hero.mascots.filter((x) => x.id !== m.id),
                    },
                  }))
                }
              >
                <ImageUploadField
                  label="Gambar maskot"
                  imageUrl={m.imageUrl}
                  alt={m.name}
                  uploadPrefix="mascot"
                  onChange={(url) =>
                    patchImage((c) => ({
                      ...c,
                      hero: {
                        ...c.hero,
                        mascots: c.hero.mascots.map((x) =>
                          x.id === m.id ? { ...x, imageUrl: url } : x,
                        ),
                      },
                    }))
                  }
                  previewClassName="w-full max-h-36 aspect-square"
                />
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <Field
                    label="Nama"
                    value={m.name}
                    onChange={(v) =>
                      patch((c) => ({
                        ...c,
                        hero: {
                          ...c.hero,
                          mascots: c.hero.mascots.map((x) =>
                            x.id === m.id ? { ...x, name: v } : x,
                          ),
                        },
                      }))
                    }
                  />
                  <Field
                    label="Subtitle (italic)"
                    value={m.sub}
                    onChange={(v) =>
                      patch((c) => ({
                        ...c,
                        hero: {
                          ...c.hero,
                          mascots: c.hero.mascots.map((x) =>
                            x.id === m.id ? { ...x, sub: v } : x,
                          ),
                        },
                      }))
                    }
                  />
                </div>
              </CardShell>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup title="Strip gambar bawah hero (kampanye / recycle)">
          <p className="text-sm text-black/55 mb-3">
            Gambar horizontal di bawah tombol CTA. Satu gambar = lebar penuh; tiga gambar = kiri & kanan
            kotak, tengah lebih lebar (seperti desain). Upload gambar landscape, jangan dipotong kotak.
          </p>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-black/55">{draft.hero.highlights.length} kartu</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patch((c) => ({
                  ...c,
                  hero: {
                    ...c.hero,
                    highlights: [
                      ...c.hero.highlights,
                      {
                        id: createId("hl"),
                        imageUrl: "",
                        alt: "Kampanye",
                      },
                    ],
                  },
                }))
              }
            >
              <Plus className="size-4" /> Tambah kartu
            </Button>
          </div>
          <div className="space-y-4">
            {draft.hero.highlights.length === 0 && (
              <p className="text-sm text-black/45 italic py-4 text-center border border-dashed rounded-xl">
                Belum ada kartu kampanye — klik Tambah kartu atau biarkan kosong.
              </p>
            )}
            {draft.hero.highlights.map((h, i) => (
              <CardShell
                key={h.id}
                title={`Gambar ${i + 1}`}
                subtitle={h.alt || (h.imageUrl ? "Ada gambar" : "Kosong")}
                onDelete={() =>
                  patch((c) => ({
                    ...c,
                    hero: {
                      ...c.hero,
                      highlights: c.hero.highlights.filter((x) => x.id !== h.id),
                    },
                  }))
                }
              >
                <ImageUploadField
                  label="Gambar"
                  imageUrl={h.imageUrl}
                  alt={h.alt}
                  uploadPrefix="hero-highlight"
                  onChange={(url) =>
                    patchImage((c) => ({
                      ...c,
                      hero: {
                        ...c.hero,
                        highlights: c.hero.highlights.map((x) =>
                          x.id === h.id ? { ...x, imageUrl: url } : x,
                        ),
                      },
                    }))
                  }
                  previewClassName="w-full max-h-32 object-contain bg-[#fafafa]"
                />
                <Field
                  label="Teks alternatif (aksesibilitas)"
                  value={h.alt}
                  onChange={(v) =>
                    patch((c) => ({
                      ...c,
                      hero: {
                        ...c.hero,
                        highlights: c.hero.highlights.map((x) =>
                          x.id === h.id ? { ...x, alt: v } : x,
                        ),
                      },
                    }))
                  }
                />
              </CardShell>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup title="Dekorasi hero (drag & drop)">
          <DecorationCanvasEditor
            decorations={draft.hero.decorations}
            onChange={(updater) =>
              patch((c) => ({
                ...c,
                hero: { ...c.hero, decorations: updater(c.hero.decorations) },
              }))
            }
            onDecorationImageChange={(id, url) =>
              patchImage((c) => ({
                ...c,
                hero: {
                  ...c.hero,
                  decorations: c.hero.decorations.map((d) =>
                    d.id === id ? { ...d, imageUrl: url } : d,
                  ),
                },
              }))
            }
          />
        </FieldGroup>
      </div>
    </div>
  );
}

export function MarqueeSection({ draft, patch }: EditorProps) {
  return (
    <div>
      <SectionHeader
        title="Marquee"
        description="Teks berjalan horizontal di bawah hero. Tambah item untuk mengisi loop animasi."
      />
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-black/55">{draft.marquee.length} item</p>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, marquee: [...c.marquee, { id: createId("m"), text: "TEKS BARU" }] }))}>
          <Plus className="size-4" /> Tambah item
        </Button>
      </div>
      <div className="space-y-3">
        {draft.marquee.map((item, i) => (
          <CardShell key={item.id} title={`Item ${i + 1}`} subtitle={item.text} onDelete={() => patch((c) => ({ ...c, marquee: c.marquee.filter((m) => m.id !== item.id) }))}>
            <Field label="Teks" value={item.text} onChange={(v) => patch((c) => ({ ...c, marquee: c.marquee.map((m) => (m.id === item.id ? { ...m, text: v } : m)) }))} />
            <Field label="Warna khusus (hex, opsional)" value={item.color ?? ""} onChange={(v) => patch((c) => ({ ...c, marquee: c.marquee.map((m) => (m.id === item.id ? { ...m, color: v || undefined } : m)) }))} hint="Kosongkan untuk warna putih default" />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

export function StorySection({ draft, patch, patchImage }: EditorProps) {
  return (
    <div>
      <SectionHeader title="Cerita Kami" description="Section biru dengan judul utama dan card-card value proposition." />
      <FieldGroup title="Judul section">
        <Field label="Badge" value={draft.story.badge} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, badge: v } }))} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Teks sebelum highlight 1" value={draft.story.titlePart1} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titlePart1: v } }))} />
          <Field label="Highlight 1 (pink)" value={draft.story.titleHighlight1} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titleHighlight1: v } }))} />
          <Field label="Teks tengah" value={draft.story.titlePart2} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titlePart2: v } }))} />
          <Field label="Highlight 2 (hijau)" value={draft.story.titleHighlight2} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titleHighlight2: v } }))} />
        </div>
        <Field label="Penutup judul" value={draft.story.titlePart3} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titlePart3: v } }))} />
      </FieldGroup>

      <FieldGroup title="Gambar samping judul (kanan)">
        <ImageUploadField
          label="Gambar section cerita"
          hint="Menggantikan teks paragraf di sebelah kanan judul. Disarankan landscape, min. lebar 600px."
          imageUrl={draft.story.sideImageUrl ?? ""}
          alt="Cerita EVOMI"
          uploadPrefix="story"
          onChange={(url) => patchImage((c) => ({ ...c, story: { ...c.story, sideImageUrl: url } }))}
          previewClassName="w-full aspect-[4/3] max-h-56 rounded-xl"
        />
      </FieldGroup>

      <div className="flex justify-between items-center mt-6 mb-4">
        <h3 className="font-semibold text-black/70">Card ({draft.story.cards.length})</h3>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, story: { ...c.story, cards: [...c.story.cards, { id: createId("story"), icon: "heart" as StoryIcon, title: "Judul Baru", body: "Deskripsi card", bg: "#60BBFF" }] } }))}>
          <Plus className="size-4" /> Tambah card
        </Button>
      </div>
      <div className="space-y-3">
        {draft.story.cards.map((card, i) => (
          <CardShell key={card.id} title={card.title} subtitle={`Card ${i + 1}`} onDelete={() => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.filter((x) => x.id !== card.id) } }))}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Icon" value={card.icon} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, icon: v as StoryIcon } : x)) } }))} hint="heart · leaf · sparkles" />
              <Field label="Warna icon box" value={card.bg} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, bg: v } : x)) } }))} />
            </div>
            <Field label="Judul" value={card.title} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, title: v } : x)) } }))} />
            <Field label="Isi" value={card.body} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, body: v } : x)) } }))} multiline />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

export function ScentsSection({ draft, patch, patchImage }: EditorProps) {
  return (
    <div>
      <SectionHeader title="Koleksi Aroma" description="Grid card produk parfum — upload gambar produk atau pakai emoji sebagai fallback." />
      <FieldGroup title="Judul section">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Sebelum highlight" value={draft.scents.titleBefore} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, titleBefore: v } }))} />
          <Field label="Highlight (biru)" value={draft.scents.titleHighlight} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, titleHighlight: v } }))} />
          <Field label="Setelah highlight" value={draft.scents.titleAfter} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, titleAfter: v } }))} />
        </div>
        <Field label="Deskripsi" value={draft.scents.description} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, description: v } }))} multiline />
      </FieldGroup>

      <div className="flex justify-between items-center mt-6 mb-4">
        <h3 className="font-semibold text-black/70">Card aroma ({draft.scents.cards.length})</h3>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, scents: { ...c.scents, cards: [...c.scents.cards, { id: createId("scent"), name: "Nama", sub: "Subtitle", color: "#1172ba", soft: "#60BBFF", emoji: "✨", imageUrl: "", vibe: "vibe...", desc: "deskripsi..." } satisfies ScentCard] } }))}>
          <Plus className="size-4" /> Tambah aroma
        </Button>
      </div>
      <div className="space-y-3">
        {draft.scents.cards.map((card, i) => (
          <CardShell key={card.id} title={`${card.emoji} ${card.name}`} subtitle={card.sub} onDelete={() => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.filter((x) => x.id !== card.id) } }))}>
            <ImageUploadField
              label="Gambar card (area atas)"
              hint="Rasio 3:4 disarankan. Jika kosong, emoji dipakai sebagai fallback."
              imageUrl={card.imageUrl ?? ""}
              alt={card.name}
              uploadPrefix="scent"
              onChange={(url) => patchImage((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, imageUrl: url } : x)) } }))}
              previewClassName="w-full aspect-[3/4] max-h-56 rounded-xl"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nama" value={card.name} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, name: v } : x)) } }))} />
              <Field label="Subtitle" value={card.sub} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, sub: v } : x)) } }))} />
              <Field label="Emoji" value={card.emoji} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, emoji: v } : x)) } }))} />
              <Field label="Vibe" value={card.vibe} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, vibe: v } : x)) } }))} />
              <Field label="Warna utama" value={card.color} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, color: v } : x)) } }))} />
              <Field label="Warna soft (background card)" value={card.soft} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, soft: v } : x)) } }))} />
            </div>
            <Field label="Deskripsi lengkap" value={card.desc} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, desc: v } : x)) } }))} multiline />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

export function WaitlistFormSection({ draft, patch }: EditorProps) {
  return (
    <div>
      <SectionHeader title="Section Waitlist & Form" description="Teks promosi di kiri dan label/konten form pendaftaran di kanan." />
      <FieldGroup title="Promosi waitlist">
        <Field label="Badge atas" value={draft.waitlist.badge} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, badge: v } }))} />
        <Field label="Judul (sebelum angka diskon)" value={draft.waitlist.titleBefore} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, titleBefore: v } }))} />
        <Field label="Angka diskon" value={draft.waitlist.discountPercent} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, discountPercent: v } }))} />
        <Field label="Deskripsi" value={draft.waitlist.description} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, description: v } }))} multiline hint="**bold** didukung" />
        <Field label="Label counter live" value={draft.waitlist.counterLabel} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, counterLabel: v } }))} />
      </FieldGroup>

      <FieldGroup title="Label form">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Judul form" value={draft.waitlist.form.title} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, title: v } } }))} />
          <Field label="Subtitle form" value={draft.waitlist.form.subtitle} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, subtitle: v } } }))} />
          <Field label="Label nama" value={draft.waitlist.form.nameLabel} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, nameLabel: v } } }))} />
          <Field label="Placeholder nama" value={draft.waitlist.form.namePlaceholder} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, namePlaceholder: v } } }))} />
          <Field label="Label WhatsApp" value={draft.waitlist.form.whatsappLabel} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, whatsappLabel: v } } }))} />
          <Field label="Placeholder WhatsApp" value={draft.waitlist.form.whatsappPlaceholder} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, whatsappPlaceholder: v } } }))} />
          <Field label="Label vibe" value={draft.waitlist.form.vibeLabel} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, vibeLabel: v } } }))} />
          <Field label="Tombol submit" value={draft.waitlist.form.submitText} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, submitText: v } } }))} />
        </div>
        <Field label="Disclaimer bawah form" value={draft.waitlist.form.disclaimer} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, disclaimer: v } } }))} multiline />
      </FieldGroup>

      <FieldGroup title="Setelah submit berhasil">
        <Field label="Judul sukses" value={draft.waitlist.form.successTitle} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, successTitle: v } } }))} hint="{name} = nama depan pendaftar" />
        <Field label="Pesan sukses" value={draft.waitlist.form.successMessage} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, successMessage: v } } }))} multiline hint="{scent}, {count}, **bold**" />
        <Field label="Teks ajakan refer teman" value={draft.waitlist.form.referText} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, referText: v } } }))} />
      </FieldGroup>

      <FieldGroup title="Pesan validasi & notifikasi">
        <Field label="Error nomor WA kurang" value={draft.waitlist.errors.whatsapp} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, errors: { ...c.waitlist.errors, whatsapp: v } } }))} />
        <Field label="Error nama kosong" value={draft.waitlist.errors.name} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, errors: { ...c.waitlist.errors, name: v } } }))} />
        <Field label="Toast sukses" value={draft.waitlist.toastSuccess} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, toastSuccess: v } }))} />
      </FieldGroup>
    </div>
  );
}

export function TestimonialsSection({ draft, patch }: EditorProps) {
  return (
    <div>
      <SectionHeader title="Testimonial Komunitas" description="Social proof dari komunitas — card dengan username dan quote." />
      <FieldGroup title="Judul section">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Sebelum highlight" value={draft.testimonials.titleBefore} onChange={(v) => patch((c) => ({ ...c, testimonials: { ...c.testimonials, titleBefore: v } }))} />
          <Field label="Highlight" value={draft.testimonials.titleHighlight} onChange={(v) => patch((c) => ({ ...c, testimonials: { ...c.testimonials, titleHighlight: v } }))} />
          <Field label="Setelah highlight" value={draft.testimonials.titleAfter} onChange={(v) => patch((c) => ({ ...c, testimonials: { ...c.testimonials, titleAfter: v } }))} />
        </div>
      </FieldGroup>

      <div className="flex justify-between items-center mt-6 mb-4">
        <h3 className="font-semibold text-black/70">Card ({draft.testimonials.cards.length})</h3>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, testimonials: { ...c.testimonials, cards: [...c.testimonials.cards, { id: createId("testimonial"), who: "@username", color: "#60BBFF", text: "Testimonial baru..." } satisfies TestimonialCard] } }))}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>
      <div className="space-y-3">
        {draft.testimonials.cards.map((card) => (
          <CardShell key={card.id} title={card.who} onDelete={() => patch((c) => ({ ...c, testimonials: { ...c.testimonials, cards: c.testimonials.cards.filter((x) => x.id !== card.id) } }))}>
            <Field label="Username" value={card.who} onChange={(v) => patch((c) => ({ ...c, testimonials: { ...c.testimonials, cards: c.testimonials.cards.map((x) => (x.id === card.id ? { ...x, who: v } : x)) } }))} />
            <Field label="Warna background card" value={card.color} onChange={(v) => patch((c) => ({ ...c, testimonials: { ...c.testimonials, cards: c.testimonials.cards.map((x) => (x.id === card.id ? { ...x, color: v } : x)) } }))} />
            <Field label="Isi quote" value={card.text} onChange={(v) => patch((c) => ({ ...c, testimonials: { ...c.testimonials, cards: c.testimonials.cards.map((x) => (x.id === card.id ? { ...x, text: v } : x)) } }))} multiline />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

export function FooterSection({ draft, patch }: EditorProps) {
  return (
    <div>
      <SectionHeader title="Footer" description="Informasi brand, link sosial, dan teks legal di bagian bawah halaman." />
      <FieldGroup title="Brand">
        <Field label="Nama brand" value={draft.footer.brandName} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, brandName: v } }))} />
        <Field label="Tagline" value={draft.footer.tagline} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, tagline: v } }))} multiline />
      </FieldGroup>

      <div className="flex justify-between items-center mt-6 mb-4">
        <h3 className="font-semibold text-black/70">Link sosial</h3>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, footer: { ...c.footer, socialLinks: [...c.footer.socialLinks, { id: createId("social"), label: "Link baru", href: "#" }] } }))}>
          <Plus className="size-4" /> Tambah link
        </Button>
      </div>
      <div className="space-y-3 mb-6">
        {draft.footer.socialLinks.map((link, i) => (
          <CardShell key={link.id} title={`Link ${i + 1}`} subtitle={link.label} onDelete={() => patch((c) => ({ ...c, footer: { ...c.footer, socialLinks: c.footer.socialLinks.filter((x) => x.id !== link.id) } }))}>
            <Field label="Label tampilan" value={link.label} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, socialLinks: c.footer.socialLinks.map((x) => (x.id === link.id ? { ...x, label: v } : x)) } }))} />
            <Field label="URL" value={link.href} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, socialLinks: c.footer.socialLinks.map((x) => (x.id === link.id ? { ...x, href: v } : x)) } }))} />
          </CardShell>
        ))}
      </div>

      <FieldGroup title="Legal & copyright">
        <Field label="Judul kolom legal" value={draft.footer.legalTitle} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, legalTitle: v } }))} />
        <Field label="Item legal (satu per baris)" value={draft.footer.legalItems.join("\n")} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, legalItems: v.split("\n").filter(Boolean) } }))} multiline />
        <Field label="Teks baris paling bawah" value={draft.footer.bottomText} onChange={(v) => patch((c) => ({ ...c, footer: { ...c.footer, bottomText: v } }))} />
      </FieldGroup>
    </div>
  );
}
