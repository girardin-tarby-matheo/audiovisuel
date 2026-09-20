import type { Category, SynopticDeviceType } from "./types";

/**
 * Registre visuel central.
 *
 * Pour remplacer un pictogramme par une photo, renseigner `image` avec une
 * URL publique ou un chemin dans /public, par exemple:
 * image: "/visuals/atem-mini.webp"
 *
 * `fit`, `position` et `background` permettent d'ajuster le cadrage sans
 * modifier les composants du plan ou du synoptique.
 */
export type VisualSpec = {
  label: string;
  image?: string;
  fit?: "cover" | "contain" | "fill";
  position?: string;
  background?: string;
  radius?: string;
};

export type VisualDefinition = VisualSpec & {
  key: string;
  category?: Category;
};

export const VISUALS: Record<string, VisualDefinition> = {
  // Objets du plan: remplacez image par une photo quand elle est disponible.
  "cam-main": { key: "cam-main", label: "Caméra principale", category: "camera", },
  "cam-b": { key: "cam-b", label: "Caméra secondaire", category: "camera" },
  "cam-shoulder": { key: "cam-shoulder", label: "Caméra épaule", category: "camera" },
  "cam-drone": { key: "cam-drone", label: "Drone", category: "camera" },
  "cam-crane": { key: "cam-crane", label: "Grue / Jib", category: "camera" },
  "cam-pov": { key: "cam-pov", label: "Caméra POV", category: "camera" },
  "light-soft": { key: "light-soft", label: "Softbox", category: "light" },
  "light-led": { key: "light-led", label: "Panneau LED", category: "light" },
  "light-spot": { key: "light-spot", label: "Projecteur", category: "light" },
  "light-fresnel": { key: "light-fresnel", label: "Fresnel", category: "light" },
  "light-tube": { key: "light-tube", label: "Tube LED", category: "light" },
  "light-practical": { key: "light-practical", label: "Lampe", category: "light" },
  "grip-cstand": { key: "grip-cstand", label: "C-Stand", category: "grip" },
  "grip-flag": { key: "grip-flag", label: "Drapeau", category: "grip" },
  "grip-butterfly": { key: "grip-butterfly", label: "Butterfly", category: "grip" },
  "audio-boom": { key: "audio-boom", label: "Perche micro", category: "audio" },
  "audio-lav": { key: "audio-lav", label: "Micro cravate", category: "audio" },
  "audio-stand": { key: "audio-stand", label: "Pied micro", category: "audio" },
  "talent": { key: "talent", label: "Personne", category: "talent" },
  "set-table": { key: "set-table", label: "Table", category: "set" },
  "set-chair": { key: "set-chair", label: "Chaise", category: "set" },
  "set-cyc": { key: "set-cyc", label: "Cyclorama", category: "set" },
  "set-monitor": { key: "set-monitor", label: "Écran de retour", category: "set" },
  "set-atem-mini": { key: "set-atem-mini", label: "ATEM Mini", category: "set" },
  "set-sound-desk": { key: "set-sound-desk", label: "Table son", category: "set" },

  // Appareils du synoptique. Ces clés peuvent aussi recevoir une photo.
  camera: { key: "camera", label: "Caméra" },
  mixer: { key: "mixer", label: "Mélangeur" },
  audio: { key: "audio", label: "Console son" },
  screen: { key: "screen", label: "Écran" },
  computer: { key: "computer", label: "Ordinateur" },
  recorder: { key: "recorder", label: "Enregistreur" },
  mic: { key: "mic", label: "Microphone" },
  headphone: { key: "headphone", label: "Casque" },
  converter: { key: "converter", label: "Convertisseur" },
  generic: { key: "generic", label: "Appareil" },
};

export function getVisual(key: string, fallbackKey = "generic"): VisualDefinition {
  return VISUALS[key] ?? VISUALS[fallbackKey] ?? VISUALS.generic;
}

export function visualKeyForDevice(deviceType: SynopticDeviceType): string {
  return deviceType in VISUALS ? deviceType : "generic";
}
