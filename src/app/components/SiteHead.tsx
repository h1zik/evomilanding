import { useEffect } from "react";
import { useContent } from "@/content/ContentContext";
import { stripRichText } from "@/content/renderInline";

export function SiteHead() {
  const { content } = useContent();

  useEffect(() => {
    const title = content.site?.pageTitle?.trim();
    document.title = title || stripRichText(content.nav.brandName) || "evomi.id";

    const faviconUrl = content.site?.faviconUrl?.trim();
    let link = document.querySelector<HTMLLinkElement>("link[data-evomi-favicon]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-evomi-favicon", "true");
      document.head.appendChild(link);
    }
    if (faviconUrl) {
      link.href = faviconUrl;
    }

    const description = content.site?.metaDescription?.trim();
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [
    content.site?.pageTitle,
    content.site?.faviconUrl,
    content.site?.metaDescription,
    content.nav.brandName,
  ]);

  return null;
}
