"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

const THEME_STORAGE_KEY = "mtg-deck-builder-theme";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
      themes={["dark", "light"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { THEME_STORAGE_KEY };
