import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw, Search, Trash2, Users } from "lucide-react";
import type { WaitlistSubmission } from "@/content/waitlistTypes";
import {
  exportSubmissionsCsv,
  fetchSubmissions,
  removeSubmission,
} from "@/content/waitlistStorage";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
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

export function WaitlistLeads() {
  const [leads, setLeads] = useState<WaitlistSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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
        l.scent.toLowerCase().includes(q),
    );
  }, [leads, query]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus pendaftar "${name}" dari daftar?`)) return;
    const next = await removeSubmission(id);
    setLeads(next.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    toast.success("Pendaftar dihapus");
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
          label="Aroma populer"
          value={
            leads.length
              ? Object.entries(
                  leads.reduce<Record<string, number>>((acc, l) => {
                    acc[l.scent] = (acc[l.scent] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
              : "—"
          }
          hint={leads.length ? "Berdasarkan pilihan vibe" : "Belum ada data"}
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
              placeholder="Cari nama, WhatsApp, atau aroma..."
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
                <TableHead>Aroma</TableHead>
                <TableHead>Waktu daftar</TableHead>
                <TableHead className="w-16 text-right">Aksi</TableHead>
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
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {lead.scent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-black/55 text-sm whitespace-nowrap">
                    {formatDate(lead.submittedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
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
    </div>
  );
}
