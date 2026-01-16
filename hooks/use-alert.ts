"use client";

import { useDialog } from "@/components/providers/dialog-provider";

export function useAlert() {
  const { alert } = useDialog();
  return alert;
}
