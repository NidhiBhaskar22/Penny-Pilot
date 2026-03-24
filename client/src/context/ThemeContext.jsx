import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "pennypilot-theme";
const VALID_MODES = new Set(["light", "dark"]);

const ThemeContext = createContext({
  themeMode: "dark",
  effectiveTheme: "dark",
  setThemeMode: () => {},
});

function getStoredThemeMode() {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return VALID_MODES.has(stored) ? stored : "dark";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.dataset.themeMode = themeMode;
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      effectiveTheme: themeMode,
      setThemeMode,
    }),
    [themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
