import { useEffect, useState } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";

type UploadItem = { url: string; name: string };

/** Modal galeri untuk memilih gambar yang sudah pernah diupload ke website. */
export function ImageLibraryPicker({
  open,
  onOpenChange,
  onSelect,
  currentUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  currentUrl?: string;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/uploads")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat galeri");
        return res.json();
      })
      .then((data: UploadItem[]) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Gagal memuat galeri gambar",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pilih dari galeri</DialogTitle>
          <DialogDescription>
            Semua gambar yang pernah diupload ke website. Klik untuk memilih.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-black/50">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-black/40 gap-2">
            <ImageOff className="size-8" />
            <p className="text-sm">Belum ada gambar di galeri.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {items.map((item) => {
              const active = currentUrl === item.url;
              return (
                <button
                  key={item.url}
                  type="button"
                  title={item.name}
                  onClick={() => {
                    onSelect(item.url);
                    onOpenChange(false);
                  }}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 bg-[#fafafa] transition ${
                    active
                      ? "border-[#1172ba] ring-2 ring-[#1172ba]/30"
                      : "border-black/10 hover:border-[#1172ba]/50"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
