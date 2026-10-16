/**
 * Bibliothèque de projets enregistrés dans le navigateur (localStorage).
 *
 * - « Enregistrer » remplace le projet de même nom au lieu d'empiler des doublons.
 * - Avant toute action qui remplace le projet en cours (nouveau, ouverture, import, lien de partage),
 *   le projet courant est copié dans une entrée unique « Sauvegarde automatique » : rien n'est perdu,
 *   et la liste ne se remplit pas de copies.
 */

export type SavedProject = { id: string; name: string; savedAt: string; data: string; autoBackup?: boolean };

const STORAGE_KEY = "shotboard-projects";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function readProjects(): SavedProject[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.data === "string") : [];
  } catch {
    return [];
  }
}

export function writeProjects(projects: SavedProject[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

/** Enregistre (ou met à jour) le projet `name`. */
export function saveProject(name: string, data: string): { projects: SavedProject[]; replaced: boolean; ok: boolean } {
  const projects = readProjects();
  const existing = projects.find((project) => !project.autoBackup && project.name === name);
  const entry: SavedProject = { id: existing?.id ?? newId(), name, savedAt: new Date().toISOString(), data };
  const next = [entry, ...projects.filter((project) => project !== existing)];
  return { projects: next, replaced: Boolean(existing), ok: writeProjects(next) };
}

/** Copie le projet courant dans l'entrée « Sauvegarde automatique » (une seule, remplacée à chaque fois). */
export function backupProject(name: string, data: string): boolean {
  const projects = readProjects().filter((project) => !project.autoBackup);
  return writeProjects([{ id: newId(), name: `${name} — sauvegarde automatique`, savedAt: new Date().toISOString(), data, autoBackup: true }, ...projects]);
}

export function deleteProject(id: string): SavedProject[] {
  const next = readProjects().filter((project) => project.id !== id);
  writeProjects(next);
  return next;
}

/** Résumé d'un projet enregistré, sans le charger. */
export function projectStats(data: string): { items: number; devices: number; links: number } | null {
  try {
    const parsed = JSON.parse(data);
    return {
      items: Array.isArray(parsed.items) ? parsed.items.length : 0,
      devices: Array.isArray(parsed.synopticNodes) ? parsed.synopticNodes.length : 0,
      links: Array.isArray(parsed.synopticLinks) ? parsed.synopticLinks.length : 0,
    };
  } catch {
    return null;
  }
}
