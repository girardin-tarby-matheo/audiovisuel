import { useRef } from "react";
import { ImagePlus, Move, Trash2, Check } from "lucide-react";
import { useStudio } from "../store/studioStore";

const MAX_SIDE = 2000;

/** Réduit l'image pour rester dans le quota du stockage local et garde la transparence si possible. */
function loadScaledImage(file: File): Promise<{ dataUrl: string; aspect: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) {
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL("image/webp", 0.88), aspect: canvas.width / canvas.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

export function BackgroundPanel() {
  const background = useStudio((s) => s.planBackground);
  const editing = useStudio((s) => s.planBackgroundEditing);
  const setBackground = useStudio((s) => s.setPlanBackground);
  const updateBackground = useStudio((s) => s.updatePlanBackground);
  const setEditing = useStudio((s) => s.setPlanBackgroundEditing);
  const setToast = useStudio((s) => s.setToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const { dataUrl, aspect } = await loadScaledImage(file);
      const board = document.getElementById("board-export");
      const camera = useStudio.getState().camera;
      const width = 1200;
      const centerX = board ? (board.clientWidth / 2 - camera.x) / camera.zoom : 600;
      const centerY = board ? (board.clientHeight / 2 - camera.y) / camera.zoom : 400;
      setBackground({ image: dataUrl, aspect, width, x: Math.round(centerX - width / 2), y: Math.round(centerY - width / aspect / 2), opacity: 0.55 });
      setEditing(true);
      setToast("Fond de plan ajouté · glissez-le pour le placer ✓");
    } catch {
      setToast("Image illisible — essayez un autre fichier");
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="section-title mb-2">Fond de plan</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {!background ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-4 text-[11px] text-slate-400 transition hover:border-amber-300/40 hover:bg-amber-300/5 hover:text-amber-100"
        >
          <ImagePlus size={18} />
          Ajouter une image (plan de salle, photo…)
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src={background.image} alt="" className="h-10 w-14 shrink-0 rounded-md border border-white/10 object-cover" />
            <button type="button" onClick={() => setEditing(!editing)} aria-pressed={editing} className={`btn flex-1 px-2 py-1.5 text-[11px] ${editing ? "btn-accent" : ""}`}>
              {editing ? <Check size={13} /> : <Move size={13} />}
              {editing ? "Terminer" : "Placer"}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn px-2 py-1.5" title="Remplacer l'image" aria-label="Remplacer l'image">
              <ImagePlus size={13} />
            </button>
            <button type="button" onClick={() => setBackground(null)} className="btn btn-danger px-2 py-1.5" title="Retirer le fond" aria-label="Retirer le fond de plan">
              <Trash2 size={13} />
            </button>
          </div>
          <Slider label="Opacité" value={Math.round(background.opacity * 100)} min={5} max={100} unit="%" onChange={(value) => updateBackground({ opacity: value / 100 })} />
          <Slider
            label="Taille"
            value={Math.round(background.width)}
            min={200}
            max={4000}
            unit=" px"
            onChange={(value) => {
              // Redimensionne autour du centre pour ne pas faire « fuir » l'image.
              const centerX = background.x + background.width / 2;
              const centerY = background.y + background.width / background.aspect / 2;
              updateBackground({ width: value, x: Math.round(centerX - value / 2), y: Math.round(centerY - value / background.aspect / 2) });
            }}
          />
          {editing && <p className="text-[10px] leading-snug text-slate-500">Glissez l'image sur le plateau. Échap pour terminer.</p>}
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="section-title">{label}</span>
        <span className="font-mono text-[11px] text-slate-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" aria-label={label} />
    </div>
  );
}
