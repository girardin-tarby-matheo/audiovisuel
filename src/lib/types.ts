export type Category = "camera" | "light" | "grip" | "audio" | "talent" | "set";
export type ToolMode = "select" | "pan";
export type ViewMode = "plan" | "synoptic";
export type BoardStatus = "draft" | "prep" | "shooting" | "locked";

export type CableType = "hdmi" | "sdi" | "xlr" | "jack" | "usb";

export type SynopticPort = {
  id: string;
  name: string;
  type: CableType;
};

export type SynopticDeviceType =
  | "mixer"
  | "camera"
  | "audio"
  | "screen"
  | "computer"
  | "recorder"
  | "di"
  | "headphone"
  | "mic"
  | "converter"
  | "light"
  | "generic";

export type CatalogItem = {
  id: string;
  category: Category;
  name: string;
  short: string;
  description: string;
  color: string;
  defaults: {
    fov?: number;
    beamRadius?: number;
    beamSpread?: number;
    intensity?: number;
    width?: number;
    height?: number;
    rotation: number;
    scale: number;
  };
};

export type BoardObject = {
  id: string;
  catalogId: string;
  category: Category;
  name: string;
  label: string;
  notes: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  width?: number;
  height?: number;
  color: string;
  fov: number;
  beamRadius: number;
  beamSpread: number;
  intensity: number;
};

export type CameraView = {
  x: number;
  y: number;
  zoom: number;
};

export type SynopticNode = {
  id: string;
  sourceId: string | null;
  title: string;
  subtitle: string;
  category?: Category;
  deviceType: SynopticDeviceType;
  color: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  portsIn: SynopticPort[];
  portsOut: SynopticPort[];
  needsPower: boolean;
  warningBadge?: string;
  notes?: string;
};

export type SynopticLink = {
  id: string;
  fromNodeId: string;
  fromPortId?: string;
  toNodeId: string;
  toPortId?: string;
  cableType: CableType;
  label?: string;
};

