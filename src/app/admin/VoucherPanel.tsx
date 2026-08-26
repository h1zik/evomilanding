import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  addVoucherCodes,
  countCodes,
  createVoucherBatch,
  deleteVoucherBatch,
  deleteVoucherCode,
  downloadVoucherCsv,
  fetchVoucherBatch,
  fetchVoucherBatches,
  releaseStuckCodes,
  type VoucherBatch,
  type VoucherCode,
  type VoucherStatus,
} from "@/content/voucherApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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

const STATUS_LABEL: Record<VoucherStatus, string> = {
  available: "Tersedia",
  assigned: "Dikunci",
  sent: "Terkirim",
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VoucherPanel() {
  const [batches, setBatches] = useState<VoucherBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await fetchVoucherBatches());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca batch voucher");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      batches.reduce(
        (acc, b) => ({
          total: acc.total + b.totalCount,
          available: acc.available + b.availableCount,
          sent: acc.sent + b.sentCount,
        }),
        { total: 0, available: 0, sent: 0 },
      ),
    [batches],
  );

  if (openBatchId) {
    return (
      <BatchDetail
        batchId={openBatchId}
        onBack={() => {
          setOpenBatchId(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Kode Voucher"
        description="Simpan kumpulan kode unik di sini, lalu bagikan lewat menu Broadcast WA. Setiap pendaftar otomatis menerima satu kode yang berbeda."
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total kode" value={totals.total} accent="#1172ba" />
        <StatCard
          label="Belum dibagikan"
          value={totals.available}
          hint="Siap dikirim ke pendaftar"
          accent="#5EA14A"
        />
        <StatCard
          label="Sudah terkirim"
          value={totals.sent}
          hint="Terkunci ke penerimanya"
          accent="#DD74A5"
        />
      </div>

      <CreateBatchForm onCreated={load} />

      <div className="rounded-2xl border border-black/8 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-black/6 bg-[#fafafa]">
          <Ticket className="size-4 text-[#1172ba]" />
          <p className="font-semibold text-sm text-black/75">Batch voucher</p>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="ml-auto"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {batches.length === 0 ? (
          <p className="p-8 text-center text-sm text-black/45">
            {loading ? "Memuat..." : "Belum ada batch voucher. Buat satu di atas."}
          </p>
        ) : (
          <div className="divide-y divide-black/5">
            {batches.map((batch) => (
              <BatchRow
                key={batch.id}
                batch={batch}
                onOpen={() => setOpenBatchId(batch.id)}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateBatchForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [codes, setCodes] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedCount = countCodes(codes);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Nama batch masih kosong");
      return;
    }
    if (parsedCount === 0) {
      toast.error("Tempel dulu kode vouchernya");
      return;
    }
    setSaving(true);
    try {
      const res = await createVoucherBatch({ name, note, codes });
      const extras = [
        res.duplicates.length > 0 ? `${res.duplicates.length} duplikat dilewati` : "",
        res.invalid.length > 0 ? `${res.invalid.length} baris tidak valid` : "",
      ].filter(Boolean);
      toast.success(
        `${res.imported} kode tersimpan${extras.length ? ` — ${extras.join(", ")}` : ""}`,
      );
      setName("");
      setNote("");
      setCodes("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan batch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-[#1172ba]" />
        <p className="font-semibold text-sm text-black/75">Batch voucher baru</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-black/80">Nama batch</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Voucher Early Bird 70 orang"
            className="bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-black/80">Catatan (opsional)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Diskon 50%, berlaku sampai 30 September"
            className="bg-white"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-black/80">Kode voucher</Label>
        <Textarea
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
          rows={8}
          placeholder={"EVOMI-A1B2C3\nEVOMI-D4E5F6\nEVOMI-G7H8I9"}
          className="bg-white font-mono text-sm resize-y min-h-[180px]"
        />
        <div className="flex items-center justify-between text-xs text-black/45">
          <span>Satu kode per baris — boleh juga dipisah koma atau titik koma.</span>
          <span className="tabular-nums">{parsedCount} kode terbaca</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#1172ba] hover:bg-[#0e5f9e]"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Simpan batch
        </Button>
      </div>
    </div>
  );
}

function BatchRow({
  batch,
  onOpen,
  onChanged,
}: {
  batch: VoucherBatch;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setConfirmDelete(false);
    setBusy(true);
    try {
      // Batch yang sudah membagikan kode butuh konfirmasi kedua di server
      await deleteVoucherBatch(batch.id, batch.sentCount > 0);
      toast.success(`Batch "${batch.name}" dihapus`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus batch");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    setBusy(true);
    try {
      const res = await releaseStuckCodes(batch.id);
      toast.success(
        res.released > 0
          ? `${res.released} kode dikembalikan ke stok`
          : "Tidak ada kode yang nyangkut",
      );
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal melepas kode");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="font-semibold text-black/80 hover:text-[#1172ba] text-left truncate"
          >
            {batch.name}
          </button>
          <p className="text-xs text-black/45 mt-0.5">
            {batch.note ? `${batch.note} · ` : ""}
            Dibuat {formatDate(batch.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onOpen}>
            Lihat kode
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadVoucherCsv(batch).catch((err: unknown) =>
                toast.error(err instanceof Error ? err.message : "Export gagal"),
              );
            }}
          >
            <Download className="size-4" />
            CSV
          </Button>
          {batch.assignedCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleRelease} disabled={busy}>
              <Unlock className="size-4" />
              Lepas {batch.assignedCount}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge className="bg-black/5 text-black/60 border-black/10 font-normal tabular-nums">
          {batch.totalCount} total
        </Badge>
        <Badge className="bg-[#5EA14A]/12 text-[#3f7133] border-[#5EA14A]/25 font-normal tabular-nums">
          {batch.availableCount} tersedia
        </Badge>
        {batch.assignedCount > 0 && (
          <Badge className="bg-amber-500/12 text-amber-700 border-amber-500/25 font-normal tabular-nums">
            <Lock className="size-3" />
            {batch.assignedCount} dikunci
          </Badge>
        )}
        <Badge className="bg-[#1172ba]/10 text-[#1172ba] border-[#1172ba]/25 font-normal tabular-nums">
          <CheckCircle2 className="size-3" />
          {batch.sentCount} terkirim
        </Badge>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus batch "{batch.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {batch.sentCount > 0
                ? `Batch ini sudah membagikan ${batch.sentCount} kode. Riwayat siapa dapat kode apa ikut terhapus — export CSV dulu kalau masih dibutuhkan.`
                : "Semua kode di batch ini akan ikut terhapus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchDetail({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const [batch, setBatch] = useState<VoucherBatch | null>(null);
  const [codes, setCodes] = useState<VoucherCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VoucherStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [extraCodes, setExtraCodes] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchVoucherBatch(batchId);
      setBatch(res.batch);
      setCodes(res.codes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca batch");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.leadName ?? "").toLowerCase().includes(q) ||
        (c.leadPhone ?? "").includes(q)
      );
    });
  }, [codes, filter, query]);

  async function handleAdd() {
    if (countCodes(extraCodes) === 0) {
      toast.error("Tempel dulu kode tambahannya");
      return;
    }
    setAdding(true);
    try {
      const res = await addVoucherCodes(batchId, extraCodes);
      toast.success(
        `${res.imported} kode ditambahkan${
          res.duplicates.length ? ` — ${res.duplicates.length} duplikat dilewati` : ""
        }`,
      );
      setExtraCodes("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah kode");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteCode(code: VoucherCode) {
    try {
      await deleteVoucherCode(code.id);
      setCodes((prev) => prev.filter((c) => c.id !== code.id));
      toast.success(`Kode ${code.code} dihapus`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kode");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#1172ba] truncate">
            {batch?.name ?? "Memuat..."}
          </h2>
          {batch?.note && <p className="text-sm text-black/55 truncate">{batch.note}</p>}
        </div>
      </div>

      {batch && (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Total kode" value={batch.totalCount} accent="#1172ba" />
          <StatCard label="Tersedia" value={batch.availableCount} accent="#5EA14A" />
          <StatCard label="Terkirim" value={batch.sentCount} accent="#DD74A5" />
        </div>
      )}

      <div className="rounded-2xl border border-black/8 bg-white p-5 space-y-3 shadow-sm">
        <Label className="text-sm font-medium text-black/80">Tambah kode ke batch ini</Label>
        <Textarea
          value={extraCodes}
          onChange={(e) => setExtraCodes(e.target.value)}
          rows={4}
          placeholder={"EVOMI-J1K2L3\nEVOMI-M4N5O6"}
          className="bg-white font-mono text-sm resize-y"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-black/45 tabular-nums">
            {countCodes(extraCodes)} kode terbaca
          </span>
          <Button onClick={handleAdd} disabled={adding} variant="outline">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Tambah
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-black/6 bg-[#fafafa] space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "available", "assigned", "sent"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === key ? "bg-[#1172ba] text-white" : "bg-black/5 text-black/60"
                }`}
              >
                {key === "all" ? "Semua" : STATUS_LABEL[key]}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-black/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kode, nama, atau nomor..."
              className="pl-9 bg-white"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-black/45">
            {loading ? "Memuat..." : "Tidak ada kode yang cocok."}
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-black/5">
            {visible.map((code) => (
              <div key={code.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-mono text-sm font-medium truncate">{code.code}</span>
                <CodeStatusBadge status={code.status} />
                <span className="flex-1 text-xs text-black/50 truncate text-right">
                  {code.leadName
                    ? `${code.leadName} · ${code.leadPhone ?? "-"}`
                    : "Belum dibagikan"}
                </span>
                {code.status === "available" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCode(code)}
                    className="text-black/30 hover:text-red-600 shrink-0"
                    aria-label={`Hapus kode ${code.code}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CodeStatusBadge({ status }: { status: VoucherStatus }) {
  if (status === "sent") {
    return (
      <Badge className="bg-[#1172ba]/10 text-[#1172ba] border-[#1172ba]/25 font-normal shrink-0">
        {STATUS_LABEL.sent}
      </Badge>
    );
  }
  if (status === "assigned") {
    return (
      <Badge className="bg-amber-500/12 text-amber-700 border-amber-500/25 font-normal shrink-0">
        {STATUS_LABEL.assigned}
      </Badge>
    );
  }
  return (
    <Badge className="bg-[#5EA14A]/12 text-[#3f7133] border-[#5EA14A]/25 font-normal shrink-0">
      {STATUS_LABEL.available}
    </Badge>
  );
}
