"use client";

import { Button } from "@/components/ui/button";
import { Delete, Eraser } from "lucide-react";
import { useTranslations } from "next-intl";

interface NumPadProps {
  onKeyPress: (key: string) => void;
  className?: string;
}

export function NumPad({ onKeyPress, className }: NumPadProps) {
  const t = useTranslations("POS");
  const keys = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: ".", value: "." },
    { label: "0", value: "0" },
    { label: "DEL", value: "BACKSPACE", icon: Delete },
  ];

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {keys.map((key) => (
        <Button
          key={key.value}
          variant={key.value === "BACKSPACE" ? "destructive" : "outline"}
          className="h-16 text-2xl font-bold"
          onClick={() => onKeyPress(key.value)}
        >
          {key.icon ? <key.icon className="h-6 w-6" /> : key.label}
        </Button>
      ))}
      <Button
        variant="secondary"
        className="col-span-3 h-12 text-lg font-medium"
        onClick={() => onKeyPress("CLEAR")}
      >
        <Eraser className="mr-2 h-4 w-4" />
        {t("clear")}
      </Button>
    </div>
  );
}
