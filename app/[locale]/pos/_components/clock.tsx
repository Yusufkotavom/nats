"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface ClockProps {
  startTime: string;
}

export function Clock({ startTime }: ClockProps) {
  const t = useTranslations("POS");
  const [time, setTime] = useState(new Date());
  const [duration, setDuration] = useState("");

  useEffect(() => {
    // Initial calculation
    const updateTime = () => {
      const now = new Date();
      setTime(now);

      const start = new Date(startTime);
      const diff = now.getTime() - start.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDuration(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateTime(); // Run immediately
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="flex flex-col items-end text-sm mr-2">
      <div className="font-bold">{time.toLocaleTimeString()}</div>
      <div className="text-muted-foreground text-xs">
        {t("session")}: {duration}
      </div>
    </div>
  );
}
