"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { FirstRun } from "@/features/firstrun/FirstRun";
import { NightSheet } from "@/features/history/NightSheet";
import { VoiceCheckSheet } from "@/features/voicecheck/VoiceCheckSheet";
import { useEngine, useEngineInputs } from "@/hooks/useEngine";
import { ToastProvider } from "@/ui/Toast";
import { LiveBar } from "./LiveBar";
import { closeOverlay, useBehind, useOverlay } from "./overlays";
import { TabBar } from "./TabBar";
import { pageCommitted } from "./transitions";

function useServiceWorker(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
}

/**
 * Everything inside the phone's screen: the tab's page, the tab bar, the live
 * bar while a conversation runs anywhere but Talk, and the sheets and toasts
 * that rise over all of it. The first run sits inside the app so a sheet
 * opened from it steps it back like any other screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useEngineInputs();
  useServiceWorker();
  const pathname = usePathname();
  const snap = useEngine();
  // A tab's transition waits for its page; this is the moment the page is in.
  useLayoutEffect(pageCommitted, [pathname]);
  const overlay = useOverlay();
  const behind = useBehind();
  const liveElsewhere = snap.phase === "live" && snap.mode === "table" && pathname !== "/";

  return (
    <ToastProvider>
      <div className="hi-app" data-behind={behind} data-live={liveElsewhere}>
        {children}
        {liveElsewhere ? <LiveBar /> : null}
        <TabBar />
        <FirstRun />
      </div>
      <div className="hi-overlays" id="hi-overlays" />
      <NightSheet
        sessionId={overlay?.kind === "night" ? overlay.sessionId : null}
        onClose={closeOverlay}
      />
      <VoiceCheckSheet open={overlay?.kind === "voiceCheck"} onClose={closeOverlay} />
    </ToastProvider>
  );
}
