"use client";

import * as React from "react";

export type ThemeColor = string;

type ThemeColorContextType = {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
};

const ThemeColorContext = React.createContext<
  ThemeColorContextType | undefined
>(undefined);

export function ThemeColorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeColor, setThemeColor] = React.useState<ThemeColor>("indigo");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem("theme-color") as ThemeColor;
    if (savedTheme) {
      setThemeColor(savedTheme);
    }
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;
    const body = document.body;
    // Remove any existing theme-* classes
    body.className = body.className
      .split(" ")
      .filter((cls) => !cls.startsWith("theme-"))
      .join(" ");
    
      body.classList.add(`theme-${themeColor}`);
    
    localStorage.setItem("theme-color", themeColor);
  }, [themeColor, isMounted]);

  if (!isMounted) {
    // Prevent mismatch during hydration, but we need to render children.
    // Actually, we can just render children, but the effect will run on client.
    // To avoid flash of wrong theme, we might want to read from localStorage in a script,
    // but for now this is fine.
  }

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = React.useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error("useThemeColor must be used within a ThemeColorProvider");
  }
  return context;
}
