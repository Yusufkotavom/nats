"use client";

import { useDialog } from "@/components/providers/dialog-provider";

export function useConfirm() {
  const { confirm } = useDialog();
  return confirm;
}
