import { THEME_STORAGE_KEY } from "../constants/appConstants"

export const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark"

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme
    }
  } catch (error) {
    console.warn("Could not read theme preference", error)
  }

  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light"
  }

  return "dark"
}
