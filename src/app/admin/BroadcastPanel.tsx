import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import type { WaitlistSubmission } from "@/content/waitlistTypes";
import { fetchSubmissions } from "@/content/waitlistStorage";
import {
  fetchBroadcastHistory,
  fetchFonnteStatus,
  fetchRecipientSummary,
  renderPreview,
  sendBroadcast,
  type BroadcastCampaign,
  type FonnteStatus,
  type RecipientSummary,
} from "@/content/broadcastApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { SectionHeader, StatCard } from "./components/AdminFields";
import { ImageUploadField } from "./components/ImageUploadField";

const DRAFT_KEY = "evomi-broadcast-draft";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BroadcastPanel() {
  const [status, setStatus] = useState<FonnteStatus | null>(null);
  const [summary, setSummary] = useState<RecipientSummary | null>(null);
  const [leads, setLeads] = useState<WaitlistSubmission[]>([]);
  const [history, setHistory] = useState<BroadcastCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [delay, setDelay] = useState("2-10");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [testNumber, setTestNumber] = useState("");

  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [statusRes, summaryRes, historyRes, leadsRes] = await Promise.allSettled([
      fetchFonnteStatus(),
      fetchRecipientSummary(),
      fetchBroadcastHistory(),
      fetchSubmissions(),
    ]);

    if (statusRes.status === "fulfilled") setStatus(statusRes.value);
    else setStatus({ configured: false, message: statusRes.reason?.message });

    if (summaryRes.status === "fulfilled") setSummary(summaryRes.value);
    if (historyRes.status === "fulfilled") setHistory(historyRes.value);
    if (leadsRes.status === "fulfilled") {
      setLeads(
        leadsRes.value.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Draft pesan disimpan lokal supaya tidak hilang saat pindah menu */
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) setMessage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, message);
  }, [message]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.whatsapp.includes(q),
    );
  }, [leads, query]);

  const recipientCount = sendToAll ? (summary?.valid ?? 0) : selectedIds.length;
  const previewName = leads[0]?.name ?? "Kak Budi";
  const canSend =
    message.trim().length > 0 &&
    recipientCount > 0 &&
    !sending &&
    !imageUploading &&
    status?.configured;

  function toggleLead(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function insertPlaceholder() {
    setMessage((prev) => `${prev}{nama}`);
  }

  async function handleTest() {
    if (!testNumber.trim()) {
      toast.error("Isi nomor tes dulu");
      return;
    }
    if (!message.trim()) {
      toast.error("Pesan masih kosong");
      return;
    }
    setTesting(true);
    try {
      const res = await sendBroadcast({
        message,
        imageUrl: imageUrl.trim() || undefined,
        delay,
        testNumber: testNumber.trim(),
      });
      if (res.success) {
        toast.success(`Pesan tes dikirim ke ${testNumber}`);
      } else {
        toast.error(res.failures?.[0]?.reason ?? res.detail ?? "Pesan tes gagal");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pesan tes gagal");
    } finally {
      setTesting(false);
    }
  }

  async function handleSend() {
    setConfirmOpen(false);
    setSending(true);
    try {
      const res = await sendBroadcast({
        message,
        imageUrl: imageUrl.trim() || undefined,
        delay,
        recipientIds: sendToAll ? null : selectedIds,
      });
      const c = res.campaign;
      if (c) {
        if (c.status === "failed") {
          toast.error(`Broadcast gagal — ${c.detail ?? "cek status device Fonnte"}`);
        } else if (c.status === "partial") {
          toast.warning(
            `Terkirim ${c.successCount} dari ${c.targetCount} nomor (${c.failedCount} gagal)`,
          );
        } else {
          toast.success(`Broadcast masuk antrian untuk ${c.successCount} nomor`);
        }
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim broadcast");
    } finally {
      setSending(false);
    }
  }

  const device = status?.device;
  const deviceConnected = device?.status === "connect";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Broadcast WhatsApp"
        description="Kirim pesan ke semua nomor pendaftar waitlist lewat Fonnte. Gunakan {nama} untuk menyapa penerima dengan namanya."
      />

      {/* Status integrasi */}
      <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                deviceConnected ? "bg-[#5EA14A]/12" : "bg-amber-500/12"
              }`}
            >
              <Smartphone
                className={`size-5 ${deviceConnected ? "text-[#5EA14A]" : "text-amber-600"}`}
              />
            </div>
            <div>
              <p className="font-semibold text-black/80">
                {loading
                  ? "Mengecek Fonnte..."
                  : !status?.configured
                    ? "Fonnte belum dikonfigurasi"
                    : deviceConnected
                      ? `Device tersambung — ${device?.device ?? "nomor tidak diketahui"}`
                      : "Device Fonnte belum tersambung"}
              </p>
              <p className="text-sm text-black/50 mt-0.5 max-w-xl">
                {!status?.configured
                  ? (status?.message ??
                    "Set FONNTE_TOKEN di .env (lokal) atau environment variable Railway, lalu restart server.")
                  : (status?.message ??
                    `Sisa kuota: ${device?.quota ?? "-"} · Terkirim: ${device?.messages ?? "-"}`)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Nomor siap dikirim" value={summary?.valid ?? 0} accent="#1172ba" />
        <StatCard
          label="Nomor tidak valid"
          value={summary?.invalid.length ?? 0}
          hint="Dilewati otomatis saat broadcast"
          accent="#DD74A5"
        />
        <StatCard
          label="Penerima terpilih"
          value={recipientCount}
          hint={sendToAll ? "Mode: semua pendaftar" : "Mode: pilih manual"}
          accent="#5EA14A"
        />
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-black/8 bg-white p-5 space-y-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium text-black/80">Isi pesan</Label>
            <Button type="button" variant="ghost" size="sm" onClick={insertPlaceholder}>
              + Sisipkan {"{nama}"}
            </Button>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            placeholder={"Halo {nama}! 👋\n\nTerima kasih sudah daftar waitlist EVOMI. Produk kami segera rilis..."}
            className="bg-white resize-y min-h-[160px]"
          />
          <div className="flex items-center justify-between text-xs text-black/45">
            <span>Format WhatsApp: *tebal*, _miring_, ~coret~</span>
            <span className="tabular-nums">{message.length} / 4000</span>
          </div>
        </div>

        {message.trim() && (
          <div className="rounded-xl border border-[#1172ba]/20 bg-[#1172ba]/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1172ba] mb-2">
              Preview (contoh untuk {previewName})
            </p>
            <p className="text-sm text-black/75 whitespace-pre-wrap break-words">
              {renderPreview(message, previewName)}
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <ImageUploadField
            label="Gambar broadcast (opsional)"
            hint="Upload PNG, JPG, WebP, atau SVG (maks. 10 MB). Gambar langsung tersimpan di server."
            imageUrl={imageUrl}
            alt="Preview gambar broadcast"
            uploadPrefix="broadcast"
            onChange={setImageUrl}
            onUploadingChange={setImageUploading}
            previewClassName="w-full aspect-video max-h-56"
            allowLibrary
          />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-black/80">Jeda antar pesan (detik)</Label>
            <Input
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              placeholder="2-10"
              className="bg-white"
            />
            <p className="text-xs text-black/45">
              Jeda acak antar nomor. Jangan terlalu cepat agar nomor tidak diblokir WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Penerima */}
      <div className="rounded-2xl border border-black/8 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-black/6 bg-[#fafafa] space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#1172ba]" />
            <p className="font-semibold text-sm text-black/75">Penerima</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSendToAll(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sendToAll ? "bg-[#1172ba] text-white" : "bg-black/5 text-black/60"
              }`}
            >
              Semua pendaftar ({summary?.valid ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setSendToAll(false)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !sendToAll ? "bg-[#1172ba] text-white" : "bg-black/5 text-black/60"
              }`}
            >
              Pilih manual ({selectedIds.length})
            </button>
          </div>
        </div>

        {!sendToAll && (
          <div className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-black/35" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama atau nomor..."
                  className="pl-9 bg-white"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(filteredLeads.map((l) => l.id))}
                >
                  Pilih semua hasil
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                  Kosongkan
                </Button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-black/8 divide-y divide-black/5">
              {filteredLeads.length === 0 ? (
                <p className="p-6 text-center text-sm text-black/45">
                  Tidak ada pendaftar yang cocok.
                </p>
              ) : (
                filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => toggleLead(lead.id)}
                    aria-pressed={selectedIds.includes(lead.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.02]"
                  >
                    {/* Checkbox hanya visual — klik ditangani baris */}
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                    <span className="flex-1 text-sm font-medium truncate">{lead.name}</span>
                    <span className="text-sm text-black/50 tabular-nums">
                      +62 {lead.whatsapp}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {summary && summary.invalid.length > 0 && (
          <div className="px-4 py-3 border-t border-black/6 bg-amber-50/60 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              {summary.invalid.length} nomor tidak valid dan akan dilewati:{" "}
              {summary.invalid
                .slice(0, 5)
                .map((i) => `${i.name} (${i.whatsapp || "kosong"})`)
                .join(", ")}
              {summary.invalid.length > 5 ? ", ..." : ""}
            </p>
          </div>
        )}
      </div>

      {/* Kirim */}
      <div className="rounded-2xl border border-black/8 bg-white p-5 space-y-4 shadow-sm">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-black/80">
              Kirim tes dulu (opsional)
            </Label>
            <Input
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="08123456789"
              className="bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || imageUploading || !status?.configured}
            className="shrink-0"
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Kirim tes
          </Button>
        </div>

        <div className="border-t border-black/6 pt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-black/60">
            Pesan akan dikirim ke <strong className="tabular-nums">{recipientCount}</strong>{" "}
            nomor.
          </p>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
            className="bg-[#1172ba] hover:bg-[#0e5f9e]"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? "Mengirim..." : "Kirim broadcast"}
          </Button>
        </div>
      </div>

      {/* Riwayat */}
      <div className="rounded-2xl border border-black/8 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-black/6 bg-[#fafafa]">
          <History className="size-4 text-[#1172ba]" />
          <p className="font-semibold text-sm text-black/75">Riwayat broadcast</p>
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-sm text-black/45">Belum ada broadcast terkirim.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {history.map((c) => (
              <div key={c.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-black/45 flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(c.createdAt)}
                  </span>
                  <span className="text-xs text-black/60 tabular-nums ml-auto">
                    {c.successCount}/{c.targetCount} terkirim
                    {c.failedCount > 0 ? ` · ${c.failedCount} gagal` : ""}
                  </span>
                </div>
                <p className="text-sm text-black/70 whitespace-pre-wrap line-clamp-3 break-words">
                  {c.message}
                </p>
                {c.imageUrl && (
                  <img
                    src={c.imageUrl}
                    alt="Gambar broadcast"
                    className="h-20 max-w-40 rounded-lg border border-black/8 object-cover"
                  />
                )}
                {c.failures.length > 0 && (
                  <p className="text-xs text-black/45">
                    Gagal: {c.failures.slice(0, 3).map((f) => f.phone).join(", ")}
                    {c.failures.length > 3 ? ` +${c.failures.length - 3} lainnya` : ""} —{" "}
                    {c.failures[0].reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim broadcast ke {recipientCount} nomor?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesan akan langsung masuk antrian Fonnte dan tidak bisa dibatalkan. Kuota Fonnte
              akan terpakai sebanyak jumlah penerima.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl bg-black/[0.03] p-3 max-h-40 overflow-y-auto">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Gambar yang akan dikirim"
                className="mb-3 max-h-28 w-full rounded-lg object-cover"
              />
            )}
            <p className="text-sm whitespace-pre-wrap break-words">
              {renderPreview(message, previewName)}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              className="bg-[#1172ba] hover:bg-[#0e5f9e]"
            >
              Ya, kirim sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: BroadcastCampaign["status"] }) {
  if (status === "sent") {
    return (
      <Badge className="bg-[#5EA14A]/12 text-[#3f7133] border-[#5EA14A]/25 font-normal">
        <CheckCircle2 className="size-3" />
        Terkirim
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge className="bg-amber-500/12 text-amber-700 border-amber-500/25 font-normal">
        <AlertTriangle className="size-3" />
        Sebagian
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/10 text-red-700 border-red-500/25 font-normal">
      <XCircle className="size-3" />
      Gagal
    </Badge>
  );
}
