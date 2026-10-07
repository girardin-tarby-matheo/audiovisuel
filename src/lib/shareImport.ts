/** Clé de session : un projet partagé en attente d'import dans l'éditeur. */
export const PENDING_IMPORT_KEY = "shotboard-pending-import";

const PROJECTS_KEY = "shotboard-projects";

/** Ajoute un projet (JSON exporté) en tête de la bibliothèque « Projets ». */
export function saveToProjectLibrary(name: string, data: string) {
  try {
    const existing = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) || "[]");
    const list = Array.isArray(existing) ? existing : [];
    list.unshift({ id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), data });
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Récupère (et retire) un projet partagé en attente, s'il y en a un. */
export function takePendingImport(): string | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_IMPORT_KEY);
    if (raw) window.sessionStorage.removeItem(PENDING_IMPORT_KEY);
    return raw;
  } catch {
    return null;
  }
}

/* ── Lien de partage : JSON compressé (gzip) puis encodé en base64url, placé dans le « # » de l'URL.
   Le fragment n'est jamais envoyé au serveur : pas de limite de longueur d'en-tête. ── */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encodeShare(json: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return `j=${encodeURIComponent(json)}`;
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return `z=${toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
}

/** Lit le projet d'un lien de partage : fragment `#z=` / `#j=`, ou ancien format `?data=`. */
export async function decodeShare(hash: string, search: string): Promise<string | null> {
  const fragment = hash.replace(/^#/, "");
  try {
    if (fragment.startsWith("z=")) {
      const stream = new Blob([fromBase64Url(fragment.slice(2)) as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).text();
    }
    if (fragment.startsWith("j=")) return decodeURIComponent(fragment.slice(2));
  } catch {
    return null;
  }
  return new URLSearchParams(search).get("data");
}
