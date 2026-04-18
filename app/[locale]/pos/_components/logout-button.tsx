"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "@/app/[locale]/auth/actions";
import { useTranslations } from "next-intl";

export function LogoutButton({ variant = "outline", className }: { variant?: "outline" | "ghost" | "destructive" | "default", className?: string }) {
  const t = useTranslations("POS");

  const handleLogout = async () => {
    await logout();
    window.location.href = "/auth";
  };

  return (
    <Button variant={variant} className={className} onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      {t("logout")}
    </Button>
  );
}
