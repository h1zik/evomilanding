import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "evomi2026";
const SESSION_KEY = "evomi-admin-auth";

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

export function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAdminAuthenticated()) {
    return <Navigate to="/admin/panel" replace />;
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      navigate("/admin/panel");
    } else {
      setError("Password salah. Coba lagi.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1172ba] p-6">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl border-4 border-black p-8 max-w-md w-full shadow-[8px_8px_0_0_#000]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full shrink-0" style={{ background: "conic-gradient(from 0deg, #FFD521, #F50000, #B900B4, #1172ba, #FFD521)" }} />
          <div>
            <h1 className="text-xl font-semibold text-[#1172ba]">EVOMI Admin</h1>
            <p className="text-xs text-black/50">Kelola konten & pendaftar waitlist</p>
          </div>
        </div>
        <Label htmlFor="password">Password admin</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 mb-1"
          placeholder="Masukkan password"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 mb-3 mt-2">{error}</p>}
        <Button type="submit" className="w-full mt-4 bg-[#1172ba] hover:bg-[#0e5f9e]">
          Masuk ke dashboard
        </Button>
        <p className="text-xs text-black/40 mt-5 text-center">
          <Link to="/" className="text-[#1172ba] hover:underline">
            ← Kembali ke landing page
          </Link>
        </p>
      </form>
    </div>
  );
}

export function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
}
