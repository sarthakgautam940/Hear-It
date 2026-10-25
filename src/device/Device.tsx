import type { ReactNode } from "react";
import { PhoneFit } from "./PhoneFit";
import { StatusBar } from "./StatusBar";

/**
 * Presentation only: on a desktop the app runs inside a drawn iPhone at its
 * real size, on a phone the frame is gone and the app fills the screen. The
 * styles decide which; nothing in the app depends on it.
 */
export function Device({ children }: { children: ReactNode }) {
  return (
    <div className="hi-stage">
      <div className="hi-device">
        <div className="hi-device__band" aria-hidden />
        <div className="hi-device__bezel" aria-hidden />
        <span className="hi-device__button" data-side="left" data-kind="switch" aria-hidden />
        <span className="hi-device__button" data-side="left" data-kind="volume-up" aria-hidden />
        <span className="hi-device__button" data-side="left" data-kind="volume-down" aria-hidden />
        <span className="hi-device__button" data-side="right" data-kind="power" aria-hidden />
        <div className="hi-screen">
          {children}
          <StatusBar />
          <div className="hi-island" aria-hidden />
          <div className="hi-homebar" aria-hidden />
        </div>
        <PhoneFit />
      </div>
    </div>
  );
}
