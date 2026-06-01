import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LandingContent } from "./types";
import { defaultContent } from "./defaultContent";
import {
  loadContent,
  saveToServer,
  saveToStorage,
} from "./storage";

interface ContentContextValue {
  content: LandingContent;
  loading: boolean;
  saving: boolean;
  updateContent: (next: LandingContent) => void;
  saveContent: (next?: LandingContent) => Promise<{ serverSaved: boolean }>;
  resetContent: () => void;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<LandingContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadContent()
      .then((data) => {
        if (!cancelled) setContent(data);
      })
      .catch(() => {
        if (!cancelled) setContent(defaultContent);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateContent = useCallback((next: LandingContent) => {
    setContent(next);
  }, []);

  const saveContent = useCallback(
    async (next?: LandingContent) => {
      const payload = next ?? content;
      setSaving(true);
      saveToStorage(payload);
      setContent(payload);
      const serverSaved = await saveToServer(payload);
      setSaving(false);
      return { serverSaved };
    },
    [content],
  );

  const resetContent = useCallback(() => {
    localStorage.removeItem("evomi-landing-content");
    setContent(defaultContent);
  }, []);

  return (
    <ContentContext.Provider
      value={{ content, loading, saving, updateContent, saveContent, resetContent }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
}
