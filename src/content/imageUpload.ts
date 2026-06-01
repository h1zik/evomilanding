import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "./uploadConfig";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function uploadImage(file: File, prefix = "upload"): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format tidak didukung. Gunakan PNG, JPG, WebP, atau SVG.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Ukuran file maksimal ${MAX_UPLOAD_MB} MB.`);
  }

  const dataUrl = await readFileAsDataUrl(file);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      data: dataUrl,
      prefix,
    }),
  });

  if (res.ok) {
    const { url } = (await res.json()) as { url: string };
    return url;
  }

  if (import.meta.env.DEV) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Upload gagal — pastikan dev server sedang berjalan");
  }

  return dataUrl;
}

/** @deprecated use uploadImage */
export const uploadBrandImage = (file: File) => uploadImage(file, "brand");

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}
