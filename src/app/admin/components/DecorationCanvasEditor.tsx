import { useCallback, useRef, useState } from "react";
import { Copy, Monitor, Plus, RotateCw, Smartphone, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import type { HeroDecoration } from "@/content/types";
import {
  copyDesktopToMobile,
  getDecorationLayout,
  patchDecorationLayout,
  type DecorationLayout,
  type DecorationViewport,
} from "@/content/heroDecorationLayout";
import { createId } from "@/content/storage";
import { cn } from "../../components/ui/utils";
import { ImageUploadField } from "./ImageUploadField";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

type PatchDecorations = (updater: (items: HeroDecoration[]) => HeroDecoration[]) => void;

type DragState =
  | {
      mode: "move";
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      mode: "resize";
      id: string;
      startX: number;
      origWidth: number;
    }
  | {
      mode: "rotate";
      id: string;
      centerX: number;
      centerY: number;
      origRotation: number;
      startAngle: number;
    };

const MIN_WIDTH = 32;
const MAX_WIDTH = 560;
/** Persen posisi — boleh di luar area agar setengah gambar “ngumpet” di tepi */
const POS_MIN = -45;
const POS_MAX = 145;

function clampPos(n: number) {
  return Math.min(POS_MAX, Math.max(POS_MIN, n));
}

function clampWidth(w: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)));
}

export function DecorationCanvasEditor({
  decorations,
  onChange,
  onDecorationImageChange,
}: {
  decorations: HeroDecoration[];
  onChange: PatchDecorations;
  onDecorationImageChange: (id: string, url: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<DecorationViewport>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(
    decorations[0]?.id ?? null,
  );
  const dragRef = useRef<DragState | null>(null);

  const selected = decorations.find((d) => d.id === selectedId);
  const selectedLayout = selected ? getDecorationLayout(selected, viewMode) : null;

  const updateOne = useCallback(
    (id: string, patch: Partial<DecorationLayout>) => {
      onChange((items) =>
        items.map((d) => (d.id === id ? patchDecorationLayout(d, viewMode, patch) : d)),
      );
    },
    [onChange, viewMode],
  );

  function handlePointerMove(clientX: number, clientY: number) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;

    if (drag.mode === "move") {
      const rect = canvas.getBoundingClientRect();
      const dx = ((clientX - drag.startX) / rect.width) * 100;
      const dy = ((clientY - drag.startY) / rect.height) * 100;
      updateOne(drag.id, {
        x: clampPos(drag.origX + dx),
        y: clampPos(drag.origY + dy),
      });
      return;
    }

    if (drag.mode === "resize") {
      const delta = clientX - drag.startX;
      updateOne(drag.id, { width: clampWidth(drag.origWidth + delta) });
      return;
    }

    if (drag.mode === "rotate") {
      const angle =
        (Math.atan2(clientY - drag.centerY, clientX - drag.centerX) * 180) /
        Math.PI;
      let rotation = drag.origRotation + (angle - drag.startAngle);
      rotation = ((rotation % 360) + 360) % 360;
      if (rotation > 180) rotation -= 360;
      updateOne(drag.id, { rotation: Math.round(rotation) });
    }
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    handlePointerMove(e.clientX, e.clientY);
  }

  function endDrag(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function startMove(e: React.PointerEvent, item: HeroDecoration) {
    const layout = getDecorationLayout(item, viewMode);
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(item.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "move",
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: layout.x,
      origY: layout.y,
    };
  }

  function startResize(e: React.PointerEvent, item: HeroDecoration) {
    const layout = getDecorationLayout(item, viewMode);
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(item.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "resize",
      id: item.id,
      startX: e.clientX,
      origWidth: layout.width,
    };
  }

  function startRotate(e: React.PointerEvent, item: HeroDecoration, el: HTMLElement) {
    const layout = getDecorationLayout(item, viewMode);
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(item.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle =
      (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;
    dragRef.current = {
      mode: "rotate",
      id: item.id,
      centerX,
      centerY,
      origRotation: layout.rotation,
      startAngle,
    };
  }

  function copyAllLayoutsFromDesktop() {
    onChange((items) => items.map(copyDesktopToMobile));
  }

  function addDecoration() {
    const id = createId("deco");
    const next: HeroDecoration = {
      id,
      imageUrl: "",
      x: 50,
      y: 50,
      width: 120,
      rotation: 0,
      zIndex: decorations.length + 1,
    };
    onChange((items) => [...items, next]);
    setSelectedId(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-black/10 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("desktop")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              viewMode === "desktop"
                ? "bg-[#1172ba] text-white"
                : "text-black/55 hover:text-black/80",
            )}
          >
            <Monitor className="size-4" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mobile")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              viewMode === "mobile"
                ? "bg-[#1172ba] text-white"
                : "text-black/55 hover:text-black/80",
            )}
          >
            <Smartphone className="size-4" />
            Mobile
          </button>
        </div>
        {viewMode === "mobile" && (
          <Button type="button" size="sm" variant="outline" onClick={copyAllLayoutsFromDesktop}>
            <Copy className="size-4" />
            Salin posisi dari desktop
          </Button>
        )}
      </div>

      <p className="text-sm text-black/55">
        Atur dekor untuk <strong>{viewMode === "desktop" ? "layar lebar" : "HP"}</strong>.{" "}
        <strong>Tarik</strong> untuk pindah · <strong>sudut kanan bawah</strong> ukuran ·{" "}
        <strong>lingkaran atas</strong> putar. Bisa tarik ke luar area (X/Y &lt;0 atau &gt;100%).
      </p>

      <div
        ref={canvasRef}
        className={cn(
          "relative w-full min-h-[280px] rounded-2xl border-2 border-black/10 bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%),linear-gradient(-45deg,#f5f5f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f5_75%),linear-gradient(-45deg,transparent_75%,#f5f5f5_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] overflow-visible touch-none",
          viewMode === "mobile" ? "aspect-[9/16] max-w-sm mx-auto" : "aspect-[16/10]",
        )}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={() => setSelectedId(null)}
      >
        <div className="absolute inset-x-[12%] inset-y-[8%] border-2 border-dashed border-[#1172ba]/30 rounded-xl pointer-events-none" />
        <p className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-black/35 uppercase pointer-events-none">
          Area hero ({viewMode === "desktop" ? "desktop" : "mobile"})
        </p>

        {[...decorations]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((item) => {
            const layout = getDecorationLayout(item, viewMode);
            return item.imageUrl ? (
              <div
                key={item.id}
                className="absolute"
                style={{
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  zIndex: item.zIndex + 10,
                  transform: `translate(-50%, -50%) rotate(${layout.rotation}deg)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(item.id);
                }}
              >
                <div
                  className={`relative group ${
                    selectedId === item.id ? "ring-2 ring-[#1172ba] ring-offset-2 rounded-md" : ""
                  }`}
                >
                  {/* Rotate handle */}
                  {selectedId === item.id && (
                    <div
                      className="absolute left-1/2 -top-10 -translate-x-1/2 flex flex-col items-center pointer-events-auto"
                      onPointerDown={(e) =>
                        startRotate(e, item, e.currentTarget.parentElement as HTMLElement)
                      }
                    >
                      <div
                        className="w-7 h-7 rounded-full bg-[#1172ba] text-white border-2 border-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing"
                        title="Putar"
                      >
                        <RotateCw className="size-3.5" />
                      </div>
                      <div className="w-0.5 h-3 bg-[#1172ba]" />
                    </div>
                  )}

                  <div
                    className="cursor-grab active:cursor-grabbing select-none"
                    onPointerDown={(e) => startMove(e, item)}
                  >
                    <img
                      src={item.imageUrl}
                      alt=""
                      style={{ width: layout.width }}
                      className="h-auto max-w-none pointer-events-none block"
                      draggable={false}
                    />
                  </div>

                  {/* Resize handle */}
                  {selectedId === item.id && (
                    <div
                      className="absolute -bottom-2 -right-2 w-5 h-5 rounded-sm bg-white border-2 border-[#1172ba] shadow cursor-nwse-resize pointer-events-auto"
                      title="Perbesar / perkecil"
                      onPointerDown={(e) => startResize(e, item)}
                    />
                  )}
                </div>
              </div>
            ) : null;
          })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addDecoration}>
          <Plus className="size-4" />
          Tambah gambar dekor
        </Button>
      </div>

      {selected && selectedLayout ? (
        <div className="rounded-xl border border-black/10 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-medium">
              Edit dekor ({viewMode === "desktop" ? "desktop" : "mobile"})
            </Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => {
                onChange((items) => items.filter((d) => d.id !== selected.id));
                setSelectedId(null);
              }}
            >
              <Trash2 className="size-4" />
              Hapus
            </Button>
          </div>
          <ImageUploadField
            label="Gambar"
            imageUrl={selected.imageUrl}
            alt="Dekor hero"
            uploadPrefix="hero-deco"
            onChange={(url) => onDecorationImageChange(selected.id, url)}
            previewClassName="w-full max-h-40 aspect-video"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-black/50">Ukuran ({selectedLayout.width}px)</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() =>
                    updateOne(selected.id, {
                      width: clampWidth(selectedLayout.width - 16),
                    })
                  }
                >
                  <ZoomOut className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() =>
                    updateOne(selected.id, {
                      width: clampWidth(selectedLayout.width + 16),
                    })
                  }
                >
                  <ZoomIn className="size-4" />
                </Button>
              </div>
            </div>
            <input
              type="range"
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              value={selectedLayout.width}
              onChange={(e) =>
                updateOne(selected.id, { width: clampWidth(Number(e.target.value)) })
              }
              className="w-full accent-[#1172ba]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-black/50">Rotasi ({selectedLayout.rotation}°)</Label>
            <input
              type="range"
              min={-180}
              max={180}
              value={selectedLayout.rotation}
              onChange={(e) =>
                updateOne(selected.id, { rotation: Number(e.target.value) })
              }
              className="w-full accent-[#1172ba]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-black/50">X (%)</Label>
              <input
                type="number"
                min={POS_MIN}
                max={POS_MAX}
                value={Math.round(selectedLayout.x)}
                onChange={(e) =>
                  updateOne(selected.id, { x: clampPos(Number(e.target.value) || 0) })
                }
                className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-black/50">Y (%)</Label>
              <input
                type="number"
                min={POS_MIN}
                max={POS_MAX}
                value={Math.round(selectedLayout.y)}
                onChange={(e) =>
                  updateOne(selected.id, { y: clampPos(Number(e.target.value) || 0) })
                }
                className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        decorations.length > 0 && (
          <p className="text-sm text-black/45">
            Klik gambar di preview untuk menampilkan handle putar & ukuran.
          </p>
        )
      )}

      {decorations
        .filter((d) => !d.imageUrl)
        .map((d) => (
          <div key={d.id} className="rounded-xl border border-dashed border-black/15 p-4">
            <ImageUploadField
              label="Upload dekor baru"
              imageUrl=""
              alt="Dekor"
              uploadPrefix="hero-deco"
              onChange={(url) => onDecorationImageChange(d.id, url)}
            />
          </div>
        ))}
    </div>
  );
}
