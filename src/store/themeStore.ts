/**
 * Re-export from themeStore.tsx so any reference to themeStore.ts resolves.
 * The implementation lives in .tsx because it contains JSX (ThemeProvider).
 */
export { ThemeProvider, useThemeStore, initTheme } from "./themeStore.tsx";
