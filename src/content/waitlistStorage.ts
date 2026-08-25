import type { NewWaitlistSubmission, WaitlistSubmission } from "./waitlistTypes";

const STORAGE_KEY = "evomi-waitlist-submissions";
const NON_DIGIT = /\D/g;

function createId() {
  return `wl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadFromStorage(): WaitlistSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaitlistSubmission[];
  } catch {
    return [];
  }
}

function saveToStorage(list: WaitlistSubmission[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export async function fetchSubmissions(): Promise<WaitlistSubmission[]> {
  try {
    const res = await fetch("/api/waitlist");
    if (res.ok) {
      const data = (await res.json()) as WaitlistSubmission[];
      saveToStorage(data);
      return data;
    }
  } catch {
    /* fallback */
  }
  return loadFromStorage();
}

export async function fetchWaitlistCount(): Promise<number> {
  const list = await fetchSubmissions();
  return list.length;
}

export async function addSubmission(data: NewWaitlistSubmission): Promise<WaitlistSubmission> {
  const entry: WaitlistSubmission = {
    id: createId(),
    name: data.name.trim(),
    whatsapp: data.whatsapp.replace(NON_DIGIT, ""),
    scent: (data.scent ?? "").trim(),
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      const saved = (await res.json()) as WaitlistSubmission;
      const list = [saved, ...loadFromStorage().filter((s) => s.id !== saved.id)];
      saveToStorage(list);
      return saved;
    }
  } catch {
    /* fallback */
  }

  const list = [entry, ...loadFromStorage()];
  saveToStorage(list);
  return entry;
}

export async function updateSubmission(
  id: string,
  data: Pick<WaitlistSubmission, "name" | "whatsapp" | "scent">,
): Promise<WaitlistSubmission> {
  const patch = {
    name: data.name.trim(),
    whatsapp: data.whatsapp.replace(NON_DIGIT, ""),
    scent: (data.scent ?? "").trim(),
  };

  let res: Response | null = null;
  try {
    res = await fetch(`/api/waitlist/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    res = null; // server tidak terjangkau — pakai localStorage
  }

  if (res) {
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Gagal menyimpan perubahan");
    }
    const saved = (await res.json()) as WaitlistSubmission;
    saveToStorage(loadFromStorage().map((s) => (s.id === id ? saved : s)));
    return saved;
  }

  const list = loadFromStorage();
  const current = list.find((s) => s.id === id);
  if (!current) throw new Error("Pendaftar tidak ditemukan");
  const updated: WaitlistSubmission = { ...current, ...patch };
  saveToStorage(list.map((s) => (s.id === id ? updated : s)));
  return updated;
}

export async function removeSubmission(id: string): Promise<WaitlistSubmission[]> {
  try {
    const res = await fetch(`/api/waitlist/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const next = loadFromStorage().filter((s) => s.id !== id);
      saveToStorage(next);
      return fetchSubmissions();
    }
  } catch {
    /* fallback */
  }

  const next = loadFromStorage().filter((s) => s.id !== id);
  saveToStorage(next);
  return next;
}

export function exportSubmissionsCsv(list: WaitlistSubmission[]) {
  const header = "No,Nama,WhatsApp,Aroma,Tanggal Daftar";
  const rows = list.map((s, i) =>
    [
      i + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"+62${s.whatsapp}"`,
      `"${s.scent.replace(/"/g, '""')}"`,
      `"${new Date(s.submittedAt).toLocaleString("id-ID")}"`,
    ].join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evomi-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
