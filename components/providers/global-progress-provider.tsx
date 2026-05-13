"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getGlobalProgressEvents } from "@/lib/ui-progress";

const { START_EVENT, STOP_EVENT } = getGlobalProgressEvents();

export function GlobalProgressProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    timerRef.current = null;
    finishTimerRef.current = null;
  };

  const start = () => {
    activeCountRef.current += 1;
    setVisible(true);
    setProgress((prev) => (prev < 8 ? 8 : prev));

    if (!timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const step = prev < 40 ? 10 : prev < 70 ? 4 : 1.5;
          return Math.min(92, prev + step);
        });
      }, 140);
    }
  };

  const stop = () => {
    activeCountRef.current = Math.max(0, activeCountRef.current - 1);
    if (activeCountRef.current > 0) return;

    clearTimers();
    setProgress(100);
    finishTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  };

  useEffect(() => {
    const onStart = () => start();
    const onStop = () => stop();

    window.addEventListener(START_EVENT, onStart);
    window.addEventListener(STOP_EVENT, onStop);

    const onSubmitCapture = () => start();
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      start();
    };

    document.addEventListener("submit", onSubmitCapture, true);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener(START_EVENT, onStart);
      window.removeEventListener(STOP_EVENT, onStop);
      document.removeEventListener("submit", onSubmitCapture, true);
      document.removeEventListener("click", onClickCapture, true);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (activeCountRef.current > 0) {
      activeCountRef.current = 1;
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 180ms ease" }}
    >
      <div
        className="h-full bg-primary"
        style={{ width: `${progress}%`, transition: "width 180ms ease" }}
      />
    </div>
  );
}
