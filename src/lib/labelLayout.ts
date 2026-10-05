import { CATALOG_MAP } from "./catalog";
import type { BoardObject } from "./types";

export type LabelPlacement = { id: string; x: number; y: number; width: number; side: "below" | "above" | "right" | "left" | "custom" };

type Rect = { left: number; top: number; right: number; bottom: number };

const GAP = 8;
const LABEL_HEIGHT = 22;
const MARKER_PAD = 4;

const intersects = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Emprise (non tournée) d'un objet : un pion de 52 px ou un décor redimensionnable. */
function itemBounds(item: BoardObject): Rect {
  if (item.category !== "set") {
    const half = (52 * item.scale) / 2 + MARKER_PAD;
    return { left: item.x - half, top: item.y - half, right: item.x + half, bottom: item.y + half };
  }
  const defaults = CATALOG_MAP[item.catalogId]?.defaults;
  const w = item.width ?? defaults?.width ?? 52 * item.scale;
  const h = item.height ?? defaults?.height ?? 52 * item.scale;
  const angle = (item.rotation * Math.PI) / 180;
  const bw = Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle));
  const bh = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
  return { left: item.x - bw / 2, top: item.y - bh / 2, right: item.x + bw / 2, bottom: item.y + bh / 2 };
}

export function labelWidth(name: string) {
  return Math.min(180, Math.max(48, name.length * 6.4 + 22));
}

/**
 * Place chaque nom à plat (jamais tourné) autour de son objet, en choisissant le côté
 * qui évite les autres objets et les noms déjà posés. Les décors servent de fond :
 * seuls leurs propres noms les évitent.
 */
export function computeLabelPlacements(items: BoardObject[]): Map<string, LabelPlacement> {
  const bounds = new Map(items.map((item) => [item.id, itemBounds(item)]));
  const solids = items.filter((item) => item.category !== "set").map((item) => bounds.get(item.id)!);
  const sets = items.filter((item) => item.category === "set").map((item) => bounds.get(item.id)!);
  const placed: Rect[] = [];
  const result = new Map<string, LabelPlacement>();

  // Les noms placés à la main sont fixes et servent d'obstacles aux autres.
  items.forEach((item) => {
    if (!item.labelOffset) return;
    const width = labelWidth(item.name);
    const x = item.x + item.labelOffset.x;
    const y = item.y + item.labelOffset.y;
    placed.push({ left: x - width / 2, top: y - LABEL_HEIGHT / 2, right: x + width / 2, bottom: y + LABEL_HEIGHT / 2 });
    result.set(item.id, { id: item.id, side: "custom", width, x, y });
  });

  // Du haut vers le bas : les noms du dessous se décalent autour de ceux déjà posés.
  [...items].filter((item) => !item.labelOffset).sort((a, b) => a.y - b.y || a.x - b.x).forEach((item) => {
    const box = bounds.get(item.id)!;
    const width = labelWidth(item.name);
    const cx = item.x;
    const cy = item.y;
    const candidates: Array<{ side: LabelPlacement["side"]; rect: Rect }> = [
      { side: "below", rect: { left: cx - width / 2, top: box.bottom + GAP, right: cx + width / 2, bottom: box.bottom + GAP + LABEL_HEIGHT } },
      { side: "above", rect: { left: cx - width / 2, top: box.top - GAP - LABEL_HEIGHT, right: cx + width / 2, bottom: box.top - GAP } },
      { side: "right", rect: { left: box.right + GAP, top: cy - LABEL_HEIGHT / 2, right: box.right + GAP + width, bottom: cy + LABEL_HEIGHT / 2 } },
      { side: "left", rect: { left: box.left - GAP - width, top: cy - LABEL_HEIGHT / 2, right: box.left - GAP, bottom: cy + LABEL_HEIGHT / 2 } },
    ];
    const isSet = item.category === "set";
    const free = (rect: Rect) =>
      !solids.some((solid) => solid !== box && intersects(rect, solid)) &&
      !placed.some((other) => intersects(rect, other)) &&
      (!isSet || !sets.some((other) => other !== box && intersects(rect, other)));
    const choice = candidates.find((candidate) => free(candidate.rect)) ?? candidates[0];
    placed.push(choice.rect);
    result.set(item.id, {
      id: item.id,
      side: choice.side,
      width,
      x: (choice.rect.left + choice.rect.right) / 2,
      y: (choice.rect.top + choice.rect.bottom) / 2,
    });
  });
  return result;
}
