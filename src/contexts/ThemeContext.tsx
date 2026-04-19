"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme:     Theme;
  resolved:  "light" | "dark";
  setTheme:  (t: Theme) => void;
  toggle:    () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system", resolved: "light",
  setTheme: () => {}, toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,   setThemeState] = useState<Theme>("system");
  const [resolved, setResolved]  = useState<"light"|"dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("poolpal_theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    const applyTheme = (t: Theme) => {
      const isDark =
        t === "dark" ||
        (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

      document.documentElement.classList.toggle("dark", isDark);
      setResolved(isDark ? "dark" : "light");
    };

    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme("system");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("poolpal_theme", t);
  };

  const toggle = () => {
    setTheme(resolved === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
