"use client";

import { useEffect } from "react";
import { BAR_COLOR, PHONE_QUERY } from "./phone";

/*
  Two things a real phone needs that the drawn one does not. While a text field
  is being typed in, the app keeps to the part of the screen the keyboard
  leaves, so a sheet's buttons stay above it (iOS covers the page instead of
  shrinking it). And the phone's own bars take the color of the theme chosen in
  Settings, not only the system's. In the drawn phone on a desktop this does
  nothing.
*/

function typing(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLElement && el.matches("input, textarea, select, [contenteditable]");
}

export function PhoneFit() {
  useEffect(() => {
    const phone = window.matchMedia(PHONE_QUERY);
    const root = document.documentElement;
    const view = window.visualViewport;

    const fit = () => {
      const keyboard =
        view !== null && phone.matches && typing() && Math.abs(view.scale - 1) < 0.01;
      if (!keyboard) {
        root.style.removeProperty("--vv-top");
        root.style.removeProperty("--vv-height");
        return;
      }
      root.style.setProperty("--vv-top", `${view.offsetTop}px`);
      root.style.setProperty("--vv-height", `${view.height}px`);
    };
    const afterTyping = () =>
      requestAnimationFrame(() => {
        fit();
        // iOS can leave the page scrolled up once its keyboard has gone.
        if (phone.matches && !typing() && window.scrollY !== 0) window.scrollTo(0, 0);
      });

    // Read fresh each time: the router replaces these tags when the page changes.
    const paintBars = () => {
      const theme = root.dataset.theme;
      const chosen =
        phone.matches && (theme === "light" || theme === "dark") ? BAR_COLOR[theme] : null;
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
        const color = chosen ?? (m.media.includes("dark") ? BAR_COLOR.dark : BAR_COLOR.light);
        if (m.content !== color) m.content = color;
      });
    };
    const onPhoneChange = () => {
      fit();
      paintBars();
    };

    const themeWatch = new MutationObserver(paintBars);
    themeWatch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const headWatch = new MutationObserver(paintBars);
    headWatch.observe(document.head, { childList: true, subtree: true });
    paintBars();
    view?.addEventListener("resize", fit);
    view?.addEventListener("scroll", fit);
    document.addEventListener("focusin", fit);
    document.addEventListener("focusout", afterTyping);
    phone.addEventListener("change", onPhoneChange);
    return () => {
      themeWatch.disconnect();
      headWatch.disconnect();
      view?.removeEventListener("resize", fit);
      view?.removeEventListener("scroll", fit);
      document.removeEventListener("focusin", fit);
      document.removeEventListener("focusout", afterTyping);
      phone.removeEventListener("change", onPhoneChange);
    };
  }, []);
  return null;
}
