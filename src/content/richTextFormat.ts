/** Model teks kaya untuk editor visual admin */

export type TextSegment = {
  id: string;
  kind?: "text" | "image" | "icon";
  text: string;
  color?: string;
  bold?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  icon?: "heart";
  iconColor?: string;
};

export type TextLine = {
  id: string;
  segments: TextSegment[];
};

const BREAK_SPLIT = /<br\s*\/?>|\n/gi;
const TOKEN_RE =
  /(\*\*[^*]+\*\*|\[img:[^\]|]+(?:\|[^\]]*)?\]|\[icon:heart(?::#[0-9A-Fa-f]{3,8})?\]|\[#[0-9A-Fa-f]{3,8}\][\s\S]*?\[\/\]|\[color:#[0-9A-Fa-f]{3,8}\][\s\S]*?\[\/color\])/gi;

export function newSegmentId(): string {
  return `seg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newLineId(): string {
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseLine(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const re = new RegExp(TOKEN_RE.source, "gi");
  let last = 0;
  let match: RegExpExecArray | null;
  let guard = 0;

  while ((match = re.exec(line)) !== null) {
    if (++guard > 500) break;
    if (match.index > last) {
      segments.push({ id: newSegmentId(), text: line.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith("[img:")) {
      const imgMatch = token.match(/^\[img:([^\]|]+)(?:\|([^\]]*))?\]$/);
      if (imgMatch) {
        segments.push({
          id: newSegmentId(),
          kind: "image",
          text: "",
          imageUrl: imgMatch[1],
          imageAlt: imgMatch[2],
        });
      } else {
        segments.push({ id: newSegmentId(), text: token });
      }
    } else if (token.startsWith("[icon:heart")) {
      const iconMatch = token.match(/^\[icon:heart(?::(#[0-9A-Fa-f]{3,8}))?\]$/);
      segments.push({
        id: newSegmentId(),
        kind: "icon",
        icon: "heart",
        iconColor: iconMatch?.[1] ?? "#DD74A5",
        text: "",
      });
    } else if (token.startsWith("**")) {
      segments.push({ id: newSegmentId(), text: token.slice(2, -2), bold: true });
    } else {
      const short = token.match(/^\[#([0-9A-Fa-f]{3,8})\]([\s\S]*?)\[\/\]$/);
      const long = token.match(/^\[color:(#[0-9A-Fa-f]{3,8})\]([\s\S]*?)\[\/color\]$/);
      const m = short ?? long;
      if (m) {
        const color = short ? `#${m[1]}` : m[1];
        const inner = m[2];
        const boldMatch = inner.match(/^\*\*([\s\S]*)\*\*$/);
        if (boldMatch) {
          segments.push({ id: newSegmentId(), text: boldMatch[1], color, bold: true });
        } else {
          segments.push({ id: newSegmentId(), text: inner, color });
        }
      } else {
        segments.push({ id: newSegmentId(), text: token });
      }
    }
    last = match.index + token.length;
  }

  if (last < line.length) {
    segments.push({ id: newSegmentId(), text: line.slice(last) });
  }
  if (segments.length === 0) {
    segments.push({ id: newSegmentId(), text: "" });
  }
  return segments;
}

export function parseRichTextToLines(value: string): TextLine[] {
  const raw = value ?? "";
  if (!raw.trim()) {
    return [{ id: newLineId(), segments: [{ id: newSegmentId(), text: "" }] }];
  }
  const parts = raw.split(BREAK_SPLIT);
  return parts.map((part) => ({
    id: newLineId(),
    segments: parseLine(part),
  }));
}

function segmentToString(seg: TextSegment): string {
  if (seg.kind === "image") {
    const url = seg.imageUrl?.trim() ?? "";
    if (!url) return "";
    return seg.imageAlt ? `[img:${url}|${seg.imageAlt}]` : `[img:${url}]`;
  }
  if (seg.kind === "icon" && seg.icon === "heart") {
    const color = seg.iconColor?.startsWith("#") ? seg.iconColor : `#${seg.iconColor ?? "DD74A5"}`;
    return `[icon:heart:${color}]`;
  }
  if (!seg.text) return "";
  let inner = seg.text;
  if (seg.bold) inner = `**${inner}**`;
  if (seg.color) {
    const hex = seg.color.startsWith("#") ? seg.color : `#${seg.color}`;
    return `[${hex}]${inner}[/]`;
  }
  return inner;
}

export function linesToRichText(lines: TextLine[]): string {
  return lines
    .map((line) => line.segments.map(segmentToString).join(""))
    .join("<br>");
}

export function emptyLine(): TextLine {
  return { id: newLineId(), segments: [{ id: newSegmentId(), text: "" }] };
}
