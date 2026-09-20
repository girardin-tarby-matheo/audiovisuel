import { useEffect, useState, useCallback } from "react";
import { CanvasBoard } from "./CanvasBoard";
import { SynopticBoard } from "./SynopticBoard";
import { PropertiesPanel } from "./PropertiesPanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CatalogManagerModal } from "./CatalogManagerModal";
import { useStudio } from "../store/studioStore";
import { Clapperboard, MousePointer2, Hand, Download, ArrowRight } from "lucide-react";

function WelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="mx-4 max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-[#13161f] to-[#0c0e14] p-8 shadow-2xl"
        style={{ animation: "modal-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/20 to-cyan-300/10">
          <Clapperboard size={28} className="text-amber-200" />
        </div>
        <h2 className="text-2xl font-bold text-white">Bienvenue dans Shotboard Studio</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Planifiez vos tournages et captations en glissant des éléments depuis la bibliothèque vers le plateau infini.
        </p>
        <div className="mt-6 space-y-3">
          {[
            { icon: <MousePointer2 size={15} />, key: "V", text: "Mode sélection & édition" },
            { icon: <Hand size={15} />, key: "Espace / H", text: "Mode déplacement du plateau" },
            { icon: <Download size={15} />, key: "Molette", text: "Zoom avant / arrière" },
          ].map((hint) => (
            <div key={hint.key} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
              <span className="text-amber-200/80">{hint.icon}</span>
              <kbd className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                {hint.key}
              </kbd>
              <span className="text-sm text-slate-300">{hint.text}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300/90 py-3 text-sm font-semibold text-ink-950 transition hover:bg-amber-200"
        >
          Commencer
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ToastBar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const isSuccess =
    message.includes("copié") ||
    message.includes("téléchargé") ||
    message.includes("Export") ||
    message.includes("✓");

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 2800);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="toast-in pointer-events-auto cursor-pointer absolute bottom-20 left-1/2 z-50 -translate-x-1/2 select-none transition-transform hover:scale-105 active:scale-95"
      title="Cliquer pour fermer"
    >
      <div className="flex items-center gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-[#12161f]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        {isSuccess ? (
          <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-emerald-400">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
            <path
              d="M5 8.2l2 2 4-4.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="20"
              style={{ animation: "check-draw 350ms ease both 100ms" }}
            />
          </svg>
        ) : (
          <div className="h-2 w-2 shrink-0 rounded-full bg-amber-300/80" />
        )}
        <span className="text-sm text-slate-100">{message}</span>
      </div>
      <div className="mx-auto mt-1 h-0.5 w-3/4 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-amber-300/60"
          style={{ animation: "progress-shrink 2.8s linear both" }}
        />
      </div>
    </div>
  );
}

export default function StudioApp() {
  const toast = useStudio((s) => s.toast);
  const setToast = useStudio((s) => s.setToast);
  const viewMode = useStudio((s) => s.viewMode);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("shotboard-welcome-seen");
    if (!seen) setShowWelcome(true);
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem("shotboard-welcome-seen", "1");
  }, []);

  return (
    <div className="flex h-full min-h-screen flex-col bg-ink-950 text-slate-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {viewMode === "plan" ? (
          <>
            <Sidebar />
            <CanvasBoard />
            <PropertiesPanel />
          </>
        ) : (
          <SynopticBoard />
        )}
      </div>
      <CatalogManagerModal />
      {toast && <ToastBar message={toast} onDismiss={() => setToast(null)} />}
      {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
    </div>
  );
}
