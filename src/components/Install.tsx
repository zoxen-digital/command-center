"use client";
import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install app" support.
 * - Android / Chrome / Edge: uses the browser's native install prompt.
 * - iPhone / iPad (Safari has no prompt): shows "Share → Add to Home Screen" steps.
 * - Hidden once the app is already installed (running standalone).
 */
export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function prompt() {
    if (evt) {
      await evt.prompt();
      const r = await evt.userChoice;
      if (r.outcome === "accepted") setInstalled(true);
      setEvt(null);
    } else if (ios) {
      setIosHelp(true);
    }
  }

  return { canShow: !installed && (!!evt || ios), prompt, iosHelp, closeIos: () => setIosHelp(false) };
}

export function IosInstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full bg-surface rounded-t-[2rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-12 rounded-2xl" />
            <div><div className="font-bold text-heading">Install Command</div><div className="text-xs text-muted">Add it to your Home Screen</div></div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm !px-2"><X size={18} /></button>
        </div>
        <ol className="space-y-3 text-sm">
          <li className="flex items-center gap-3"><span className="size-8 rounded-xl bg-surface-2 flex items-center justify-center"><Share size={16} className="text-[#2639e8]" /></span> Tap the <b>Share</b> button in Safari</li>
          <li className="flex items-center gap-3"><span className="size-8 rounded-xl bg-surface-2 flex items-center justify-center"><SquarePlus size={16} className="text-[#2639e8]" /></span> Choose <b>Add to Home Screen</b></li>
          <li className="flex items-center gap-3"><span className="size-8 rounded-xl bg-surface-2 flex items-center justify-center font-bold text-[#2639e8]">✓</span> Tap <b>Add</b>. “Command” will appear on your phone</li>
        </ol>
      </div>
    </div>
  );
}
