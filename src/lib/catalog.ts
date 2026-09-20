import type { CatalogItem, Category } from "./types";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "camera", label: "Caméras & Optiques" },
  { id: "light", label: "Éclairages" },
  { id: "grip", label: "Grip & Machinerie" },
  { id: "audio", label: "Audio" },
  { id: "talent", label: "Équipe & Talents" },
  { id: "set", label: "Décors & Mobilier" },
];

export const CATALOG: CatalogItem[] = [
  // ==========================================
  // CAMÉRAS & OPTIQUES
  // ==========================================
  {
    id: "cam-main",
    category: "camera",
    name: "Caméra principale",
    short: "CAM A",
    description: "A-cam cinéma / broadcast (Plan large/serré)",
    color: "#5eead4",
    defaults: { fov: 54, rotation: 0, scale: 1 },
  },
  {
    id: "cam-b",
    category: "camera",
    name: "Caméra secondaire",
    short: "CAM B",
    description: "Couverture complémentaire / profil",
    color: "#67e8f9",
    defaults: { fov: 42, rotation: -35, scale: 1 },
  },
  {
    id: "cam-shoulder",
    category: "camera",
    name: "Caméra épaule",
    short: "SHO",
    description: "Rig épaule style reportage / fiction",
    color: "#2dd4bf",
    defaults: { fov: 50, rotation: 0, scale: 1 },
  },
  {
    id: "cam-drone",
    category: "camera",
    name: "Drone",
    short: "UAV",
    description: "Vue aérienne / travelling zénithal",
    color: "#93c5fd",
    defaults: { fov: 72, rotation: 15, scale: 1 },
  },
  {
    id: "cam-crane",
    category: "camera",
    name: "Grue / Jib",
    short: "JIB",
    description: "Mouvement vertical cinématique fluide",
    color: "#c4b5fd",
    defaults: { fov: 48, rotation: 20, scale: 1.1 },
  },
  {
    id: "cam-pov",
    category: "camera",
    name: "Caméra POV / Action",
    short: "POV",
    description: "Caméra subjective grand angle",
    color: "#fda4af",
    defaults: { fov: 90, rotation: 0, scale: 0.9 },
  },

  // ==========================================
  // ÉCLAIRAGES
  // ==========================================
  {
    id: "light-soft",
    category: "light",
    name: "Softbox / Boîte à lumière",
    short: "SFT",
    description: "Key light enveloppante et douce",
    color: "#fcd34d",
    defaults: { beamRadius: 220, beamSpread: 140, intensity: 78, rotation: 0, scale: 1 },
  },
  {
    id: "light-led",
    category: "light",
    name: "Panneau LED",
    short: "LED",
    description: "Source diffuse modulable bi-color",
    color: "#fde68a",
    defaults: { beamRadius: 180, beamSpread: 120, intensity: 70, rotation: 0, scale: 1 },
  },
  {
    id: "light-spot",
    category: "light",
    name: "Projecteur Spot / COB",
    short: "SPOT",
    description: "Faisceau directionnel puissant",
    color: "#fb923c",
    defaults: { beamRadius: 280, beamSpread: 35, intensity: 90, rotation: 0, scale: 1 },
  },
  {
    id: "light-fresnel",
    category: "light",
    name: "Fresnel",
    short: "FRS",
    description: "Découpe / projecteur de studio classique",
    color: "#fdba74",
    defaults: { beamRadius: 240, beamSpread: 50, intensity: 80, rotation: 0, scale: 1 },
  },
  {
    id: "light-tube",
    category: "light",
    name: "Tube LED RGB (Astera)",
    short: "RGB",
    description: "Accent couleur / practical design",
    color: "#f472b6",
    defaults: { beamRadius: 140, beamSpread: 160, intensity: 60, rotation: 90, scale: 1 },
  },
  {
    id: "light-practical",
    category: "light",
    name: "Lampe Practical",
    short: "PRC",
    description: "Lampe de décor visible à l'image",
    color: "#fef3c7",
    defaults: { beamRadius: 90, beamSpread: 180, intensity: 45, rotation: 0, scale: 0.9 },
  },

  // ==========================================
  // GRIP & MACHINERIE (Indispensable pour plans de feux)
  // ==========================================
  {
    id: "grip-cstand",
    category: "grip",
    name: "C-Stand (Pied girafe)",
    short: "CSTD",
    description: "Pied multifonction pour projecteur ou drapeau",
    color: "#a855f7",
    defaults: { rotation: 0, scale: 1 },
  },
  {
    id: "grip-flag",
    category: "grip",
    name: "Drapeau / Flag (Négatif)",
    short: "FLAG",
    description: "Bloque ou façonne la lumière (gobo/flag)",
    color: "#9333ea",
    defaults: { rotation: 0, scale: 1 },
  },
  {
    id: "grip-butterfly",
    category: "grip",
    name: "Cadre diffuseur / Butterfly",
    short: "BTFLY",
    description: "Grand cadre de diffusion ou silk",
    color: "#c084fc",
    defaults: { rotation: 0, scale: 1.2 },
  },

  // ==========================================
  // AUDIO
  // ==========================================
  {
    id: "audio-boom",
    category: "audio",
    name: "Perche micro",
    short: "BOOM",
    description: "Prise de son aérienne ciblée",
    color: "#86efac",
    defaults: { rotation: -20, scale: 1 },
  },
  {
    id: "audio-lav",
    category: "audio",
    name: "Micro cravate (HF)",
    short: "LAV",
    description: "Émetteur sans fil talent",
    color: "#4ade80",
    defaults: { rotation: 0, scale: 0.85 },
  },
  {
    id: "audio-stand",
    category: "audio",
    name: "Pied de micro / Statique",
    short: "MIC",
    description: "Micro fixe (interview / concert)",
    color: "#bbf7d0",
    defaults: { rotation: 0, scale: 0.9 },
  },

  // ==========================================
  // ÉQUIPE & TALENTS
  // ==========================================
  {
    id: "talent-director",
    category: "talent",
    name: "Réalisateur",
    short: "RÉAL",
    description: "Poste de contrôle / mise en scène",
    color: "#a78bfa",
    defaults: { rotation: 0, scale: 1 },
  },
  {
    id: "talent-op",
    category: "talent",
    name: "Cadreur / Opérateur",
    short: "OP",
    description: "Opérateur caméra ou steadicamer",
    color: "#818cf8",
    defaults: { rotation: 0, scale: 1 },
  },
  {
    id: "talent-actor",
    category: "talent",
    name: "Acteur / Comédien",
    short: "ACT",
    description: "Talent principal / secondaire",
    color: "#f9a8d4",
    defaults: { rotation: 0, scale: 1 },
  },
  {
    id: "talent-guest",
    category: "talent",
    name: "Invité Interview",
    short: "INV",
    description: "Invité plateau / podcast",
    color: "#fda4af",
    defaults: { rotation: 0, scale: 1 },
  },
  {
    id: "talent-extra",
    category: "talent",
    name: "Figurant",
    short: "FIG",
    description: "Présence d'ambiance en arrière-plan",
    color: "#cbd5e1",
    defaults: { rotation: 0, scale: 0.9 },
  },

  // ==========================================
  // DÉCORS & MOBILIER
  // ==========================================
  {
    id: "set-table",
    category: "set",
    name: "Table",
    short: "TBL",
    description: "Mobilier de plateau (interview, bureau)",
    color: "#d6d3d1",
    defaults: { rotation: 0, scale: 1.15, width: 180, height: 100 },
  },
  {
    id: "set-chair",
    category: "set",
    name: "Chaise / Fauteuil",
    short: "CHS",
    description: "Siège pour talent ou invité",
    color: "#e7e5e4",
    defaults: { rotation: 0, scale: 1, width: 96, height: 96 },
  },
  {
    id: "set-cyc",
    category: "set",
    name: "Fond cyclorama / Mur",
    short: "CYC",
    description: "Fond infini studio ou délimitation de pièce",
    color: "#94a3b8",
    defaults: { rotation: 0, scale: 1.3, width: 280, height: 48 },
  },
  {
    id: "set-monitor",
    category: "set",
    name: "Moniteur retour réal",
    short: "MON",
    description: "Station de contrôle vidéo",
    color: "#22d3ee",
    defaults: { rotation: 0, scale: 1, width: 110, height: 68 },
  },
  {
    id: "set-atem-mini",
    category: "set",
    name: "Mélangeur ATEM Mini",
    short: "ATEM",
    description: "Mélangeur vidéo de régie",
    color: "#f59e0b",
    defaults: { rotation: 0, scale: 0.85, width: 150, height: 72 },
  },
  {
    id: "set-sound-desk",
    category: "set",
    name: "Table son",
    short: "SON",
    description: "Console de mixage audio de régie",
    color: "#60a5fa",
    defaults: { rotation: 0, scale: 1, width: 170, height: 84 },
  },
];

export const CATALOG_MAP = Object.fromEntries(CATALOG.map((item) => [item.id, item]));
