import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, RefreshCw, Search, Trash2, Users } from "lucide-react";
import type { WaitlistSubmission } from "@/content/waitlistTypes";
import {
  exportSubmissionsCsv,
  fetchSubmissions,
  removeSubmission,
  updateSubmission,
} from "@/content/waitlistStorage";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { SectionHeader, StatCard } from "./components/AdminFields";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Nomor disimpan tanpa awalan +62 (form landing page memakai prefix terpisah),
 * jadi awalan 62/0 yang ikut ter-paste dibuang saat disimpan.
 */
function normalizeWhatsapp(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits.slice(2).replace(/^0+/, "");
  return digits.replace(/^0+/, "");
}

/** Modal untuk mengubah data satu pendaftar waitlist. */
function EditLeadDialog({
  lead,
  onOpenChange,
  onSaved,
}: {
  lead: WaitlistSubmission | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: WaitlistSubmission) => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [scent, setScent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setName(lead.name);
    setWhatsapp(lead.whatsapp);
    setScent(lead.scent ?? "");
    setSaving(false);
  }, [lead]);

  async function handleSave() {
    if (!lead) return;
    if (!name.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    const digits = normalizeWhatsapp(whatsapp);
    if (digits.length < 9) {
      toast.error("Nomor WhatsApp minimal 9 digit");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSubmission(lead.id, {
        name,
        whatsapp: digits,
        scent,
      });
      onSaved(updated);
      toast.success("Data pendaftar diperbarui");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={lead !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit pendaftar</DialogTitle>
          <DialogDescription>
            Perubahan langsung tersimpan ke database waitlist.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-black/80">Nama</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama pendaftar"
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-black/80">WhatsApp</Label>
            <div className="flex gap-2">
              <span className="shrink-0 px-3 flex items-center rounded-md border border-black/10 bg-black/[0.03] text-sm text-black/60">
                +62
              </span>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="tel"
                placeholder="81234567890"
                className="bg-white tabular-nums"
              />
            </div>
            <p className="text-xs text-black/45">
              Tanpa awalan +62 atau 0. Contoh: 81234567890
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-black/80">Aroma</Label>
            <Input
              value={scent}
              onChange={(e) => setScent(e.target.value)}
              placeholder="Opsional"
              className="bg-white"
            />
          </div>

          <p className="text-xs text-black/45">
            Waktu daftar: {lead ? formatDate(lead.submittedAt) : "—"}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WaitlistLeads() {
  const [leads, setLeads] = useState<WaitlistSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<WaitlistSubmission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchSubmissions();
    setLeads(data.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.whatsapp.includes(q) ||
        (l.scent?.trim() && l.scent.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  const showScentColumn = leads.some((l) => l.scent?.trim());

  const weekCount = leads.filter((l) => {
    const d = new Date(l.submittedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus pendaftar "${name}" dari daftar?`)) return;
    const next = await removeSubmission(id);
    setLeads(next.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    toast.success("Pendaftar dihapus");
  }

  function handleSaved(updated: WaitlistSubmission) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const todayCount = leads.filter((l) => {
    const d = new Date(l.submittedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pendaftar Waitlist"
        description="Daftar orang yang sudah mengisi form di landing page. Data tersimpan otomatis setiap kali ada pendaftaran baru."
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total pendaftar" value={leads.length} accent="#1172ba" />
        <StatCard label="Daftar hari ini" value={todayCount} accent="#5EA14A" />
        <StatCard
          label="7 hari terakhir"
          value={weekCount}
          hint="Pendaftar minggu ini"
          accent="#DD74A5"
        />
      </div>

      <div className="rounded-2xl border border-black/8 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-black/6 bg-[#fafafa]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-black/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau WhatsApp..."
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSubmissionsCsv(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-black/45">Memuat data pendaftar...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[#1172ba]/10 flex items-center justify-center mx-auto mb-4">
              <Users className="size-7 text-[#1172ba]" />
            </div>
            <p className="font-medium text-black/70">
              {query ? "Tidak ada hasil untuk pencarian ini" : "Belum ada pendaftar"}
            </p>
            <p className="text-sm text-black/45 mt-1 max-w-sm mx-auto">
              {query
                ? "Coba kata kunci lain atau kosongkan kolom pencarian."
                : "Data akan muncul otomatis ketika seseorang mengisi form waitlist di landing page."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>WhatsApp</TableHead>
                {showScentColumn ? <TableHead>Aroma</TableHead> : null}
                <TableHead>Waktu daftar</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead, i) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-black/45 tabular-nums">{i + 1}</TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <a
                      href={`https://wa.me/62${lead.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1172ba] hover:underline tabular-nums"
                    >
                      +62 {lead.whatsapp}
                    </a>
                  </TableCell>
                  {showScentColumn ? (
                    <TableCell>
                      {lead.scent?.trim() ? (
                        <Badge variant="secondary" className="font-normal">
                          {lead.scent}
                        </Badge>
                      ) : (
                        <span className="text-black/35">—</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-black/55 text-sm whitespace-nowrap">
                    {formatDate(lead.submittedAt)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${lead.name}`}
                      className="text-black/55 hover:text-[#1172ba] hover:bg-[#1172ba]/10"
                      onClick={() => setEditing(lead)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Hapus ${lead.name}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(lead.id, lead.name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-black/6 text-xs text-black/45 bg-[#fafafa]">
            Menampilkan {filtered.length} dari {leads.length} pendaftar
          </div>
        )}
      </div>

      <EditLeadDialog
        lead={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
