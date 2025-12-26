export const PRODUCT_ORDER_STORAGE_KEY = "pulcipProductOrder"
export const THEME_STORAGE_KEY = "pulcipTheme"
export const AUTH_TOKEN_STORAGE_KEY = "pulcipAuthToken"

export const DEFAULT_LIST_ROWS = 8
export const DEFAULT_LIST_COLS = 5
export const LIST_AUTO_SAVE_DELAY_MS = 900

export const FORMULA_ERRORS = {
  CYCLE: "#CYCLE",
  REF: "#REF",
  DIV0: "#DIV/0",
  VALUE: "#ERR",
}

export const LIST_CELL_TONE_CLASSES = {
  none: "",
  amber: "bg-amber-500/10",
  sky: "bg-sky-500/10",
  emerald: "bg-emerald-500/10",
  rose: "bg-rose-500/10",
}

export const panelClass =
  "rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm"

export const categoryPalette = [
  "border-emerald-300/50 bg-emerald-500/15 text-emerald-50",
  "border-amber-300/50 bg-amber-500/15 text-amber-50",
  "border-sky-300/50 bg-sky-500/15 text-sky-50",
  "border-fuchsia-300/50 bg-fuchsia-500/15 text-fuchsia-50",
  "border-rose-300/50 bg-rose-500/15 text-rose-50",
  "border-indigo-300/50 bg-indigo-500/15 text-indigo-50",
]

export const taskStatusMeta = {
  todo: {
    label: "Yapılacak",
    helper: "Planla",
    accent: "text-amber-200",
    badge: "border-amber-300/60 bg-amber-500/15 text-amber-50",
  },
  doing: {
    label: "Devam",
    helper: "Odak",
    accent: "text-sky-200",
    badge: "border-sky-300/60 bg-sky-500/15 text-sky-50",
  },
  done: {
    label: "Tamamlandı",
    helper: "Bitenler",
    accent: "text-emerald-200",
    badge: "border-emerald-300/60 bg-emerald-500/15 text-emerald-50",
  },
}

export const taskDueTypeOptions = [
  { value: "today", label: "Bugün" },
  { value: "repeat", label: "Tekrarlanabilir gün" },
  { value: "date", label: "Özel tarih" },
]

export const taskRepeatDays = [
  { value: "1", label: "Pazartesi" },
  { value: "2", label: "Salı" },
  { value: "3", label: "Çarşamba" },
  { value: "4", label: "Perşembe" },
  { value: "5", label: "Cuma" },
  { value: "6", label: "Cumartesi" },
  { value: "0", label: "Pazar" },
]

export const taskRepeatDayValues = new Set(taskRepeatDays.map((day) => day.value))

export const STOCK_STATUS = {
  available: "available",
  used: "used",
}
