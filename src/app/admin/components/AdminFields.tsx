import { ChevronDown, Trash2 } from "lucide-react";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 pb-4 border-b border-black/8">
      <h2 className="text-xl font-semibold text-[#1172ba]">{title}</h2>
      {description && <p className="text-sm text-black/55 mt-1 max-w-2xl">{description}</p>}
    </div>
  );
}

export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/8 bg-[#fafafa] p-4 space-y-4">
      <h3 className="text-sm font-semibold text-black/70 uppercase tracking-wide">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function normalizeHex(hex: string): string {
  if (!hex) return "#000000";
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const safe = normalizeHex(value || "#000000");

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-black/80">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-black/15 bg-white"
          aria-label={`${label} — pilih warna`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1172ba"
          className="bg-white font-mono text-sm"
        />
      </div>
      {hint && <p className="text-xs text-black/45">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-black/80">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="bg-white resize-y min-h-[80px]"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white" />
      )}
      {hint && <p className="text-xs text-black/45">{hint}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-black/80">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-white"
      />
      {hint && <p className="text-xs text-black/45">{hint}</p>}
    </div>
  );
}

export function CardShell({
  title,
  subtitle,
  defaultOpen = false,
  onDelete,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group rounded-xl border border-black/10 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8EE]/80 border-b border-black/6">
        <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left group">
          <ChevronDown className="size-4 text-black/40 transition-transform group-data-[state=open]:rotate-180" />
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            {subtitle && <p className="text-xs text-black/45 mt-0.5">{subtitle}</p>}
          </div>
        </CollapsibleTrigger>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Hapus</span>
          </Button>
        ) : null}
      </div>
      <CollapsibleContent className="p-4 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "#1172ba",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-black/45">{label}</p>
      <p className="text-3xl font-bold mt-2 tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      {hint && <p className="text-xs text-black/45 mt-2">{hint}</p>}
    </div>
  );
}
