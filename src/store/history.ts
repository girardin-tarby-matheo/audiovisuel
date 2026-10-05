import { create } from "zustand";
import { useStudio } from "./studioStore";
import type { BoardObject, PlanBackground, SynopticLink, SynopticNode } from "../lib/types";

type Snapshot = { items: BoardObject[]; synopticNodes: SynopticNode[]; synopticLinks: SynopticLink[]; planBackground: PlanBackground | null };

const MAX_HISTORY = 100;
// Les changements rapprochés (drag, saisie) sont fusionnés en une seule étape d'historique.
const BURST_MS = 400;

const past: Snapshot[] = [];
const future: Snapshot[] = [];
let applying = false;
let burstTimer: number | undefined;

export const useHistory = create<{ canUndo: boolean; canRedo: boolean }>(() => ({ canUndo: false, canRedo: false }));

const sync = () => useHistory.setState({ canUndo: past.length > 0, canRedo: future.length > 0 });
const snapshot = (state: Snapshot): Snapshot => ({ items: state.items, synopticNodes: state.synopticNodes, synopticLinks: state.synopticLinks, planBackground: state.planBackground });

function apply(target: Snapshot) {
  applying = true;
  const { selectedIds } = useStudio.getState();
  const ids = new Set(target.items.map((item) => item.id));
  const kept = selectedIds.filter((id) => ids.has(id));
  useStudio.setState({ ...target, planBackgroundEditing: false, selectedIds: kept, selectedId: kept[kept.length - 1] ?? null, highlightedNodeIds: [], highlightedLinkIds: [] });
  applying = false;
  window.clearTimeout(burstTimer);
  burstTimer = undefined;
}

export function undo() {
  const previous = past.pop();
  if (!previous) return;
  future.push(snapshot(useStudio.getState()));
  apply(previous);
  sync();
}

export function redo() {
  const next = future.pop();
  if (!next) return;
  past.push(snapshot(useStudio.getState()));
  apply(next);
  sync();
}

if (typeof window !== "undefined") {
  useStudio.subscribe((state, prev) => {
    if (applying) return;
    if (state.items === prev.items && state.synopticNodes === prev.synopticNodes && state.synopticLinks === prev.synopticLinks && state.planBackground === prev.planBackground) return;
    if (burstTimer === undefined) {
      past.push(snapshot(prev));
      if (past.length > MAX_HISTORY) past.shift();
      future.length = 0;
      sync();
    }
    window.clearTimeout(burstTimer);
    burstTimer = window.setTimeout(() => { burstTimer = undefined; }, BURST_MS);
  });
}
