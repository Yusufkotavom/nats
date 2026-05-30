"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { X } from "lucide-react";

export function SubscriptionReadonlyPopup({
  openByDefault,
}: {
  openByDefault: boolean;
}) {
  const [open, setOpen] = useState(() => {
    if (!openByDefault || typeof window === "undefined") return false;
    const alreadyShown = window.sessionStorage.getItem("subscription-readonly-popup") === "1";
    if (alreadyShown) return false;
    window.sessionStorage.setItem("subscription-readonly-popup", "1");
    return true;
  });

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background p-4 shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Subscription Expired</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Company Anda masuk mode read-only karena trial/subscription sudah tidak aktif.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-mr-1 -mt-1"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/subscription">Buka Subscription</Link>
        </Button>
      </div>
    </div>
  );
}
