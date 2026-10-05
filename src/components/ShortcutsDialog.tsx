import { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

const GROUPS: Array<{ title: string; rows: Array<[string, string]> }> = [
  {
    title: "Plateau",
    rows: [
      ["V", "Mode sélection"],
      ["H ou Espace", "Déplacer le plateau"],
      ["Molette", "Zoom avant / arrière"],
      ["Ctrl + A", "Tout sélectionner"],
      ["Flèches", "Déplacer la sélection (Maj = x4)"],
      ["Ctrl + C / V", "Copier / dupliquer"],
      ["Suppr", "Supprimer la sélection"],
    ],
  },
  {
    title: "Édition",
    rows: [
      ["Ctrl + Z", "Annuler"],
      ["Ctrl + Y ou Ctrl + Maj + Z", "Rétablir"],
      ["Double-clic sur un nom", "Déplacer le nom librement"],
      ["Échap", "Terminer un déplacement / désélectionner"],
      ["?", "Afficher cette aide"],
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Raccourcis clavier" className="modal-card w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-ink-800 to-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/20 to-cyan-300/10 text-amber-200">
              <Keyboard size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">Aide</p>
              <h2 className="text-lg font-semibold text-white">Raccourcis clavier</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="section-title mb-2">{group.title}</h3>
              <ul className="space-y-1.5">
                {group.rows.map(([keys, label]) => (
                  <li key={keys} className="flex items-start justify-between gap-3 text-[12px] text-slate-300">
                    <span>{label}</span>
                    <kbd className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-200">{keys}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
