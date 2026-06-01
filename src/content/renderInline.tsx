import { Fragment, type ReactNode } from "react";

export const RICH_TEXT_HINT =
  "**teks** = bold · <br> atau baris baru = pindah baris · [#1172ba]teks[/] atau [color:#1172ba]teks[/color] = warna";

const BREAK_RE = /<br\s*\/?>|\n/gi;
const TOKEN_PATTERN =
  "(\\*\\*[^*]+\\*\\*|\\[#[0-9A-Fa-f]{3,8}\\][\\s\\S]*?\\[\\/\\]|\\[color:#[0-9A-Fa-f]{3,8}\\][\\s\\S]*?\\[\\/color\\])";

export type RichTextOptions = {
  /** Garis bawah dekoratif pada segmen berwarna pertama (hero title) */
  squiggleFirstColor?: boolean;
  squiggleColor?: string;
};

/** Plain text untuk alt, aria, dll. */
export function stripRichText(text: string): string {
  return text
    .replace(BREAK_RE, " ")
    .replace(/\[#[0-9A-Fa-f]{3,8}\]([\s\S]*?)\[\/\]/gi, "$1")
    .replace(/\[color:(#[0-9A-Fa-f]{3,8})\]([\s\S]*?)\[\/color\]/gi, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInlineSegment(
  segment: string,
  keyPrefix: string,
  options: RichTextOptions,
  colorIndex: { n: number },
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let tokenKey = 0;
  const re = new RegExp(TOKEN_PATTERN, "gi");
  let match: RegExpExecArray | null;
  let guard = 0;

  while ((match = re.exec(segment)) !== null) {
    if (++guard > 500) break;
    if (match.index > last) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${tokenKey++}`}>{segment.slice(last, match.index)}</Fragment>,
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<b key={`${keyPrefix}-b-${tokenKey++}`}>{token.slice(2, -2)}</b>);
    } else {
      const shortColor = token.match(/^\[#([0-9A-Fa-f]{3,8})\]([\s\S]*?)\[\/\]$/);
      const longColor = token.match(/^\[color:(#[0-9A-Fa-f]{3,8})\]([\s\S]*?)\[\/color\]$/);
      const hexMatch = shortColor ?? longColor;
      if (hexMatch) {
        const color = shortColor ? `#${hexMatch[1]}` : hexMatch[1];
        const inner = hexMatch[2];
        const innerNodes = parseInlineSegment(inner, `${keyPrefix}-c${colorIndex.n}`, options, colorIndex);
        const useSquiggle = options.squiggleFirstColor && colorIndex.n === 0;
        colorIndex.n += 1;
        nodes.push(
          useSquiggle ? (
            <span
              key={`${keyPrefix}-col-${tokenKey++}`}
              className="relative inline-block align-baseline max-md:pb-0 md:pb-1.5"
            >
              <span className="relative z-[1]" style={{ color }}>
                {innerNodes}
              </span>
              <svg
                viewBox="0 0 200 20"
                className="pointer-events-none absolute left-0 w-full h-1.5 max-md:top-full max-md:-translate-y-2 max-md:translate-x-0 md:h-3 md:top-auto md:bottom-0 md:translate-y-full md:-bottom-0.5"
                aria-hidden
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10"
                  stroke={options.squiggleColor ?? "#FFD521"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
          ) : (
            <span key={`${keyPrefix}-col-${tokenKey++}`} style={{ color }}>
              {innerNodes}
            </span>
          ),
        );
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-raw-${tokenKey++}`}>{token}</Fragment>);
      }
    }
    last = match.index + token.length;
  }

  if (last < segment.length) {
    nodes.push(<Fragment key={`${keyPrefix}-tail`}>{segment.slice(last)}</Fragment>);
  }

  return nodes;
}

export function renderRichText(text: string, options: RichTextOptions = {}): ReactNode {
  if (!text) return null;

  const parts = text.split(BREAK_RE);
  const colorIndex = { n: 0 };
  const nodes: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (i > 0) {
      nodes.push(<br key={`br-${i}`} />);
    }
    if (!part) return;
    nodes.push(...parseInlineSegment(part, `seg-${i}`, options, colorIndex));
  });

  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

/** @deprecated Use renderRichText — kept for existing imports */
export function renderInline(text: string, options?: RichTextOptions): ReactNode {
  return renderRichText(text, options);
}

/** Replace {key} placeholders in template strings */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? `{${key}}`),
  );
}
