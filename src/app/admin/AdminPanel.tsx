import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  FileText,
  Flame,
  Footprints,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  RotateCcw,
  Save,
  ScrollText,
  Settings,
  Sparkles,
  Upload,
  Users,
  Wind,
} from "lucide-react";
import { useContent } from "@/content/ContentContext";
import type { LandingContent } from "@/content/types";
import { defaultContent } from "@/content/defaultContent";
import { exportContent } from "@/content/storage";
import { fetchSubmissions } from "@/content/waitlistStorage";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { isAdminAuthenticated, logoutAdmin } from "./AdminLogin";
import { StatCard } from "./components/AdminFields";
import { WaitlistLeads } from "./WaitlistLeads";
import {
  FooterSection,
  HeroSection,
  MarqueeSection,
  ScentsSection,
  StorySection,
  TestimonialsSection,
  WaitlistFormSection,
} from "./ContentEditor";

type AdminView =
  | "dashboard"
  | "leads"
  | "hero"
  | "marquee"
  | "story"
  | "scents"
  | "waitlist"
  | "testimonials"
  | "footer"
  | "settings";

const CONTENT_NAV: { id: AdminView; label: string; icon: typeof Sparkles }[] = [
  { id: "hero", label: "Hero & Nav", icon: Sparkles },
  { id: "marquee", label: "Marquee", icon: ScrollText },
  { id: "story", label: "Cerita Kami", icon: FileText },
  { id: "scents", label: "Aroma", icon: Wind },
  { id: "waitlist", label: "Waitlist & Form", icon: Flame },
  { id: "testimonials", label: "Testimonial", icon: MessageSquareQuote },
  { id: "footer", label: "Footer", icon: Footprints },
];

export function AdminPanel() {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  const { content, updateContent, saveContent, resetContent, saving } = useContent();
  const [draft, setDraft] = useState<LandingContent>(content);
  const [view, setView] = useState<AdminView>("dashboard");
  const [isDirty, setIsDirty] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const initialLoad = useRef(true);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLoad.current) {
      setDraft(content);
      initialLoad.current = false;
    }
  }, [content]);

  useEffect(() => {
    fetchSubmissions().then((list) => setLeadCount(list.length));
  }, [view]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  function patch(updater: (prev: LandingContent) => LandingContent) {
    setDraft((prev) => {
      const next = updater(prev);
      setIsDirty(true);

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void saveContent(next).then(({ serverSaved }) => {
          if (serverSaved) {
            updateContent(next);
            setIsDirty(false);
          }
        });
      }, 1500);

      return next;
    });
  }

  async function handleSave() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const { serverSaved } = await saveContent(draft);
    updateContent(draft);
    setIsDirty(false);
    if (serverSaved) {
      toast.success("Konten tersimpan ke PostgreSQL");
    } else {
      toast.error("Gagal simpan ke server — cek DATABASE_URL & log deploy (GET /api/health)");
    }
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as LandingContent;
        setDraft(parsed);
        setIsDirty(true);
        toast.success("JSON diimport — klik Simpan untuk menerapkan");
      } catch {
        toast.error("File JSON tidak valid");
      }
    };
    reader.readAsText(file);
  }

  function renderContent() {
    const props = { draft, patch };
    switch (view) {
      case "hero":
        return <HeroSection {...props} />;
      case "marquee":
        return <MarqueeSection {...props} />;
      case "story":
        return <StorySection {...props} />;
      case "scents":
        return <ScentsSection {...props} />;
      case "waitlist":
        return <WaitlistFormSection {...props} />;
      case "testimonials":
        return <TestimonialsSection {...props} />;
      case "footer":
        return <FooterSection {...props} />;
      case "leads":
        return <WaitlistLeads />;
      case "settings":
        return (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-semibold text-[#1172ba]">Pengaturan</h2>
              <p className="text-sm text-black/55 mt-1">Backup, restore, dan reset konten landing page.</p>
            </div>
            <div className="rounded-2xl border border-black/8 bg-white p-6 space-y-4 shadow-sm">
              <Button variant="outline" className="w-full justify-start" onClick={() => exportContent(draft)}>
                <Download className="size-4" />
                Export konten (JSON)
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" />
                Import konten (JSON)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm("Reset semua konten ke default? Tindakan ini tidak bisa dibatalkan.")) {
                    resetContent();
                    setDraft(structuredClone(defaultContent));
                    updateContent(defaultContent);
                    setIsDirty(false);
                    toast.info("Konten direset");
                  }
                }}
              >
                <RotateCcw className="size-4" />
                Reset ke default
              </Button>
            </div>
            <p className="text-xs text-black/45 leading-relaxed">
              Password admin diatur lewat file <code className="bg-black/5 px-1 rounded">.env</code> dengan key{" "}
              <code className="bg-black/5 px-1 rounded">VITE_ADMIN_PASSWORD</code>.
            </p>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#1172ba]">Ringkasan</h2>
              <p className="text-sm text-black/55 mt-1">Selamat datang di admin EVOMI. Pilih menu di sidebar untuk mulai mengedit.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Pendaftar waitlist" value={leadCount} accent="#1172ba" hint="Klik menu Pendaftar untuk detail" />
              <StatCard label="Card aroma" value={draft.scents.cards.length} accent="#DD74A5" />
              <StatCard label="Card cerita" value={draft.story.cards.length} accent="#5EA14A" />
              <StatCard label="Testimonial" value={draft.testimonials.cards.length} accent="#FFD521" />
            </div>
            <div className="rounded-2xl border border-[#1172ba]/20 bg-[#1172ba]/5 p-5">
              <h3 className="font-semibold text-[#1172ba] mb-2">Tips cepat</h3>
              <ul className="text-sm text-black/65 space-y-2 list-disc pl-5">
                <li>Edit konten per section lewat menu <strong>Konten Landing</strong></li>
                <li>Lihat & export pendaftar di menu <strong>Pendaftar Waitlist</strong></li>
                <li>Klik <strong>Simpan Perubahan</strong> setelah selesai edit agar tampil di landing page</li>
                <li>Gunakan <strong>**teks**</strong> untuk bold di deskripsi</li>
              </ul>
            </div>
          </div>
        );
    }
  }

  const viewTitle =
    view === "dashboard"
      ? "Ringkasan"
      : view === "leads"
        ? "Pendaftar Waitlist"
        : view === "settings"
          ? "Pengaturan"
          : CONTENT_NAV.find((n) => n.id === view)?.label ?? "Admin";

  return (
    <div className="h-screen flex overflow-hidden bg-[#f0f4f8] font-sans">
      {/* Sidebar — fixed, tidak ikut scroll main */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col h-full bg-[#1172ba] text-white">
        <div className="p-5 border-b border-white/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "conic-gradient(from 0deg, #FFD521, #F50000, #B900B4, #fff, #FFD521)" }} />
            <div>
              <p className="font-semibold leading-tight">EVOMI Admin</p>
              <p className="text-[10px] text-white/55 uppercase tracking-widest">CMS Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavBtn active={view === "dashboard"} onClick={() => setView("dashboard")} icon={LayoutDashboard} label="Ringkasan" />
          <NavBtn active={view === "leads"} onClick={() => setView("leads")} icon={Users} label="Pendaftar Waitlist" badge={leadCount > 0 ? String(leadCount) : undefined} />

          <p className="text-[10px] uppercase tracking-widest text-white/40 px-3 pt-4 pb-2">Konten Landing</p>
          {CONTENT_NAV.map((item) => (
            <NavBtn key={item.id} active={view === item.id} onClick={() => setView(item.id)} icon={item.icon} label={item.label} />
          ))}

          <p className="text-[10px] uppercase tracking-widest text-white/40 px-3 pt-4 pb-2">Sistem</p>
          <NavBtn active={view === "settings"} onClick={() => setView("settings")} icon={Settings} label="Pengaturan" />
        </nav>

        <div className="p-3 border-t border-white/15 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Lihat landing page
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => {
              logoutAdmin();
              window.location.href = "/admin";
            }}
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main — hanya <main> yang scroll */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="shrink-0 z-40 bg-white border-b border-black/8 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-black/45 lg:hidden">EVOMI Admin</p>
              <h1 className="text-lg font-semibold text-[#1172ba]">{viewTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 hidden sm:flex">
                  Belum disimpan
                </Badge>
              )}
              <Button variant="outline" size="sm" className="lg:hidden" asChild>
                <Link to="/">Landing</Link>
              </Button>
              {view !== "leads" && view !== "dashboard" && view !== "settings" && (
                <Button size="sm" onClick={handleSave} disabled={saving || !isDirty} className="bg-[#1172ba] hover:bg-[#0e5f9e]">
                  <Save className="size-4" />
                  <span className="hidden sm:inline">{saving ? "Menyimpan..." : "Simpan"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <div className="flex lg:hidden gap-1 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
            <MobileNavChip active={view === "dashboard"} onClick={() => setView("dashboard")} label="Ringkasan" />
            <MobileNavChip active={view === "leads"} onClick={() => setView("leads")} label={`Pendaftar${leadCount ? ` (${leadCount})` : ""}`} />
            {CONTENT_NAV.map((item) => (
              <MobileNavChip key={item.id} active={view === item.id} onClick={() => setView(item.id)} label={item.label} />
            ))}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-28">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-black/8 shadow-sm p-5 md:p-8 min-h-[60vh]">
            {renderContent()}
          </div>
        </main>

        {/* Sticky save bar */}
        {isDirty && view !== "leads" && view !== "dashboard" && view !== "settings" && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-black/10 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <p className="text-sm text-black/60">Ada perubahan yang belum disimpan</p>
              <Button onClick={handleSave} disabled={saving} className="bg-[#1172ba] hover:bg-[#0e5f9e] shrink-0">
                <Save className="size-4" />
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutDashboard;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
        active ? "bg-white text-[#1172ba] font-semibold shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${active ? "bg-[#1172ba]/15 text-[#1172ba]" : "bg-white/20 text-white"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active ? "bg-[#1172ba] text-white" : "bg-black/5 text-black/60"
      }`}
    >
      {label}
    </button>
  );
}
