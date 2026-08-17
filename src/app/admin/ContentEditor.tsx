import { useState } from "react";
import type {
  CounterAvatarIconType,
  HeroShowcase,
  HeroShowcaseMobile,
  LandingContent,
  ScentCard,
  StoryIcon,
  TestimonialCard,
} from "@/content/types";
import { RichTextEditor } from "./components/RichTextEditor";
import { createId } from "@/content/storage";
import { defaultContent } from "@/content/defaultContent";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import {
  autoMobileRatio,
  getDesktopRatio,
  resolveShowcaseMobileView,
  showcaseMobileFromDesktop,
  type ShowcaseImageView,
} from "@/content/heroShowcaseLayout";
import { cn } from "../components/ui/utils";
import {
  CardShell,
  ColorField,
  Field,
  FieldGroup,
  NumberField,
  SectionHeader,
  SliderField,
} from "./components/AdminFields";
import { BrandLogoUpload } from "./components/BrandLogoUpload";
import { ImageUploadField } from "./components/ImageUploadField";
import { DecorationCanvasEditor } from "./components/DecorationCanvasEditor";
import { Switch } from "../components/ui/switch";

type PatchFn = (updater: (prev: LandingContent) => LandingContent) => void;

type EditorProps = {
  draft: LandingContent;
  patch: PatchFn;
  patchImage: PatchFn;
};

function HeroShowcaseFields({ draft, patch, patchImage }: EditorProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const showcase = { ...defaultContent.hero.showcase, ...(draft.hero.showcase ?? {}) };
  const setShowcase = (partial: Partial<HeroShowcase>) =>
    patch((c) => ({
      ...c,
      hero: {
        ...c.hero,
        showcase: { ...defaultContent.hero.showcase, ...(c.hero.showcase ?? {}), ...partial },
      },
    }));

  const setShowcaseMobile = (partial: Partial<HeroShowcaseMobile>) =>
    setShowcase({
      mobile: {
        ...defaultContent.hero.showcase.mobile,
        ...(showcase.mobile ?? {}),
        ...partial,
      },
    });

  const mobileOn = showcase.mobile?.enabled === true;
  const isMobileView = viewMode === "mobile";
  // Nilai yang benar-benar tampil di viewport yang sedang dipilih.
  const view = isMobileView
    ? resolveShowcaseMobileView(showcase)
    : {
        imageOffsetX: showcase.imageOffsetX,
        imageOffsetY: showcase.imageOffsetY,
        imageScale: showcase.imageScale,
        imageFit: showcase.imageFit,
        frameRatio: getDesktopRatio(showcase),
      };
  // Slider di tab mobile dikunci selama override belum dinyalakan.
  const locked = isMobileView && !mobileOn;
  const setView = (partial: Partial<ShowcaseImageView>) =>
    isMobileView ? setShowcaseMobile(partial) : setShowcase(partial);

  return (
    <FieldGroup title="Showcase produk & harga (di bawah judul)">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-black/80">Tampilkan blok ini</p>
          <p className="text-xs text-black/50 mt-0.5">
            Gambar produk di kiri + harga coret, harga akhir, dan hitung mundur di kanan.
          </p>
        </div>
        <Switch
          checked={showcase.enabled}
          onCheckedChange={(v) => setShowcase({ enabled: v })}
        />
      </div>

      {showcase.enabled && (
        <>
          <ImageUploadField
            label="Gambar produk"
            hint="Gambar horizontal disarankan. Setelah upload, atur posisi & zoom di bawah."
            imageUrl={showcase.imageUrl}
            alt={showcase.imageAlt}
            uploadPrefix="hero-showcase"
            allowLibrary
            onChange={(url) =>
              patchImage((c) => ({
                ...c,
                hero: {
                  ...c.hero,
                  showcase: {
                    ...defaultContent.hero.showcase,
                    ...(c.hero.showcase ?? {}),
                    imageUrl: url,
                  },
                },
              }))
            }
            previewClassName="w-full max-h-40 object-contain bg-[#fafafa]"
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-black/80">Posisi & ukuran gambar</p>
              <div className="inline-flex rounded-lg border border-black/10 bg-white p-1 shadow-sm">
                {(
                  [
                    { mode: "desktop", label: "Desktop", Icon: Monitor },
                    { mode: "mobile", label: "Mobile", Icon: Smartphone },
                  ] as const
                ).map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                      viewMode === mode
                        ? "bg-[#1172ba] text-white"
                        : "text-black/55 hover:text-black/80",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isMobileView && (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
                <div>
                  <p className="text-sm font-medium text-black/80">Pengaturan khusus HP</p>
                  <p className="text-xs text-black/50 mt-0.5">
                    Mati = ikut pengaturan desktop, rasio frame otomatis dibatasi{" "}
                    {autoMobileRatio(showcase).toFixed(1)} agar tidak terlalu pipih.
                  </p>
                </div>
                <Switch
                  checked={mobileOn}
                  onCheckedChange={(v) => {
                    // Sekali dinyalakan, nilai HP disalin dari desktop supaya tidak melompat.
                    // Kalau sudah pernah diatur (rasio terisi), nilainya dipertahankan.
                    if (v && (showcase.mobile?.frameRatio ?? 0) <= 0) {
                      setShowcase({ mobile: showcaseMobileFromDesktop(showcase) });
                    } else {
                      setShowcaseMobile({ enabled: v });
                    }
                  }}
                />
              </div>
            )}

            {/* Beri ruang di atas: gambar boleh menyembul melewati border atas */}
            <div
              className={cn(
                "relative w-full mt-12 rounded-2xl border-4 border-black",
                isMobileView && "max-w-[280px] mx-auto",
              )}
              style={{ aspectRatio: view.frameRatio, backgroundColor: showcase.frameColor }}
            >
              {showcase.imageUrl ? (
                <div
                  className="absolute inset-x-1 bottom-1 overflow-hidden rounded-b-xl pointer-events-none"
                  style={{ top: "calc(-300% - 4px)" }}
                >
                  <div className="absolute inset-x-0 bottom-0" style={{ height: "calc(25% - 8px)" }}>
                    <img
                      src={showcase.imageUrl}
                      alt={showcase.imageAlt}
                      className="w-full h-full"
                      style={{
                        objectFit: view.imageFit,
                        transform: `translate(${view.imageOffsetX}%, ${view.imageOffsetY}%) scale(${view.imageScale / 100})`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/85 text-sm">
                  Belum ada gambar
                </div>
              )}
            </div>
            <p className="text-xs text-black/45">
              Pratinjau frame versi {isMobileView ? "HP" : "desktop"}. Bagian atas gambar sengaja
              menimpa border dan tidak terpotong saat di-zoom — sisi kiri, kanan, dan bawah tetap rapi
              di dalam border.
              {locked && " Nyalakan pengaturan khusus HP di atas untuk mengubah nilainya."}
            </p>

            <SliderField
              label="Geser kiri / kanan"
              value={view.imageOffsetX}
              min={-100}
              max={100}
              suffix="%"
              disabled={locked}
              hint="Negatif = geser ke kiri, positif = geser ke kanan."
              onChange={(v) => setView({ imageOffsetX: v })}
            />
            <SliderField
              label="Geser atas / bawah"
              value={view.imageOffsetY}
              min={-100}
              max={100}
              suffix="%"
              disabled={locked}
              hint="Negatif = geser ke atas, positif = geser ke bawah."
              onChange={(v) => setView({ imageOffsetY: v })}
            />
            <SliderField
              label="Zoom gambar"
              value={view.imageScale}
              min={50}
              max={250}
              suffix="%"
              disabled={locked}
              hint="Perbesar dulu kalau mau menggeser gambar tanpa muncul celah di frame."
              onChange={(v) => setView({ imageScale: v })}
            />
            <SliderField
              label="Rasio frame (lebar ÷ tinggi)"
              value={view.frameRatio}
              min={0.8}
              max={4}
              step={0.1}
              disabled={locked}
              hint={
                isMobileView
                  ? "Di HP frame yang terlalu pipih bikin gambar kecil — coba 1.2–1.7."
                  : "2.9 = banner memanjang seperti desain. Makin kecil, makin tinggi framenya."
              }
              onChange={(v) => setView({ frameRatio: v })}
            />

            <div className={cn("space-y-1.5", locked && "opacity-50")}>
              <Label className="text-sm font-medium text-black/80">Cara gambar mengisi frame</Label>
              <div className="flex gap-2">
                {(["cover", "contain"] as const).map((fit) => (
                  <Button
                    key={fit}
                    type="button"
                    size="sm"
                    disabled={locked}
                    variant={view.imageFit === fit ? "default" : "outline"}
                    onClick={() => setView({ imageFit: fit })}
                  >
                    {fit === "cover" ? "Penuhi frame" : "Tampil utuh"}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-black/45">
                Penuhi frame = gambar dipotong agar rapat. Tampil utuh = gambar tidak terpotong.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <ColorField
                label="Warna latar frame"
                value={showcase.frameColor}
                onChange={(v) => setShowcase({ frameColor: v })}
              />
              <Field
                label="Teks alternatif gambar"
                value={showcase.imageAlt}
                onChange={(v) => setShowcase({ imageAlt: v })}
                hint="Untuk aksesibilitas & SEO"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-black/8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-black/80">Harga coret</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setShowcase({
                    strikePrices: [
                      ...showcase.strikePrices,
                      { id: createId("strike"), text: "Rp 0" },
                    ],
                  })
                }
              >
                <Plus className="size-4" /> Tambah harga
              </Button>
            </div>
            {showcase.strikePrices.length === 0 && (
              <p className="text-sm text-black/45 italic py-3 text-center border border-dashed rounded-xl">
                Belum ada harga coret.
              </p>
            )}
            {showcase.strikePrices.map((price, i) => (
              <div key={price.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label={`Harga coret ${i + 1}`}
                    value={price.text}
                    onChange={(v) =>
                      setShowcase({
                        strikePrices: showcase.strikePrices.map((x) =>
                          x.id === price.id ? { ...x, text: v } : x,
                        ),
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 mb-0.5"
                  onClick={() =>
                    setShowcase({
                      strikePrices: showcase.strikePrices.filter((x) => x.id !== price.id),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <ColorField
              label="Warna garis coret"
              value={showcase.strikeLineColor}
              onChange={(v) => setShowcase({ strikeLineColor: v })}
            />
            <RichTextEditor
              label="Catatan di kanan harga coret"
              value={showcase.note}
              onChange={(v) => setShowcase({ note: v })}
              note="Contoh: 1st Batch Disc. + Waiting list Disc."
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-black/8">
            <p className="text-sm font-medium text-black/80">Harga akhir</p>
            <Field
              label="Harga akhir"
              value={showcase.finalPrice}
              onChange={(v) => setShowcase({ finalPrice: v })}
              hint="Contoh: Rp 171.000. Kosongkan untuk menyembunyikan kotak harga."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <ColorField
                label="Warna kotak harga"
                value={showcase.finalPriceBg}
                onChange={(v) => setShowcase({ finalPriceBg: v })}
              />
              <ColorField
                label="Warna teks harga"
                value={showcase.finalPriceColor}
                onChange={(v) => setShowcase({ finalPriceColor: v })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-black/8">
            <p className="text-sm font-medium text-black/80">Badge diskon & hitung mundur</p>
            <Field
              label="Teks badge diskon"
              value={showcase.discountBadge}
              onChange={(v) => setShowcase({ discountBadge: v })}
              hint="Contoh: 24% + 10% off"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <ColorField
                label="Warna badge"
                value={showcase.discountBadgeBg}
                onChange={(v) => setShowcase({ discountBadgeBg: v })}
              />
              <ColorField
                label="Warna teks badge"
                value={showcase.discountBadgeColor}
                onChange={(v) => setShowcase({ discountBadgeColor: v })}
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
              <div>
                <p className="text-sm font-medium text-black/80">Tampilkan hitung mundur</p>
                <p className="text-xs text-black/50 mt-0.5">Format hari:jam:menit:detik</p>
              </div>
              <Switch
                checked={showcase.countdownEnabled}
                onCheckedChange={(v) => setShowcase({ countdownEnabled: v })}
              />
            </div>
            {showcase.countdownEnabled && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-black/80">Hitung mundur sampai</Label>
                <Input
                  type="datetime-local"
                  value={showcase.countdownEndsAt}
                  onChange={(e) => setShowcase({ countdownEndsAt: e.target.value })}
                  className="bg-white"
                />
                <p className="text-xs text-black/45">
                  Kosongkan untuk menampilkan 00:00:00:00. Waktu mengikuti zona waktu pengunjung.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </FieldGroup>
  );
}

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
            label="Logo header"
            hint="Logo di navigasi atas (tanpa teks di sampingnya di header)."
            logoUrl={draft.nav.brandLogoUrl ?? ""}
            brandName={draft.nav.brandName}
            onChange={(url) => patchImage((c) => ({ ...c, nav: { ...c.nav, brandLogoUrl: url } }))}
          />
          <RichTextEditor
            label="Nama brand (jika tanpa logo gambar)"
            value={draft.nav.brandName}
            onChange={(v) => patch((c) => ({ ...c, nav: { ...c.nav, brandName: v } }))}
            singleLine
            allowBold={false}
          />
        </FieldGroup>
        <FieldGroup title="Tab browser & favicon">
          <Field
            label="Judul tab browser"
            value={draft.site?.pageTitle ?? ""}
            onChange={(v) =>
              patch((c) => ({
                ...c,
                site: { ...defaultContent.site, ...c.site, pageTitle: v },
              }))
            }
            hint="Teks di tab browser, mis. evomi.id — Join the Waitlist"
          />
          <ImageUploadField
            label="Favicon"
            hint="PNG, SVG, atau ICO — disarankan 32×32 px atau 64×64 px"
            imageUrl={draft.site?.faviconUrl ?? ""}
            alt="Favicon"
            uploadPrefix="favicon"
            onChange={(url) =>
              patchImage((c) => ({
                ...c,
                site: { ...defaultContent.site, ...c.site, faviconUrl: url },
              }))
            }
            previewClassName="w-12 h-12 rounded-lg object-contain bg-white border border-black/10"
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
          <div className="grid sm:grid-cols-2 gap-4">
            <SliderField
              label="Ukuran teks di HP"
              value={draft.hero.counterSuffixSizeMobile ?? defaultContent.hero.counterSuffixSizeMobile}
              min={9}
              max={28}
              suffix="px"
              hint="Teks di bawah angka counter saat dibuka dari HP."
              onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, counterSuffixSizeMobile: v } }))}
            />
            <SliderField
              label="Ukuran teks di desktop"
              value={draft.hero.counterSuffixSize ?? defaultContent.hero.counterSuffixSize}
              min={9}
              max={32}
              suffix="px"
              hint="Berlaku mulai layar lebar (md ke atas)."
              onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, counterSuffixSize: v } }))}
            />
          </div>
          <div className="pt-2 border-t border-black/8 space-y-4">
            <p className="text-sm text-black/55">
              Ikon overlap di kiri angka counter. Pilih preset atau upload gambar kustom per lingkaran.
            </p>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={draft.hero.counterAvatars.length >= 6}
                onClick={() =>
                  patch((c) => ({
                    ...c,
                    hero: {
                      ...c.hero,
                      counterAvatars: [
                        ...c.hero.counterAvatars,
                        {
                          id: createId("counter"),
                          icon: "star" as CounterAvatarIconType,
                          bgColor: "#1172ba",
                          iconColor: "#60BBFF",
                          imageUrl: "",
                        },
                      ],
                    },
                  }))
                }
              >
                <Plus className="size-4" /> Tambah ikon
              </Button>
            </div>
            <div className="space-y-4">
              {draft.hero.counterAvatars.map((avatar, i) => (
                <CardShell
                  key={avatar.id}
                  title={`Ikon ${i + 1}`}
                  subtitle={avatar.imageUrl ? "Gambar kustom" : avatar.icon}
                  onDelete={
                    draft.hero.counterAvatars.length > 1
                      ? () =>
                          patch((c) => ({
                            ...c,
                            hero: {
                              ...c.hero,
                              counterAvatars: c.hero.counterAvatars.filter((x) => x.id !== avatar.id),
                            },
                          }))
                      : undefined
                  }
                >
                  <Field
                    label="Ikon preset"
                    value={avatar.icon}
                    onChange={(v) =>
                      patch((c) => ({
                        ...c,
                        hero: {
                          ...c.hero,
                          counterAvatars: c.hero.counterAvatars.map((x) =>
                            x.id === avatar.id ? { ...x, icon: v as CounterAvatarIconType } : x,
                          ),
                        },
                      }))
                    }
                    hint="star · dot · heart · sparkles · leaf · flame"
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <ColorField
                      label="Warna lingkaran"
                      value={avatar.bgColor}
                      onChange={(v) =>
                        patch((c) => ({
                          ...c,
                          hero: {
                            ...c.hero,
                            counterAvatars: c.hero.counterAvatars.map((x) =>
                              x.id === avatar.id ? { ...x, bgColor: v } : x,
                            ),
                          },
                        }))
                      }
                    />
                    <ColorField
                      label="Warna ikon"
                      value={avatar.iconColor}
                      onChange={(v) =>
                        patch((c) => ({
                          ...c,
                          hero: {
                            ...c.hero,
                            counterAvatars: c.hero.counterAvatars.map((x) =>
                              x.id === avatar.id ? { ...x, iconColor: v } : x,
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                  <ImageUploadField
                    label="Gambar kustom (opsional — menggantikan preset)"
                    imageUrl={avatar.imageUrl}
                    alt={`Ikon counter ${i + 1}`}
                    uploadPrefix="counter-icon"
                    onChange={(url) =>
                      patchImage((c) => ({
                        ...c,
                        hero: {
                          ...c.hero,
                          counterAvatars: c.hero.counterAvatars.map((x) =>
                            x.id === avatar.id ? { ...x, imageUrl: url } : x,
                          ),
                        },
                      }))
                    }
                  />
                </CardShell>
              ))}
            </div>
          </div>
        </FieldGroup>
        <FieldGroup title="Judul & deskripsi">
          <RichTextEditor
            label="Judul utama"
            value={draft.hero.title ?? ""}
            onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, title: v } }))}
            note="Headline besar di hero, contoh: Join the waiting list."
          />
          <RichTextEditor
            label="Subjudul baris 1"
            value={draft.hero.subtitleLine1 ?? ""}
            onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, subtitleLine1: v } }))}
          />
          <RichTextEditor
            label="Subjudul baris 2"
            value={draft.hero.subtitleLine2 ?? ""}
            onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, subtitleLine2: v } }))}
          />
          <RichTextEditor
            label="Paragraf deskripsi"
            value={draft.hero.description}
            onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, description: v } }))}
            allowBold
          />
          <Field label="Teks tombol CTA" value={draft.hero.ctaText} onChange={(v) => patch((c) => ({ ...c, hero: { ...c.hero, ctaText: v } }))} />
        </FieldGroup>

        <HeroShowcaseFields draft={draft} patch={patch} patchImage={patchImage} />

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
                        nameColor: "#000000",
                        sub: "Subtitle",
                        subColor: "#000000",
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
                    label="Warna nama (hex)"
                    value={m.nameColor ?? ""}
                    onChange={(v) =>
                      patch((c) => ({
                        ...c,
                        hero: {
                          ...c.hero,
                          mascots: c.hero.mascots.map((x) =>
                            x.id === m.id ? { ...x, nameColor: v } : x,
                          ),
                        },
                      }))
                    }
                    hint="Contoh: #000000"
                  />
                  <Field
                    label="Subtitle"
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
                  <Field
                    label="Warna subtitle (hex)"
                    value={m.subColor ?? ""}
                    onChange={(v) =>
                      patch((c) => ({
                        ...c,
                        hero: {
                          ...c.hero,
                          mascots: c.hero.mascots.map((x) =>
                            x.id === m.id ? { ...x, subColor: v } : x,
                          ),
                        },
                      }))
                    }
                    hint="Contoh: #1172ba"
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
      <SectionHeader title="Cerita Kami" description="Judul di tengah, gambar produk di bawah judul, lalu tiga kartu value proposition." />
      <FieldGroup title="Judul section">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Teks sebelum highlight 1" value={draft.story.titlePart1} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titlePart1: v } }))} />
          <Field label="Highlight 1" value={draft.story.titleHighlight1} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titleHighlight1: v } }))} />
          <Field label="Warna highlight 1 (hex)" value={draft.story.titleHighlight1Color} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titleHighlight1Color: v } }))} hint="Contoh: #F899C6" />
          <Field label="Teks tengah" value={draft.story.titlePart2} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titlePart2: v } }))} />
          <Field label="Highlight 2" value={draft.story.titleHighlight2} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titleHighlight2: v } }))} />
          <Field label="Warna highlight 2 (hex)" value={draft.story.titleHighlight2Color} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titleHighlight2Color: v } }))} hint="Contoh: #A5E194" />
        </div>
        <Field label="Penutup judul" value={draft.story.titlePart3} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, titlePart3: v } }))} />
      </FieldGroup>

      <FieldGroup title="Showcase produk (di atas kartu)">
        <ImageUploadField
          label="Gambar produk / 4 kotak"
          hint="Gambar khusus section Cerita Kami (tidak mengambil dari Aroma). Tampil di bawah judul, di atas tiga kartu. Kosongkan untuk fallback ke gambar kartu Aroma jika ada."
          imageUrl={draft.story.sideImageUrl ?? ""}
          alt="Produk EVOMI"
          uploadPrefix="story"
          onChange={(url) => patchImage((c) => ({ ...c, story: { ...c.story, sideImageUrl: url } }))}
          previewClassName="w-full max-h-48 rounded-xl object-contain"
        />
      </FieldGroup>

      <div className="flex justify-between items-center mt-6 mb-4">
        <h3 className="font-semibold text-black/70">Card ({draft.story.cards.length})</h3>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, story: { ...c.story, cards: [...c.story.cards, { id: createId("story"), icon: "heart" as StoryIcon, title: "Judul Baru", titleColor: "#1172ba", body: "Deskripsi card", bg: "#60BBFF" }] } }))}>
          <Plus className="size-4" /> Tambah card
        </Button>
      </div>
      <div className="space-y-3">
        {draft.story.cards.map((card, i) => (
          <CardShell key={card.id} title={card.title} subtitle={`Card ${i + 1}`} onDelete={() => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.filter((x) => x.id !== card.id) } }))}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Icon" value={card.icon} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, icon: v as StoryIcon } : x)) } }))} hint="heart · leaf · sparkles" />
              <Field label="Warna icon box" value={card.bg} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, bg: v } : x)) } }))} />
              <Field label="Warna judul (hex)" value={card.titleColor ?? ""} onChange={(v) => patch((c) => ({ ...c, story: { ...c.story, cards: c.story.cards.map((x) => (x.id === card.id ? { ...x, titleColor: v } : x)) } }))} hint="Contoh: #1172ba" />
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
        <RichTextEditor
          label="Judul utama"
          value={draft.scents.title ?? ""}
          onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, title: v } }))}
          allowInlineImages
          uploadPrefix="scent-title"
          note="Gunakan «Tambah baris baru» untuk pindah baris. «Tambah gambar» atau «Tambah ikon hati» untuk elemen di sela teks."
          previewOptions={{ inlineImageHeight: "0.85em" }}
        />
        <Field label="Deskripsi" value={draft.scents.description} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, description: v } }))} multiline />
      </FieldGroup>

      <div className="flex justify-between items-center mt-6 mb-4">
        <h3 className="font-semibold text-black/70">Card aroma ({draft.scents.cards.length})</h3>
        <Button size="sm" onClick={() => patch((c) => ({ ...c, scents: { ...c.scents, cards: [...c.scents.cards, { id: createId("scent"), name: "Nama", sub: "Subtitle", color: "#1172ba", soft: "#ffffff", nameColor: "#000000", subColor: "#1172ba", vibeColor: "#4a4a4a", descColor: "#333333", emoji: "✨", imageUrl: "", imageScale: 100, imageOffsetY: 5, stickerImageUrl: "", stickerColor: "#FFD521", vibe: "vibe...", desc: "deskripsi..." } satisfies ScentCard] } }))}>
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
            {card.imageUrl ? (
              <FieldGroup title="Ukuran & posisi foto produk">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div
                    className="w-32 shrink-0 aspect-[3/4] relative overflow-hidden rounded-xl border-2 border-black/10"
                    style={{ backgroundColor: card.color }}
                  >
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        transform: `translateY(${card.imageOffsetY ?? 5}%) scale(${(card.imageScale ?? 100) / 100})`,
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <SliderField
                      label="Ukuran gambar"
                      value={card.imageScale ?? 100}
                      min={50}
                      max={200}
                      suffix="%"
                      hint="100% = memenuhi area card. Kecilkan agar produk terlihat utuh, besarkan untuk zoom."
                      onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, imageScale: v } : x)) } }))}
                    />
                    <SliderField
                      label="Geser vertikal"
                      value={card.imageOffsetY ?? 5}
                      min={-50}
                      max={50}
                      suffix="%"
                      hint="Negatif = naik, positif = turun."
                      onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, imageOffsetY: v } : x)) } }))}
                    />
                  </div>
                </div>
              </FieldGroup>
            ) : null}
            <ImageUploadField
              label="Stiker pojok (ganti bintang berputar)"
              hint="PNG transparan disarankan. Kosongkan untuk pakai bintang kuning."
              imageUrl={card.stickerImageUrl ?? ""}
              alt={`Stiker ${card.name}`}
              uploadPrefix="scent-sticker"
              onChange={(url) =>
                patchImage((c) => ({
                  ...c,
                  scents: {
                    ...c.scents,
                    cards: c.scents.cards.map((x) =>
                      x.id === card.id ? { ...x, stickerImageUrl: url } : x,
                    ),
                  },
                }))
              }
              previewClassName="w-24 h-24 rounded-xl object-contain bg-[#fafafa]"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nama" value={card.name} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, name: v } : x)) } }))} />
              <Field label="Subtitle" value={card.sub} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, sub: v } : x)) } }))} />
              <Field label="Emoji (jika tanpa gambar atas)" value={card.emoji} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, emoji: v } : x)) } }))} />
              <Field label="Vibe" value={card.vibe} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, vibe: v } : x)) } }))} />
            </div>
            <FieldGroup title="Warna teks">
              <div className="grid sm:grid-cols-2 gap-4">
                <ColorField label="Nama" value={card.nameColor ?? "#000000"} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, nameColor: v } : x)) } }))} />
                <ColorField label="Subtitle" value={card.subColor ?? card.color} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, subColor: v } : x)) } }))} />
                <ColorField label="Vibe" value={card.vibeColor ?? "#4a4a4a"} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, vibeColor: v } : x)) } }))} />
                <ColorField label="Deskripsi" value={card.descColor ?? "#333333"} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, descColor: v } : x)) } }))} />
              </div>
            </FieldGroup>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Warna latar foto (atas)" value={card.color} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, color: v } : x)) } }))} hint="Bukan warna teks — hanya belakang area gambar produk" />
              <ColorField label="Bintang (jika tanpa stiker)" value={card.stickerColor ?? "#FFD521"} onChange={(v) => patch((c) => ({ ...c, scents: { ...c.scents, cards: c.scents.cards.map((x) => (x.id === card.id ? { ...x, stickerColor: v } : x)) } }))} />
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
        <div className="grid sm:grid-cols-2 gap-4">
          <ColorField
            label="Warna teks judul"
            value={draft.waitlist.titleColor ?? "#FFFFFF"}
            onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, titleColor: v } }))}
            hint="Teks utama di kiri section waitlist"
          />
          <ColorField
            label="Warna angka diskon"
            value={draft.waitlist.discountPercentColor ?? "#FFD521"}
            onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, discountPercentColor: v } }))}
            hint="Mis. 20% — default kuning (#FFD521)"
          />
        </div>
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
          <Field label="Tombol submit" value={draft.waitlist.form.submitText} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, submitText: v } } }))} />
        </div>
        <Field label="Disclaimer bawah form" value={draft.waitlist.form.disclaimer} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, disclaimer: v } } }))} multiline />
      </FieldGroup>

      <FieldGroup title="Setelah submit berhasil">
        <Field label="Judul sukses" value={draft.waitlist.form.successTitle} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, successTitle: v } } }))} hint="{name} = nama depan pendaftar" />
        <Field label="Pesan sukses" value={draft.waitlist.form.successMessage} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, successMessage: v } } }))} multiline hint="{count}, **bold**" />
        <Field label="Teks ajakan refer teman" value={draft.waitlist.form.referText} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, referText: v } } }))} hint="Judul di atas tombol share" />
        <Field label="Pesan share" value={draft.waitlist.form.shareMessage ?? ""} onChange={(v) => patch((c) => ({ ...c, waitlist: { ...c.waitlist, form: { ...c.waitlist.form, shareMessage: v } } }))} multiline hint="Teks yang dibagikan ke WhatsApp, X, Telegram, dll." />
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

export function SeoSection({ draft, patch, patchImage }: EditorProps) {
  const site = { ...defaultContent.site, ...draft.site };
  const patchSite = (partial: Partial<typeof site>) =>
    patch((c) => ({ ...c, site: { ...defaultContent.site, ...c.site, ...partial } }));

  const descLen = (site.metaDescription ?? "").length;
  const titleLen = (site.pageTitle ?? "").length;

  return (
    <div>
      <SectionHeader
        title="SEO & Iklan"
        description="Pengaturan agar website tampil bagus di Google, saat link di-share (IG/FB/WhatsApp), dan siap dipasangi tracking iklan. Berlaku di versi produksi (Railway)."
      />
      <div className="space-y-5">
        <FieldGroup title="Judul & deskripsi (Google & preview share)">
          <Field
            label="Judul halaman (title)"
            value={site.pageTitle ?? ""}
            onChange={(v) => patchSite({ pageTitle: v })}
            hint={`Dipakai di tab browser, hasil Google, dan og:title. Ideal 50–60 karakter. Saat ini: ${titleLen}`}
          />
          <Field
            label="Meta description"
            value={site.metaDescription ?? ""}
            onChange={(v) => patchSite({ metaDescription: v })}
            multiline
            hint={`Ringkasan di hasil Google & preview share. Ideal 150–160 karakter. Saat ini: ${descLen}`}
          />
        </FieldGroup>

        <FieldGroup title="Gambar preview saat link di-share (OG image)">
          <p className="text-sm text-black/55 mb-1">
            Gambar yang muncul saat link evomi.id dibagikan di Instagram, Facebook, WhatsApp, dll.
            Disarankan rasio 1.91:1 (mis. 1200×630 px). Bisa upload baru atau pilih dari galeri.
          </p>
          <ImageUploadField
            label="OG image"
            imageUrl={site.ogImageUrl ?? ""}
            alt="Preview share evomi.id"
            uploadPrefix="og"
            allowLibrary
            onChange={(url) => patchImage((c) => ({ ...c, site: { ...defaultContent.site, ...c.site, ogImageUrl: url } }))}
            previewClassName="w-full aspect-[1.91/1] max-h-56 rounded-xl object-cover"
          />
        </FieldGroup>

        <FieldGroup title="Alamat situs">
          <Field
            label="URL situs (canonical)"
            value={site.siteUrl ?? ""}
            onChange={(v) => patchSite({ siteUrl: v })}
            hint="Contoh: https://evomi.id — dipakai untuk canonical, og:url, dan schema. Kosongkan untuk deteksi otomatis dari domain."
          />
        </FieldGroup>

        <FieldGroup title="Tracking iklan (pixel)">
          <p className="text-sm text-black/55 mb-1">
            Untuk mengukur konversi (pendaftar dari iklan) & retargeting. Kosongkan jika belum dipasang —
            tidak ada script yang dimuat kalau kosong.
          </p>
          <Field
            label="Meta Pixel ID (Instagram / Facebook Ads)"
            value={site.metaPixelId ?? ""}
            onChange={(v) => patchSite({ metaPixelId: v })}
            hint="Angka ID pixel dari Meta Events Manager, mis. 1234567890"
          />
          <Field
            label="Google Tag ID (Google Ads / GA4)"
            value={site.googleTagId ?? ""}
            onChange={(v) => patchSite({ googleTagId: v })}
            hint="Mis. G-XXXXXXX (GA4) atau AW-XXXXXXXXX (Google Ads)"
          />
        </FieldGroup>

        <FieldGroup title="Indexing mesin pencari">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
            <div>
              <p className="text-sm font-medium text-black/80">Blokir mesin pencari (noindex)</p>
              <p className="text-xs text-black/50 mt-0.5">
                Aktifkan hanya saat masih uji coba/staging. Untuk website yang diiklankan & ingin muncul di
                Google, biarkan <strong>mati</strong>.
              </p>
            </div>
            <Switch
              checked={!!site.blockSearchEngines}
              onCheckedChange={(v) => patchSite({ blockSearchEngines: v })}
            />
          </div>
        </FieldGroup>
      </div>
    </div>
  );
}

export function FooterSection({ draft, patch, patchImage }: EditorProps) {
  return (
    <div>
      <SectionHeader title="Footer" description="Informasi brand, link sosial, dan teks legal di bagian bawah halaman." />
      <FieldGroup title="Brand">
        <BrandLogoUpload
          label="Logo footer"
          logoUrl={draft.footer.brandLogoUrl ?? ""}
          brandName={draft.footer.brandName}
          uploadPrefix="footer-brand"
          hint="Logo di footer (bisa berbeda dari logo header). Kosongkan untuk placeholder gradient."
          onChange={(url) => patchImage((c) => ({ ...c, footer: { ...c.footer, brandLogoUrl: url } }))}
        />
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
