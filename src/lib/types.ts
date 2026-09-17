export type Category = "camera" | "light" | "talent" | "set";
export type ToolMode = "select" | "pan";
export type BoardStatus = "draft" | "prep" | "shooting" | "locked";

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
