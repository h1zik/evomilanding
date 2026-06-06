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
  }, [content.site?.pageTitle, content.site?.faviconUrl, content.nav.brandName]);

  return null;
}
