import type { SynopticPort, CableType, SynopticDeviceType } from "./types";

export interface SynopticTemplate {
  id: string;
  title: string;
  subtitle: string;
  deviceType: SynopticDeviceType;
  color: string;
  portsIn: SynopticPort[];
  portsOut: SynopticPort[];
  needsPower: boolean;
  warningBadge?: string;
}

export const SYNOPTIC_TEMPLATES: Record<string, SynopticTemplate> = {
  "atem-mini-expert": {
    id: "atem-mini-expert",
    title: "Mélangeur ATEM Mini Expert",
    subtitle: "Régie de commutation & encodage",
    deviceType: "mixer",
    color: "#f59e0b",
    portsIn: [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `hdmi-in-${i + 1}`,
        name: `HDMI ${i + 1}`,
        type: "hdmi" as CableType,
      })),
      { id: "audio-in-1", name: "Audio 1", type: "jack" as CableType },
      { id: "audio-in-2", name: "Audio 2", type: "jack" as CableType },
    ],
    portsOut: [
      { id: "pgm-usb-1", name: "PGM USB", type: "usb" as CableType },
      { id: "pgm-usb-2", name: "PGM USB", type: "usb" as CableType },
      { id: "audio-out-jack", name: "Audio Mini-jack", type: "jack" as CableType },
      { id: "pgm-hdmi", name: "HDMI Programme", type: "hdmi" as CableType },
      { id: "multiview-hdmi", name: "HDMI MultiView", type: "hdmi" as CableType },
    ],
    needsPower: true,
  },
  "yamaha-mg12xu": {
    id: "yamaha-mg12xu",
    title: "Yamaha MG12XU",
    subtitle: "Console de mixage audio",
    deviceType: "audio",
    color: "#3b82f6",
    portsIn: [
      { id: "xlr-1", name: "1", type: "xlr" as CableType },
      { id: "xlr-2", name: "2", type: "xlr" as CableType },
      { id: "xlr-3", name: "3", type: "xlr" as CableType },
      { id: "xlr-4", name: "4", type: "xlr" as CableType },
    ],
    portsOut: [
      { id: "stereo-out-1", name: "Stéréo OUT 1", type: "jack" as CableType },
      { id: "stereo-out-2", name: "Stéréo OUT 2", type: "jack" as CableType },
      { id: "audio-out-jack", name: "Audio Mini-jack", type: "jack" as CableType },
    ],
    needsPower: true,
    warningBadge: "/!\\ Couper l'alim phantom",
  },
  "generic-camera": {
    id: "generic-camera",
    title: "Caméra",
    subtitle: "Sortie HDMI / SDI",
    deviceType: "camera",
    color: "#06b6d4",
    portsIn: [],
    portsOut: [
      { id: "main-out", name: "HDMI", type: "hdmi" as CableType },
    ],
    needsPower: true,
  },
  "generic-mic": {
    id: "generic-mic",
    title: "Microphone",
    subtitle: "XLR",
    deviceType: "mic",
    color: "#3b82f6",
    portsIn: [],
    portsOut: [
      { id: "main-out", name: "XLR", type: "xlr" as CableType },
    ],
    needsPower: false,
  },
  "pc-stream": {
    id: "pc-stream",
    title: "PC diffusion live",
    subtitle: "Stream OBS / Vmix",
    deviceType: "computer",
    color: "#06b6d4",
    portsIn: [
      { id: "usb-in", name: "USB", type: "usb" as CableType },
    ],
    portsOut: [],
    needsPower: true,
  },
  "pc-atem": {
    id: "pc-atem",
    title: "PC ATEM Studio",
    subtitle: "Contrôle logiciel ATEM",
    deviceType: "computer",
    color: "#64748b",
    portsIn: [],
    portsOut: [],
    needsPower: true,
  },
  "headphone-monitor": {
    id: "headphone-monitor",
    title: "Casque audio",
    subtitle: "Écoute régie",
    deviceType: "headphone",
    color: "#ec4899",
    portsIn: [
      { id: "jack-in", name: "Mini-jack", type: "jack" as CableType },
    ],
    portsOut: [],
    needsPower: false,
  },
  "hyperdeck": {
    id: "hyperdeck",
    title: "HyperDeck Studio HD Mini",
    subtitle: "Enregistreur Master",
    deviceType: "recorder",
    color: "#ef4444",
    portsIn: [
      { id: "hdmi-in", name: "HDMI", type: "hdmi" as CableType },
    ],
    portsOut: [
      { id: "hdmi-out", name: "HDMI", type: "hdmi" as CableType },
    ],
    needsPower: true,
  },
  "master-screen": {
    id: "master-screen",
    title: "Ecran Moniteur",
    subtitle: "Moniteur Master",
    deviceType: "screen",
    color: "#38bdf8",
    portsIn: [
      { id: "hdmi-in", name: "HDMI", type: "hdmi" as CableType },
    ],
    portsOut: [],
    needsPower: true,
  },
  "multiview-screen": {
    id: "multiview-screen",
    title: "Ecran MultiView",
    subtitle: "MultiView 8 vues",
    deviceType: "screen",
    color: "#f59e0b",
    portsIn: [
      { id: "hdmi-in", name: "HDMI", type: "hdmi" as CableType },
    ],
    portsOut: [],
    needsPower: false,
  },
  "di-box": {
    id: "di-box",
    title: "Boîtier d'injection (DI)",
    subtitle: "XLR -> Jack et mini-Jack",
    deviceType: "di",
    color: "#64748b",
    portsIn: [
      { id: "jack-in", name: "Jack et mini-Jack", type: "jack" as CableType },
    ],
    portsOut: [
      { id: "xlr-out", name: "XLR", type: "xlr" as CableType },
    ],
    needsPower: false,
  },
};
