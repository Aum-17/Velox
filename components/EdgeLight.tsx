"use client";
import { useEffect } from "react";

const SELECTOR = ".glass, .btn, .chip, .wd, .cday, .goal, .badge, .cd";

/**
 * Feeds the pointer position into the hovered surface as --mx / --my (px, relative to that element), which the
 * CSS edge-light and spotlight gradients read. One listener for the whole app, throttled to animation frames.
 */
export function EdgeLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const el = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!el) return;
      // Nested surfaces (a chip inside a card) both light up.
      for (let n: HTMLElement | null = el; n; n = n.parentElement?.closest(SELECTOR) as HTMLElement | null) {
        const r = n.getBoundingClientRect();
        n.style.setProperty("--mx", `${e.clientX - r.left}px`);
        n.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
    };
    const onMove = (e: PointerEvent) => { last = e; if (!frame) frame = requestAnimationFrame(apply); };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
