import { useRef, useEffect, type ReactNode } from "react";
import { Trash2, Info } from "lucide-react";
import { ItemGlyph } from "./ItemGlyph";
import { useStudio } from "../store/studioStore";

export function PropertiesPanel() {
  const items = useStudio((s) => s.items);
  const selectedId = useStudio((s) => s.selectedId);
  const updateItem = useStudio((s) => s.updateItem);
  const removeItem = useStudio((s) => s.removeItem);
  const item = items.find((entry) => entry.id === selectedId) ?? null;
  const contentRef = useRef<HTMLDivElement>(null);

  // Animate content transition when selection changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.animation = "none";
      // Force reflow
      void contentRef.current.offsetHeight;
      contentRef.current.style.animation = "slide-in-right 220ms ease both";
    }
  }, [selectedId]);

  if (!item) {
    return (
      <aside className="flex w-[300px] shrink-0 flex-col border-l border-white/6 bg-[#0c0e14]">
        <div className="border-b border-white/6 px-4 py-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-violet-200/70">Propriétés</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Aucun élément</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
            <Info size={24} className="text-slate-600" />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Sélectionnez un objet sur le plateau pour éditer ses propriétés.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Nom · Rotation · Taille · Couleur · FOV · Faisceau
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-white/6 bg-[#0c0e14]">
      {/* Header with preview */}
      <div className="border-b border-white/6 px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-violet-200/70">Propriétés</p>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8"
            style={{ backgroundColor: `${item.color}12` }}
          >
            <ItemGlyph category={item.category} catalogId={item.catalogId} color={item.color} size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">{item.name}</h2>
            <p className="font-mono text-[10px] tracking-widest text-slate-500">{item.category.toUpperCase()} · {item.label}</p>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div ref={contentRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Field label="Nom">
          <input
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
            className="field"
          />
        </Field>

        <Field label="Étiquette">
          <input
            value={item.label}
            onChange={(e) => updateItem(item.id, { label: e.target.value })}
            className="field"
          />
        </Field>

        <Field label="Notes techniques">
          <textarea
            value={item.notes}
            rows={3}
            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
            className="field resize-none"
            placeholder="Ajouter des notes…"
          />
        </Field>

        {/* Geometry */}
        <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Géométrie</p>
          <SliderField
            label="Rotation"
            value={item.rotation}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => updateItem(item.id, { rotation: v })}
          />
          <SliderField
            label="Taille"
            value={item.scale}
            min={0.6}
            max={1.8}
            step={0.01}
            unit="×"
            onChange={(v) => updateItem(item.id, { scale: v })}
          />
        </div>

        {/* Color */}
        <Field label="Couleur">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={item.color}
              onChange={(e) => updateItem(item.id, { color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent transition hover:border-white/20"
            />
            <input
              value={item.color}
              onChange={(e) => updateItem(item.id, { color: e.target.value })}
              className="field font-mono"
            />
          </div>
        </Field>

        {/* Camera-specific: FOV */}
        {item.category === "camera" && (
          <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-200/70">Champ de vision</p>
              <div className="tooltip-trigger">
                <Info size={12} className="text-cyan-200/40 cursor-help" />
                <span className="tooltip-text">Angle en degrés du cône de prise de vue affiché sur le plateau</span>
              </div>
            </div>
            <SliderField
              label="FOV"
              value={item.fov}
              min={18}
              max={120}
              step={1}
              unit="°"
              onChange={(v) => updateItem(item.id, { fov: v })}
              accent="cyan"
            />
            <p className="text-[11px] leading-relaxed text-cyan-100/50">
              Le cône se met à jour en direct sur le plateau.
            </p>
          </div>
        )}

        {/* Light-specific: beam controls */}
        {item.category === "light" && (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-amber-200/70">Faisceau</p>
              <div className="tooltip-trigger">
                <Info size={12} className="text-amber-200/40 cursor-help" />
                <span className="tooltip-text">Contrôle le rayon, l'angle et la puissance du faisceau lumineux</span>
              </div>
            </div>
            <SliderField
              label="Rayon"
              value={item.beamRadius}
              min={40}
              max={420}
              step={1}
              unit="px"
              onChange={(v) => updateItem(item.id, { beamRadius: v })}
              accent="amber"
            />
            <SliderField
              label="Ouverture"
              value={item.beamSpread}
              min={12}
              max={180}
              step={1}
              unit="°"
              onChange={(v) => updateItem(item.id, { beamSpread: v })}
              accent="amber"
            />
            <SliderField
              label="Puissance"
              value={item.intensity}
              min={10}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updateItem(item.id, { intensity: v })}
              accent="amber"
            />
          </div>
        )}
      </div>

      {/* Delete button */}
      <div className="border-t border-white/6 p-4">
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 py-2.5 text-sm text-rose-200 transition-all duration-200 hover:bg-rose-400/20 hover:shadow-lg hover:shadow-rose-500/10 active:scale-[0.98]"
        >
          <Trash2 size={15} />
          Supprimer l'élément
        </button>
      </div>
    </aside>
  );
}

/* ── Reusable field wrapper ── */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/* ── Enhanced slider with min/max labels and live value ── */
function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  accent?: "cyan" | "amber";
}) {
  const displayValue = step < 1 ? value.toFixed(2) : Math.round(value);
  const accentColor = accent === "cyan" ? "text-cyan-200" : accent === "amber" ? "text-amber-200" : "text-slate-200";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <span className={`font-mono text-[11px] ${accentColor}`}>
          {displayValue}{unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-600 font-mono w-6 text-right">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[9px] text-slate-600 font-mono w-6">{max}</span>
      </div>
    </div>
  );
}
