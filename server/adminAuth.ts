import type { NextFunction, Request, Response } from "express";

/** Password admin sisi server — fallback ke VITE_ADMIN_PASSWORD agar sama dengan login panel */
export function getAdminPassword(): string | null {
  const pwd =
    process.env.ADMIN_PASSWORD?.trim() || process.env.VITE_ADMIN_PASSWORD?.trim();
  return pwd ? pwd : null;
}

/**
 * Endpoint broadcast & voucher bisa menghabiskan kuota / membagikan kode berharga,
 * jadi wajib menyertakan password admin di header `x-admin-password`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = getAdminPassword();
  if (!expected) {
    res.status(500).json({
      error:
        "ADMIN_PASSWORD belum di-set di server. Tambahkan ke .env / environment variable Railway.",
    });
    return;
  }
  const given = req.header("x-admin-password");
  if (given !== expected) {
    res.status(401).json({ error: "Password admin tidak valid" });
    return;
  }
  next();
}
