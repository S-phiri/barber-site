export const BBIT_THEME_KEY = "bbit-theme";

export type BbitTheme = "light" | "dark";

export function getBbitTheme(): BbitTheme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(BBIT_THEME_KEY);
  return v === "light" ? "light" : "dark";
}

export function applyBbitTheme(theme: BbitTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function initBbitTheme(): void {
  applyBbitTheme(getBbitTheme());
}

export const BBIT_THEME_CHANGE_EVENT = "bbit-theme-change";

export function setBbitTheme(theme: BbitTheme): void {
  localStorage.setItem(BBIT_THEME_KEY, theme);
  applyBbitTheme(theme);
  window.dispatchEvent(new CustomEvent(BBIT_THEME_CHANGE_EVENT, { detail: theme }));
}

export function toggleBbitTheme(): BbitTheme {
  const next: BbitTheme = getBbitTheme() === "dark" ? "light" : "dark";
  setBbitTheme(next);
  return next;
}
