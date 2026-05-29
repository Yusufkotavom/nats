"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function SubscriptionReadonlyPopup({
  openByDefault,
}: {
  openByDefault: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!openByDefault) return;
    const alreadyShown =
      typeof window !== "undefined" && window.sessionStorage.getItem("subscription-readonly-popup") === "1";
    if (alreadyShown) return;

    setOpen(true);
    window.sessionStorage.setItem("subscription-readonly-popup", "1");
  }, [openByDefault]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="Subscription inactive">
        <DialogHeader>
          <DialogTitle>Subscription Expired</DialogTitle>
          <DialogDescription>
            Company Anda masuk mode read-only karena trial/subscription sudah tidak aktif. Aktivasi
            subscription untuk melanjutkan transaksi baru.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button asChild>
            <Link href="/subscription">Buka Subscription</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
