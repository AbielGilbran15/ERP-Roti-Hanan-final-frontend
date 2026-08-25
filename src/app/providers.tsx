"use client";

import {
  BrandVariants,
  FluentProvider,
  Toaster,
  createDarkTheme,
  createLightTheme,
} from "@fluentui/react-components";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useERPStore } from "@/store/use-erp-store";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({ mode: "light", toggleTheme: () => undefined });

const hananBrand: BrandVariants = {
  10: "#071D12",
  20: "#0D2D1D",
  30: "#123D28",
  40: "#174D33",
  50: "#1B5D3E",
  60: "#216B48",
  70: "#287A53",
  80: "#31895E",
  90: "#3C996A",
  100: "#4BA878",
  110: "#61B68A",
  120: "#7AC49D",
  130: "#96D1B0",
  140: "#B4DEC4",
  150: "#D2EAD9",
  160: "#EEF7F1",
};

const lightTheme = {
  ...createLightTheme(hananBrand),
  fontFamilyBase: "var(--font-geist-sans)",
  fontFamilyMonospace: "var(--font-geist-mono)",
  borderRadiusMedium: "8px",
  borderRadiusLarge: "12px",
};

const darkTheme = {
  ...createDarkTheme(hananBrand),
  fontFamilyBase: "var(--font-geist-sans)",
  fontFamilyMonospace: "var(--font-geist-mono)",
  borderRadiusMedium: "8px",
  borderRadiusLarge: "12px",
};

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const setHydrated = useERPStore((state) => state.setHydrated);

  useEffect(() => {
    const stored = window.localStorage.getItem("erp-hanan-theme") as ThemeMode | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setMode(stored ?? preferred);
    setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem("erp-hanan-theme", mode);
  }, [mode]);

  const context = useMemo(
    () => ({ mode, toggleTheme: () => setMode((current) => (current === "light" ? "dark" : "light")) }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={context}>
      <FluentProvider theme={mode === "dark" ? darkTheme : lightTheme}>
        {children}
        <Toaster toasterId="app-toaster" position="top-end" pauseOnHover />
      </FluentProvider>
    </ThemeContext.Provider>
  );
}
