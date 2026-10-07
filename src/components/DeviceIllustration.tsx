import type { ReactNode } from "react";
import type { SynopticDeviceType } from "../lib/types";

type Props = { deviceType: SynopticDeviceType; title?: string; color?: string };

// Les teintes de châssis suivent le thème (clair ou sombre) via les variables CSS de l'application.
const BODY = "color-mix(in srgb, var(--color-white) 9%, var(--color-ink-800))";
const PANEL = "color-mix(in srgb, var(--color-white) 14%, var(--color-ink-900))";
const EDGE = "color-mix(in srgb, var(--color-white) 34%, transparent)";
const DETAIL = "color-mix(in srgb, var(--color-white) 26%, transparent)";
const FAINT = "color-mix(in srgb, var(--color-white) 14%, transparent)";

/**
 * Illustrations de face des appareils du synoptique (vue 96 x 72). Même grammaire que les pictogrammes
 * du plan : formes simples, trait arrondi, aplat translucide et accents de la couleur de l'appareil.
 */
export function DeviceIllustration({ deviceType, title = "", color = "#a78bfa" }: Props) {
  const stroke = { stroke: EDGE, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const body = { ...stroke, fill: BODY };
  const accent = { fill: color };
  const softFill = `${color}55`;
  const led = (cx: number, cy: number, fill: string) => <circle cx={cx} cy={cy} r="1.8" fill={fill} />;

  let art: ReactNode;

  switch (deviceType) {
    case "mixer": // ATEM Mini : rangée de sources, touches de transition, entrées HDMI
      art = (
        <>
          <rect x="3" y="12" width="90" height="48" rx="5" {...body} />
          {Array.from({ length: 8 }).map((_, index) => (
            <rect key={index} x={8 + index * 10.4} y="17" width="8" height="6.5" rx="1.5" fill={index === 0 ? "#ef4444" : index === 1 ? "#22c55e" : DETAIL} />
          ))}
          <rect x="8" y="28" width="30" height="12" rx="2" fill={PANEL} stroke={FAINT} />
          <path d="M11 36l4-5 3.5 3 3-4 4 6" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="44" y="29" width="10" height="4.5" rx="1.2" fill={DETAIL} />
          <rect x="57" y="29" width="10" height="4.5" rx="1.2" fill={DETAIL} />
          <rect x="44" y="35.5" width="10" height="4.5" rx="1.2" fill={FAINT} />
          <rect x="57" y="35.5" width="10" height="4.5" rx="1.2" fill={FAINT} />
          <rect x="76" y="28" width="4" height="22" rx="2" fill={PANEL} stroke={FAINT} />
          <rect x="74.5" y="36" width="7" height="5" rx="1.4" {...accent} />
          {Array.from({ length: 6 }).map((_, index) => (
            <rect key={index} x={8 + index * 6.2} y="50" width="4.4" height="5" rx="0.9" fill={index < 4 ? color : DETAIL} opacity={index < 4 ? 0.9 : 1} />
          ))}
          {led(87, 17, "#ef4444")}
        </>
      );
      break;

    case "audio": // Console analogique : potentiomètres, rangées de faders, vumètre
      art = (
        <>
          <rect x="3" y="6" width="90" height="60" rx="5" {...body} />
          {[0, 1, 2, 3, 4].map((column) => (
            <g key={column}>
              <circle cx={14 + column * 14} cy="15" r="3.1" fill={PANEL} stroke={EDGE} strokeWidth="1" />
              <path d={`M${14 + column * 14} 15l1.4-2`} stroke={color} strokeWidth="1.2" strokeLinecap="round" />
              <circle cx={14 + column * 14} cy="25" r="2.6" fill={PANEL} stroke={FAINT} strokeWidth="1" />
              <rect x={12.7 + column * 14} y="33" width="2.6" height="26" rx="1.3" fill={PANEL} stroke={FAINT} strokeWidth="0.8" />
              <rect x={10.8 + column * 14} y={[46, 40, 50, 37, 44][column]} width="6.4" height="4.4" rx="1.1" fill={column === 0 ? color : DETAIL} />
            </g>
          ))}
          {Array.from({ length: 8 }).map((_, index) => (
            <rect key={index} x="82" y={12 + index * 6} width="6" height="3.6" rx="0.9" fill={index < 5 ? "#22c55e" : index < 7 ? "#eab308" : "#ef4444"} opacity={index > 5 ? 0.45 : 0.9} />
          ))}
        </>
      );
      break;

    case "recorder": // HyperDeck : châssis 1U, logement SSD, afficheur, boutons de transport
      art = (
        <>
          <rect x="3" y="20" width="90" height="32" rx="4" {...body} />
          <rect x="8" y="25" width="22" height="22" rx="2.5" fill={PANEL} stroke={FAINT} />
          <rect x="11" y="32" width="16" height="9" rx="1.5" fill={softFill} stroke={color} strokeWidth="1" />
          <rect x="35" y="25" width="30" height="13" rx="2" fill={PANEL} stroke={FAINT} />
          <path d="M39 33h6M48 33h4M55 33h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M39 29.5h14" stroke={DETAIL} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M71 28l6 4-6 4z" fill={DETAIL} />
          <rect x="80" y="28.4" width="7" height="7" rx="1.2" fill={DETAIL} />
          <circle cx="74" cy="43.5" r="3.4" fill="#ef4444" />
          <rect x="35" y="42" width="30" height="4" rx="2" fill={FAINT} />
          <rect x="35" y="42" width="11" height="4" rx="2" {...accent} opacity={0.85} />
          {led(84, 43.5, "#22c55e")}
        </>
      );
      break;

    case "computer": // Ordinateur portable
      art = (
        <>
          <rect x="17" y="8" width="62" height="40" rx="3.5" {...body} />
          <rect x="21" y="12" width="54" height="32" rx="1.8" fill={PANEL} stroke={FAINT} />
          <rect x="25" y="16" width="22" height="14" rx="1.5" fill={softFill} stroke={color} strokeWidth="1" />
          <rect x="50" y="16" width="21" height="6" rx="1.2" fill={FAINT} />
          <rect x="50" y="25" width="21" height="5" rx="1.2" fill={FAINT} />
          <path d="M25 35h46M25 39h28" stroke={DETAIL} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M8 52h80l-4 7a3 3 0 0 1-2.6 1.5H14.6A3 3 0 0 1 12 59z" {...body} />
          <rect x="39" y="53.5" width="18" height="2.6" rx="1.3" fill={DETAIL} />
        </>
      );
      break;

    case "screen": {
      const multiview = /multi/i.test(title);
      art = (
        <>
          <rect x="5" y="7" width="86" height="50" rx="4.5" {...body} />
          <rect x="9" y="11" width="78" height="42" rx="2" fill={PANEL} stroke={FAINT} />
          {multiview ? (
            <>
              {Array.from({ length: 8 }).map((_, index) => {
                const column = index % 4;
                const row = Math.floor(index / 4);
                const live = index === 0;
                const preview = index === 1;
                return (
                  <rect
                    key={index}
                    x={11 + column * 19.2}
                    y={13 + row * 19.6}
                    width="17.4"
                    height="17.6"
                    rx="1.2"
                    fill={live ? "#ef444433" : preview ? "#22c55e33" : FAINT}
                    stroke={live ? "#ef4444" : preview ? "#22c55e" : "none"}
                    strokeWidth="1.2"
                  />
                );
              })}
            </>
          ) : (
            <>
              <circle cx="68" cy="23" r="4" fill={color} opacity={0.9} />
              <path d="M11 51l17-18 11 11 9-9 14 16z" fill={softFill} stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M52 51l12-12 22 13" fill={FAINT} stroke={DETAIL} strokeWidth="1" strokeLinejoin="round" />
            </>
          )}
          <path d="M48 57v6M35 65h26" stroke={EDGE} strokeWidth="2" strokeLinecap="round" />
        </>
      );
      break;
    }

    case "headphone": // Casque de monitoring
      art = (
        <>
          <path d="M22 44V34a26 26 0 0 1 52 0v10" fill="none" stroke={EDGE} strokeWidth="5.5" strokeLinecap="round" />
          <path d="M22 44V34a26 26 0 0 1 52 0v10" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity={0.8} />
          <rect x="13" y="38" width="16" height="25" rx="7" {...body} />
          <rect x="67" y="38" width="16" height="25" rx="7" {...body} />
          <rect x="16.5" y="43" width="9" height="15" rx="4.5" fill={softFill} />
          <rect x="70.5" y="43" width="9" height="15" rx="4.5" fill={softFill} />
          <path d="M21 63c0 4 4 5 6 7" fill="none" stroke={EDGE} strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
      break;

    case "di": // Boîtier d'injection : entrée XLR, sorties jack, interrupteur
      art = (
        <>
          <rect x="10" y="17" width="76" height="38" rx="5" {...body} />
          <circle cx="29" cy="36" r="10" fill={PANEL} stroke={EDGE} strokeWidth="1.4" />
          <circle cx="25.2" cy="33.6" r="1.5" fill={DETAIL} />
          <circle cx="32.8" cy="33.6" r="1.5" fill={DETAIL} />
          <circle cx="29" cy="40.2" r="1.5" fill={DETAIL} />
          <circle cx="62" cy="29" r="5" fill={PANEL} stroke={EDGE} strokeWidth="1.2" />
          <circle cx="62" cy="29" r="2" fill={color} />
          <circle cx="62" cy="44" r="5" fill={PANEL} stroke={EDGE} strokeWidth="1.2" />
          <circle cx="62" cy="44" r="2" fill={color} />
          <rect x="74" y="26" width="7" height="14" rx="3.5" fill={PANEL} stroke={FAINT} />
          <rect x="75.5" y="27.5" width="4" height="6" rx="2" {...accent} />
          <path d="M43 22h12" stroke={DETAIL} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
      break;

    case "mic": // Micro de scène
      art = (
        <>
          <circle cx="48" cy="21" r="13" {...body} />
          <path d="M37 15h22M35.5 21h25M37 27h22M42 10.5v21M48 8v26M54 10.5v21" stroke={DETAIL} strokeWidth="1" fill="none" />
          <path d="M39.5 33.5l3 30c.2 1.4 1.3 2.5 2.7 2.5h5.6c1.4 0 2.5-1.1 2.7-2.5l3-30z" {...body} />
          <rect x="43.5" y="42" width="9" height="5" rx="1.4" {...accent} />
        </>
      );
      break;

    case "converter": // Convertisseur de signal
      art = (
        <>
          <rect x="16" y="18" width="64" height="36" rx="5" {...body} />
          <path d="M6 36h10M80 36h10" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 36h18M38 31l6 5-6 5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="52" y="30" width="20" height="12" rx="2.5" fill={softFill} stroke={color} strokeWidth="1.2" />
          {led(72, 24, "#22c55e")}
        </>
      );
      break;

    case "camera":
      art = (
        <>
          <path d="M26 20v-7h20v7" fill="none" stroke={EDGE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="20" width="44" height="32" rx="5" {...body} />
          <path d="M58 28h8l12-8v32l-12-8h-8z" {...body} />
          <circle cx="26" cy="36" r="6.5" fill={PANEL} stroke={EDGE} />
          <circle cx="26" cy="36" r="3" fill={softFill} stroke={color} strokeWidth="1" />
          {led(50, 27, "#ef4444")}
        </>
      );
      break;

    default: // Appareil générique : châssis rack
      art = (
        <>
          <rect x="6" y="20" width="84" height="32" rx="4.5" {...body} />
          {Array.from({ length: 6 }).map((_, index) => (
            <circle key={index} cx={17 + index * 12.4} cy="36" r="3.2" fill={PANEL} stroke={EDGE} strokeWidth="1" />
          ))}
          <rect x="12" y="25" width="26" height="3" rx="1.5" fill={DETAIL} />
          {led(82, 26.5, color)}
        </>
      );
  }

  return (
    <svg viewBox="0 0 96 72" width="100%" height="100%" aria-hidden="true" style={{ overflow: "visible" }}>
      {art}
    </svg>
  );
}
