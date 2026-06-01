import fs from "fs";
import path from "path";

/**
 * Folder penyimpanan upload (gambar admin).
 * - Lokal: default `public/uploads`
 * - Railway: set UPLOAD_PUBLIC_DIR ke path volume, mis. `/data/uploads`
 */
export function resolveUploadsDir(projectRoot: string): string {
  const configured = process.env.UPLOAD_PUBLIC_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(projectRoot, configured);
  }
  return path.join(projectRoot, "public", "uploads");
}

export function ensureUploadsDir(uploadsDir: string): void {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}
