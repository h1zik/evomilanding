import { useEffect, useRef, useState } from "react";
import { Bold, Eye, Heart, ImagePlus, Palette, Plus, Trash2 } from "lucide-react";
import { renderRichText, type RichTextOptions } from "@/content/renderInline";
import {
  emptyLine,
  linesToRichText,
  newLineId,
  newSegmentId,
  parseRichTextToLines,
  type TextLine,
  type TextSegment,
} from "@/content/richTextFormat";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../components/ui/utils";
import { ImageUploadField } from "./ImageUploadField";

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Satu baris saja (mis. nama brand di nav) */
  singleLine?: boolean;
  /** Tampilkan opsi tebal */
  allowBold?: boolean;
  /** Catatan khusus (mis. garis kuning di kata berwarna pertama) */
  note?: string;
  previewOptions?: RichTextOptions;
  /** Izinkan gambar/ikon inline di antara teks */
  allowInlineImages?: boolean;
  uploadPrefix?: string;
};

function normalizeColor(hex: string): string {
  if (!hex) return "#000000";
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  singleLine = false,
  allowBold = true,
  note,
  previewOptions,
  allowInlineImages = false,
  uploadPrefix = "inline",
}: RichTextEditorProps) {
  const lastEmittedRef = useRef(value);
  const [lines, setLines] = useState(() => parseRichTextToLines(value));
  const [showPreview, setShowPreview] = useState(true);

  /** Sinkron hanya saat nilai berubah dari luar (bukan dari ketikan kita sendiri) */
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setLines(parseRichTextToLines(value));
  }, [value]);

  const commit = (updater: TextLine[] | ((prev: TextLine[]) => TextLine[])) => {
    setLines((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const limited = singleLine ? next.slice(0, 1) : next;
      const serialized = linesToRichText(limited);
      lastEmittedRef.current = serialized;
      onChange(serialized);
      return limited;
    });
  };

  const updateSegment = (lineId: string, segId: string, patch: Partial<TextSegment>) => {
    commit((prev) =>
      prev.map((line) =>
        line.id !== lineId
          ? line
          : {
              ...line,
              segments: line.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s)),
            },
      ),
    );
  };

  const addSegment = (lineId: string, withColor: boolean) => {
    commit((prev) =>
      prev.map((line) =>
        line.id !== lineId
          ? line
          : {
              ...line,
              segments: [
                ...line.segments,
                {
                  id: newSegmentId(),
                  text: "",
                  ...(withColor ? { color: "#1172ba" } : {}),
                },
              ],
            },
      ),
    );
  };

  const removeSegment = (lineId: string, segId: string) => {
    commit((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const segments = line.segments.filter((s) => s.id !== segId);
        return {
          ...line,
          segments: segments.length ? segments : [{ id: newSegmentId(), text: "" }],
        };
      }),
    );
  };

  const addLine = () => commit((prev) => [...prev, emptyLine()]);

  const removeLine = (lineId: string) => {
    commit((prev) => {
      if (prev.length <= 1) return [emptyLine()];
      return prev.filter((l) => l.id !== lineId);
    });
  };

  const addImageSegment = (lineId: string) => {
    commit((prev) =>
      prev.map((line) =>
        line.id !== lineId
          ? line
          : {
              ...line,
              segments: [
                ...line.segments,
                { id: newSegmentId(), kind: "image" as const, text: "", imageUrl: "" },
              ],
            },
      ),
    );
  };

  const addHeartIconSegment = (lineId: string) => {
    commit((prev) =>
      prev.map((line) =>
        line.id !== lineId
          ? line
          : {
              ...line,
              segments: [
                ...line.segments,
                {
                  id: newSegmentId(),
                  kind: "icon" as const,
                  icon: "heart" as const,
                  iconColor: "#DD74A5",
                  text: "",
                },
              ],
            },
      ),
    );
  };

  const isImageSegment = (seg: TextSegment) => seg.kind === "image";
  const isIconSegment = (seg: TextSegment) => seg.kind === "icon";

  const previewText = linesToRichText(lines);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium text-black/80">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-black/55"
          onClick={() => setShowPreview((v) => !v)}
        >
          <Eye className="size-3.5 mr-1" />
          {showPreview ? "Sembunyikan pratinjau" : "Tampilkan pratinjau"}
        </Button>
      </div>

      {note && (
        <p className="text-xs text-[#1172ba]/80 bg-[#1172ba]/5 border border-[#1172ba]/15 rounded-lg px-3 py-2">
          {note}
        </p>
      )}

      <div className="space-y-3">
        {lines.map((line, lineIndex) => (
          <div
            key={line.id}
            className="rounded-xl border border-black/10 bg-white p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                {singleLine ? "Teks" : `Baris ${lineIndex + 1}`}
              </span>
              {!singleLine && lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-600 hover:text-red-700"
                  onClick={() => removeLine(line.id)}
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Hapus baris
                </Button>
              )}
            </div>

            {line.segments.map((seg, segIndex) => (
              <div
                key={seg.id}
                className={cn(
                  "rounded-lg border p-3 space-y-2",
                  isImageSegment(seg)
                    ? "border-[#DD74A5]/30 bg-[#DD74A5]/[0.04]"
                    : isIconSegment(seg)
                      ? "border-[#DD74A5]/30 bg-[#DD74A5]/[0.04]"
                      : seg.color
                        ? "border-[#1172ba]/25 bg-[#1172ba]/[0.03]"
                        : "border-black/8 bg-[#fafafa]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-black/45">
                    {isImageSegment(seg)
                      ? "Gambar inline"
                      : isIconSegment(seg)
                        ? "Ikon inline"
                        : seg.color
                          ? "Teks berwarna"
                          : "Teks biasa"}
                    {segIndex > 0 ? ` · bagian ${segIndex + 1}` : ""}
                  </span>
                  {(line.segments.length > 1 || seg.text || seg.color || isImageSegment(seg) || isIconSegment(seg)) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-black/40 hover:text-red-600"
                      onClick={() => removeSegment(line.id, seg.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                {isImageSegment(seg) ? (
                  <ImageUploadField
                    label="Gambar di antara teks"
                    hint="PNG/SVG transparan disarankan. Muncul inline di judul."
                    imageUrl={seg.imageUrl ?? ""}
                    alt={seg.imageAlt ?? "Inline"}
                    uploadPrefix={uploadPrefix}
                    onChange={(url) => updateSegment(line.id, seg.id, { imageUrl: url })}
                    previewClassName="h-16 w-16 rounded-lg object-contain bg-white border border-black/10"
                  />
                ) : isIconSegment(seg) ? (
                  <div className="flex items-center gap-3">
                    <Heart className="size-8 fill-[#DD74A5] text-[#DD74A5]" strokeWidth={0} />
                    <div className="flex items-center gap-2 flex-1">
                      <Palette className="size-4 text-black/40 shrink-0" />
                      <input
                        type="color"
                        value={normalizeColor(seg.iconColor ?? "#DD74A5")}
                        onChange={(e) => updateSegment(line.id, seg.id, { iconColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded border border-black/15 bg-white"
                        aria-label="Warna ikon hati"
                      />
                      <Input
                        value={seg.iconColor ?? "#DD74A5"}
                        onChange={(e) => updateSegment(line.id, seg.id, { iconColor: e.target.value })}
                        placeholder="#DD74A5"
                        className="w-28 h-9 text-xs font-mono bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                <Input
                  value={seg.text}
                  onChange={(e) => updateSegment(line.id, seg.id, { text: e.target.value })}
                  placeholder={seg.color ? "Kata atau frasa berwarna…" : "Ketik teks…"}
                  className="bg-white"
                />

                <div className="flex flex-wrap items-center gap-3">
                  {seg.color !== undefined && (
                    <div className="flex items-center gap-2">
                      <Palette className="size-4 text-black/40 shrink-0" />
                      <input
                        type="color"
                        value={normalizeColor(seg.color ?? "#1172ba")}
                        onChange={(e) =>
                          updateSegment(line.id, seg.id, { color: e.target.value })
                        }
                        className="h-9 w-12 cursor-pointer rounded border border-black/15 bg-white"
                        aria-label="Pilih warna"
                      />
                      <Input
                        value={seg.color ?? ""}
                        onChange={(e) =>
                          updateSegment(line.id, seg.id, { color: e.target.value })
                        }
                        placeholder="#1172ba"
                        className="w-28 h-9 text-xs font-mono bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() =>
                          updateSegment(line.id, seg.id, { color: undefined })
                        }
                      >
                        Jadi teks biasa
                      </Button>
                    </div>
                  )}

                  {allowBold && (
                    <Button
                      type="button"
                      variant={seg.bold ? "default" : "outline"}
                      size="sm"
                      className={cn("h-8", seg.bold && "bg-black text-white")}
                      onClick={() => updateSegment(line.id, seg.id, { bold: !seg.bold })}
                    >
                      <Bold className="size-3.5 mr-1" />
                      Tebal
                    </Button>
                  )}
                </div>
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => addSegment(line.id, false)}
              >
                <Plus className="size-3.5 mr-1" />
                Tambah teks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs border-[#1172ba]/30 text-[#1172ba]"
                onClick={() => addSegment(line.id, true)}
              >
                <Palette className="size-3.5 mr-1" />
                Tambah teks berwarna
              </Button>
              {allowInlineImages && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-[#DD74A5]/30 text-[#DD74A5]"
                    onClick={() => addImageSegment(line.id)}
                  >
                    <ImagePlus className="size-3.5 mr-1" />
                    Tambah gambar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-[#DD74A5]/30 text-[#DD74A5]"
                    onClick={() => addHeartIconSegment(line.id)}
                  >
                    <Heart className="size-3.5 mr-1" />
                    Tambah ikon hati
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {!singleLine && (
        <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-full sm:w-auto">
          <Plus className="size-4 mr-1" />
          Tambah baris baru
        </Button>
      )}

      {showPreview && (
        <div className="rounded-xl border border-dashed border-black/15 bg-[#fafafa] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-black/40 mb-2">Pratinjau</p>
          <div className="text-base text-black/90 leading-relaxed">
            {previewText ? renderRichText(previewText, previewOptions) : (
              <span className="text-black/35 italic">Belum ada teks</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
