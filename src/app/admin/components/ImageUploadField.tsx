import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/content/imageUpload";
import { MAX_UPLOAD_MB } from "@/content/uploadConfig";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

export function ImageUploadField({
  label,
  hint,
  imageUrl,
  alt,
  uploadPrefix,
  onChange,
  previewClassName = "w-full aspect-[4/3] max-h-48",
  emptyPlaceholder,
}: {
  label: string;
  hint?: string;
  imageUrl: string;
  alt: string;
  uploadPrefix: string;
  onChange: (url: string) => void;
  previewClassName?: string;
  emptyPlaceholder?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file, uploadPrefix);
      onChange(url);
      toast.success("Gambar berhasil diupload");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-black/80">{label}</Label>
      {hint && <p className="text-xs text-black/45 -mt-1">{hint}</p>}

      <div
        className={`rounded-xl border-2 border-dashed border-black/15 bg-white flex items-center justify-center overflow-hidden ${previewClassName}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />
        ) : (
          emptyPlaceholder ?? (
            <p className="text-sm text-black/35 px-4 text-center">Belum ada gambar</p>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {uploading ? "Mengupload..." : imageUrl ? "Ganti gambar" : "Upload gambar"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={uploading}
            onClick={() => {
              onChange("");
              toast.info("Gambar dihapus — simpan perubahan untuk menerapkan");
            }}
          >
            <Trash2 className="size-4" />
            Hapus gambar
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
