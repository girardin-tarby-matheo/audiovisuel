import type { ReactNode } from "react";
import { getVisual } from "../lib/visuals";

type Props = {
  visualKey: string;
  image?: string;
  fit?: "contain" | "cover" | "fill";
  background?: string;
  fallback: ReactNode;
  className?: string;
  alt?: string;
};

/** Rend une photo si elle est configurée, sinon le visuel historique fourni. */
export function VisualAsset({ visualKey, image, fit, background, fallback, className = "", alt }: Props) {
  const visual = getVisual(visualKey);
  const source = image ?? visual.image;

  if (!source) return <span className={className}>{fallback}</span>;

  return (
    <span
      className={`visual-asset ${className}`}
      style={{
        background: background ?? visual.background ?? "transparent",
        borderRadius: visual.radius ?? "0.5rem",
      }}
    >
      <img
        src={source}
        alt={alt ?? visual.label}
        draggable={false}
        style={{ objectFit: fit ?? visual.fit ?? "contain", objectPosition: visual.position ?? "center" }}
      />
    </span>
  );
}
