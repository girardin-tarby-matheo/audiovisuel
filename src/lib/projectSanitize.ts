/**
 * Contrôle des projets importés (fichier JSON, lien de partage) : leurs données viennent de l'extérieur.
 * Couleurs et images sont injectées dans des styles et des attributs : on n'accepte que des valeurs sûres
 * (couleur hexadécimale ; image en data:image, https ou chemin local), et des nombres finis pour la géométrie.
 */

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const SAFE_IMAGE = /^(data:image\/(png|jpe?g|webp|gif|avif|svg\+xml)[;,]|https:\/\/|\/(?!\/))/i;

export function safeColor(value: unknown, fallback = "#94a3b8"): string {
  return typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;
}

export function safeImage(value: unknown): string | undefined {
  return typeof value === "string" && SAFE_IMAGE.test(value.trim()) ? value.trim() : undefined;
}

export function safeNumber(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

type Visual = { color?: unknown; image?: unknown; background?: unknown };

/** Nettoie les champs visuels d'un objet, d'un appareil ou d'une entrée de catalogue. */
export function sanitizeVisual<T extends Visual>(entry: T): T {
  return {
    ...entry,
    color: safeColor(entry.color),
    image: safeImage(entry.image),
    background: entry.background === undefined ? undefined : safeColor(entry.background, "transparent"),
  };
}

/** Objet du plan ou appareil du synoptique : visuel + position. */
export function sanitizePlaced<T extends Visual & { x?: unknown; y?: unknown }>(entry: T): T {
  return { ...sanitizeVisual(entry), x: safeNumber(entry.x, 0), y: safeNumber(entry.y, 0) };
}
