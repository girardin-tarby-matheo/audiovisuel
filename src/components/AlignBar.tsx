import type { ReactNode } from "react";
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
} from "lucide-react";
import { useStudio } from "../store/studioStore";
import type { BoardObject } from "../lib/types";

type Axis = "x" | "y";
type Mode = "start" | "center" | "end" | "distribute";

/** Aligne ou répartit les centres des objets sélectionnés ; une seule étape d'historique. */
function arrange(axis: Axis, mode: Mode) {
  const { items, selectedIds } = useStudio.getState();
  const selected = items.filter((item) => selectedIds.includes(item.id));
  if (selected.length < 2) return;
  const values = selected.map((item) => item[axis]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const next = new Map<string, number>();

  if (mode === "distribute") {
    if (selected.length < 3) return;
    const sorted = [...selected].sort((a, b) => a[axis] - b[axis]);
    const step = (max - min) / (sorted.length - 1);
    sorted.forEach((item, index) => next.set(item.id, Math.round(min + step * index)));
  } else {
    const target = mode === "start" ? min : mode === "end" ? max : Math.round((min + max) / 2);
    selected.forEach((item) => next.set(item.id, target));
  }
  useStudio.setState({ items: items.map((item: BoardObject) => (next.has(item.id) ? { ...item, [axis]: next.get(item.id)! } : item)) });
}

export function AlignBar() {
  const count = useStudio((s) => s.selectedIds.length);
  if (count < 2) return null;

  const actions: Array<{ label: string; icon: ReactNode; run: () => void; min?: number } | "sep"> = [
    { label: "Aligner à gauche", icon: <AlignStartVertical size={15} />, run: () => arrange("x", "start") },
    { label: "Centrer horizontalement", icon: <AlignCenterVertical size={15} />, run: () => arrange("x", "center") },
    { label: "Aligner à droite", icon: <AlignEndVertical size={15} />, run: () => arrange("x", "end") },
    "sep",
    { label: "Aligner en haut", icon: <AlignStartHorizontal size={15} />, run: () => arrange("y", "start") },
    { label: "Centrer verticalement", icon: <AlignCenterHorizontal size={15} />, run: () => arrange("y", "center") },
    { label: "Aligner en bas", icon: <AlignEndHorizontal size={15} />, run: () => arrange("y", "end") },
    "sep",
    { label: "Répartir horizontalement", icon: <AlignHorizontalSpaceBetween size={15} />, run: () => arrange("x", "distribute"), min: 3 },
    { label: "Répartir verticalement", icon: <AlignVerticalSpaceBetween size={15} />, run: () => arrange("y", "distribute"), min: 3 },
  ];

  return (
    <div className="no-export animate-fade-in pointer-events-auto absolute bottom-[4.9rem] left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/10 bg-surface/90 p-1 shadow-xl backdrop-blur-md">
      <span className="px-2 text-[10px] font-medium text-slate-400">{count} objets</span>
      {actions.map((action, index) =>
        action === "sep" ? (
          <span key={`sep-${index}`} className="mx-0.5 h-4 w-px bg-white/10" />
        ) : (
          <button
            key={action.label}
            type="button"
            title={action.label}
            aria-label={action.label}
            disabled={count < (action.min ?? 2)}
            onClick={action.run}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            {action.icon}
          </button>
        ),
      )}
    </div>
  );
}
