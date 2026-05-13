"use client";

const START_EVENT = "app:progress:start";
const STOP_EVENT = "app:progress:stop";

export function startGlobalProgress() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(START_EVENT));
}

export function stopGlobalProgress() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STOP_EVENT));
}

export function getGlobalProgressEvents() {
  return { START_EVENT, STOP_EVENT };
}
