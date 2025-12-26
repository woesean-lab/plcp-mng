import { THEME_STORAGE_KEY } from "../constants/appConstants"

export const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark"
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch (error) {
    console.warn("Could not read theme preference", error)
  }
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light"
  return "dark"
}
