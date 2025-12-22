import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Toaster, toast } from "react-hot-toast"

const fallbackTemplates = [
  { label: "Hoş geldin", value: "Hoş geldin! Burada herkese yer var.", category: "Karşılama" },
  {
    label: "Bilgilendirme",
    value: "Son durum: Görev planlandığı gibi ilerliyor.",
    category: "Bilgilendirme",
  },
  { label: "Hatırlatma", value: "Unutma: Akşam 18:00 toplantısına hazır ol.", category: "Hatırlatma" },
]

const fallbackCategories = Array.from(new Set(["Genel", ...fallbackTemplates.map((tpl) => tpl.category || "Genel")]))

const PRODUCT_ORDER_STORAGE_KEY = "pulcipProductOrder"
const THEME_STORAGE_KEY = "pulcipTheme"
const AUTH_TOKEN_STORAGE_KEY = "pulcipAuthToken"
const TASKS_STORAGE_KEY = "pulcipTasks"
const DEFAULT_LIST_ROWS = 8
const DEFAULT_LIST_COLS = 5
const FORMULA_ERRORS = {
  CYCLE: "#CYCLE",
  REF: "#REF",
  DIV0: "#DIV/0",
  VALUE: "#ERR",
}
const LIST_CELL_TONE_CLASSES = {
  none: "",
  amber: "bg-amber-500/10",
  sky: "bg-sky-500/10",
  emerald: "bg-emerald-500/10",
  rose: "bg-rose-500/10",
}
const LIST_NUMBER_FORMATTER = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 })
const LIST_PERCENT_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 2,
})
const LIST_CURRENCY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})
const LIST_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR")
const initialProblems = [
  { id: 1, username: "@ornek1", issue: "Ödeme ekranda takıldı, 2 kez kart denemiş.", status: "open" },
  { id: 2, username: "@ornek2", issue: "Teslimat gecikmesi şikayeti.", status: "open" },
]

const initialProducts = [
  {
    id: "prd-1",
    name: "Cyber Drift DLC",
    note: "Yeni promosyon, hemen teslim",
    stocks: [
      { id: "stk-1", code: "CYDR-FT67-PLCP-2025" },
      { id: "stk-2", code: "CYDR-FT67-PLCP-2026" },
    ],
  },
  {
    id: "prd-2",
    name: "Galaxy Pass",
    note: "Deneme sürümü için",
    stocks: [{ id: "stk-3", code: "XBGP-3M-TRIAL-KEY" }],
  },
  {
    id: "prd-3",
    name: "Indie Bundle",
    note: "Hediye kuponu",
    stocks: [{ id: "stk-4", code: "INDI-BNDL-PLCP-4432" }],
  },
]

const initialTasks = [
  {
    id: "tsk-1",
    title: "Haftalik oncelik listesini guncelle",
    note: "Kritik musteriler + teslim sureleri",
    owner: "Burak",
    dueType: "date",
    dueDate: "2025-12-29",
    status: "todo",
  },
  {
    id: "tsk-2",
    title: "Sablon kategorilerini toparla",
    note: "Genel, satis, destek",
    owner: "Ece",
    dueType: "repeat",
    repeatDay: "2",
    status: "doing",
  },
  {
    id: "tsk-3",
    title: "Haftalik raporu paylas",
    note: "Cuma 17:00",
    owner: "Tuna",
    dueType: "today",
    status: "done",
  },
]

const panelClass =
  "rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm"

const categoryPalette = [
  "border-emerald-300/50 bg-emerald-500/15 text-emerald-50",
  "border-amber-300/50 bg-amber-500/15 text-amber-50",
  "border-sky-300/50 bg-sky-500/15 text-sky-50",
  "border-fuchsia-300/50 bg-fuchsia-500/15 text-fuchsia-50",
  "border-rose-300/50 bg-rose-500/15 text-rose-50",
  "border-indigo-300/50 bg-indigo-500/15 text-indigo-50",
]

const taskStatusMeta = {
  todo: {
    label: "Yapilacak",
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
    label: "Tamamlandi",
    helper: "Bitenler",
    accent: "text-emerald-200",
    badge: "border-emerald-300/60 bg-emerald-500/15 text-emerald-50",
  },
}

const taskDueTypeOptions = [
  { value: "today", label: "Bugun" },
  { value: "repeat", label: "Tekrarlanabilir gun" },
  { value: "date", label: "Ozel tarih" },
]

const taskRepeatDays = [
  { value: "1", label: "Pazartesi" },
  { value: "2", label: "Sali" },
  { value: "3", label: "Carsamba" },
  { value: "4", label: "Persembe" },
  { value: "5", label: "Cuma" },
  { value: "6", label: "Cumartesi" },
  { value: "0", label: "Pazar" },
]


const getInitialTheme = () => {
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

const toColumnLabel = (index) => {
  let label = ""
  let current = index
  while (current >= 0) {
    label = String.fromCharCode(65 + (current % 26)) + label
    current = Math.floor(current / 26) - 1
  }
  return label
}

const createEmptySheet = (rows, cols) => {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""))
}

const errorValue = (code) => ({ error: code })
const isErrorValue = (value) => Boolean(value && typeof value === "object" && "error" in value)

const tokenizeFormula = (input) => {
  const tokens = []
  let index = 0
  while (index < input.length) {
    const char = input[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      let start = index
      let hasDot = false
      while (index < input.length) {
        const current = input[index]
        if (current === ".") {
          if (hasDot) break
          hasDot = true
          index += 1
          continue
        }
        if (/[0-9]/.test(current)) {
          index += 1
          continue
        }
        break
      }
      const raw = input.slice(start, index)
      const numberValue = Number(raw)
      if (!Number.isFinite(numberValue)) {
        return { error: "number" }
      }
      tokens.push({ type: "number", value: numberValue })
      continue
    }
    if (/[A-Za-z]/.test(char)) {
      let start = index
      while (index < input.length && /[A-Za-z]/.test(input[index])) {
        index += 1
      }
      const letters = input.slice(start, index)
      let digitStart = index
      while (index < input.length && /[0-9]/.test(input[index])) {
        index += 1
      }
      const digits = input.slice(digitStart, index)
      if (digits) {
        tokens.push({ type: "cell", value: `${letters}${digits}` })
      } else {
        tokens.push({ type: "identifier", value: letters })
      }
      continue
    }
    if ("+-*/".includes(char)) {
      tokens.push({ type: "operator", value: char })
      index += 1
      continue
    }
    if ("(),:".includes(char)) {
      tokens.push({ type: "punct", value: char })
      index += 1
      continue
    }
    return { error: "invalid" }
  }
  return { tokens }
}

const parseFormula = (input) => {
  const tokenResult = tokenizeFormula(input)
  if (tokenResult.error) return { error: tokenResult.error }
  const tokens = tokenResult.tokens
  let position = 0

  const peek = () => tokens[position]
  const consume = () => tokens[position++]
  const matchPunct = (value) => {
    const token = peek()
    if (token?.type === "punct" && token.value === value) {
      position += 1
      return true
    }
    return false
  }
  const expectPunct = (value) => {
    if (!matchPunct(value)) throw new Error("expected")
  }

  const parseExpression = () => {
    let node = parseTerm()
    while (true) {
      const token = peek()
      if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
        consume()
        node = { type: "binary", op: token.value, left: node, right: parseTerm()}
        continue
      }
      break
    }
    return node
  }

  const parseTerm = () => {
    let node = parseFactor()
    while (true) {
      const token = peek()
      if (token?.type === "operator" && (token.value === "*" || token.value === "/")) {
        consume()
        node = { type: "binary", op: token.value, left: node, right: parseFactor()}
        continue
      }
      break
    }
    return node
  }

  const parseFactor = () => {
    const token = peek()
    if (!token) throw new Error("unexpected")
    if (token.type === "operator" && token.value === "-") {
      consume()
      return { type: "unary", op: "-", value: parseFactor()}
    }
    if (token.type === "number") {
      consume()
      return { type: "number", value: token.value }
    }
    if (token.type === "cell") {
      consume()
      if (matchPunct(":")) {
        const endToken = peek()
        if (!endToken || endToken.type !== "cell") throw new Error("range")
        consume()
        return { type: "range", start: token.value, end: endToken.value }
      }
      return { type: "cell", value: token.value }
    }
    if (token.type === "identifier") {
      consume()
      if (matchPunct("(")) {
        const args = []
        if (!matchPunct(")")) {
          while (true) {
            args.push(parseExpression())
            if (matchPunct(",")) continue
            expectPunct(")")
            break
          }
        }
        return { type: "function", name: token.value, args }
      }
      throw new Error("identifier")
    }
    if (matchPunct("(")) {
      const node = parseExpression()
      expectPunct(")")
      return node
    }
    throw new Error("token")
  }

  try {
    const node = parseExpression()
    if (position !== tokens.length) throw new Error("trailing")
    return { node }
  } catch {
    return { error: "parse" }
  }
}

const parseCellRef = (ref) => {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref)
  if (!match) return null
  const letters = match[1].toUpperCase()
  const row = Number.parseInt(match[2], 10) - 1
  if (!Number.isFinite(row) || row < 0) return null
  let col = 0
  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  col -= 1
  if (col < 0) return null
  return { row, col }
}

const formatCellValue = (value) => {
  if (isErrorValue(value)) return value.error
  if (Array.isArray(value)) return FORMULA_ERRORS.VALUE
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : FORMULA_ERRORS.VALUE
  return String(value)
}

const formatListCellValue = (value, format = {}) => {
  if (!format || !format.type || format.type === "auto") return formatCellValue(value)
  if (isErrorValue(value) || Array.isArray(value)) return formatCellValue(value)
  if (value === null || value === undefined) return ""
  if (format.type === "date") {
    const dateValue =
      typeof value === "number" ? new Date(value) : new Date(String(value).trim())
    if (!Number.isNaN(dateValue.getTime())) {
      return LIST_DATE_FORMATTER.format(dateValue)
    }
    return formatCellValue(value)
  }
  const numericValue =
    typeof value === "number" ? value : Number(String(value).trim().replace(",", "."))
  if (!Number.isFinite(numericValue)) return formatCellValue(value)
  if (format.type === "percent") return LIST_PERCENT_FORMATTER.format(numericValue)
  if (format.type === "currency") return LIST_CURRENCY_FORMATTER.format(numericValue)
  if (format.type === "number") return LIST_NUMBER_FORMATTER.format(numericValue)
  return formatCellValue(value)
}

function LoadingIndicator({ label = "Yükleniyor..." }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
      {label}
    </span>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState("messages")
  const [theme, setTheme] = useState(() => getInitialTheme())
  const [authToken, setAuthToken] = useState(() => {
    if (typeof window === "undefined") return ""
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ""
    } catch (error) {
      console.warn("Could not read auth token", error)
      return ""
    }
  })
  const [isAuthed, setIsAuthed] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [title, setTitle] = useState("Pulcip Manage")
  const [message, setMessage] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Genel")
  const [newCategory, setNewCategory] = useState("")
  const [categories, setCategories] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [lists, setLists] = useState([])
  const [activeListId, setActiveListId] = useState("")
  const [listName, setListName] = useState("")
  const [isListsLoading, setIsListsLoading] = useState(true)
  const [isListSaving, setIsListSaving] = useState(false)
  const [listSavedAt, setListSavedAt] = useState(null)
  const [listRenameDraft, setListRenameDraft] = useState("")
  const [confirmListDelete, setConfirmListDelete] = useState(null)
  const [editingListCell, setEditingListCell] = useState({ row: null, col: null })
  const [selectedListCell, setSelectedListCell] = useState({ row: null, col: null })
  const [selectedListRows, setSelectedListRows] = useState(() => new Set())
  const [selectedListCols, setSelectedListCols] = useState(() => new Set())
  const [lastListRowSelect, setLastListRowSelect] = useState(null)
  const [lastListColSelect, setLastListColSelect] = useState(null)
  const [listContextMenu, setListContextMenu] = useState({
    open: false,
    type: null,
    index: null,
    x: 0,
    y: 0,
  })
  const listSaveTimers = useRef(new Map())
  const listSaveQueue = useRef(new Map())
  const listSavedTimer = useRef(null)
  const listLoadErrorRef = useRef(false)
  const listSaveErrorRef = useRef(false)
  const [isEditingActiveTemplate, setIsEditingActiveTemplate] = useState(false)
  const [activeTemplateDraft, setActiveTemplateDraft] = useState("")
  const [isTemplateSaving, setIsTemplateSaving] = useState(false)
  const [openCategories, setOpenCategories] = useState({})
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmCategoryTarget, setConfirmCategoryTarget] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [delayDone, setDelayDone] = useState(false)

  const [problems, setProblems] = useState([])
  const [problemUsername, setProblemUsername] = useState("")
  const [problemIssue, setProblemIssue] = useState("")
  const [confirmProblemTarget, setConfirmProblemTarget] = useState(null)

  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState({ name: "", deliveryTemplate: "" })
  const [stockForm, setStockForm] = useState({ productId: "", code: "" })
  const [confirmStockTarget, setConfirmStockTarget] = useState(null)
  const [productSearch, setProductSearch] = useState("")
  const [openProducts, setOpenProducts] = useState({})
  const [confirmProductTarget, setConfirmProductTarget] = useState(null)
  const [bulkCount, setBulkCount] = useState({})
  const [lastDeleted, setLastDeleted] = useState(null)
  const [productOrder, setProductOrder] = useState([])
  const [dragState, setDragState] = useState({ activeId: null, overId: null })
  const [editingProduct, setEditingProduct] = useState({})

  const [tasks, setTasks] = useState(() => {
    const normalizeTask = (task) => {
      const dueDate = task.dueDate || task.due || ""
      const dueType = task.dueType || (dueDate ? "date" : "today")
      const repeatDay = task.repeatDay ?? "1"
      return {
        ...task,
        dueType,
        dueDate: dueType === "date" ? dueDate : "",
        repeatDay: dueType === "repeat" ? repeatDay : "",
        repeatWakeAt: task.repeatWakeAt || "",
      }
    }
    if (typeof window === "undefined") return initialTasks.map(normalizeTask)
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed.map(normalizeTask)
      }
    } catch (error) {
      console.warn("Could not load tasks", error)
    }
    return initialTasks.map(normalizeTask)
  })
  const [taskForm, setTaskForm] = useState({
    title: "",
    note: "",
    owner: "",
    dueType: "today",
    repeatDay: "1",
    dueDate: "",
  })
  const [confirmTaskDelete, setConfirmTaskDelete] = useState(null)
  const [taskDragState, setTaskDragState] = useState({ activeId: null, overStatus: null })
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [noteModalDraft, setNoteModalDraft] = useState("")
  const [taskDetailTarget, setTaskDetailTarget] = useState(null)

  const isLight = theme === "light"

  useEffect(() => {
    const root = document.documentElement
    if (!root) return
    root.setAttribute("data-theme", theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      console.warn("Could not persist theme preference", error)
    }
  }, [theme])

  useEffect(() => {
    let isMounted = true

    const verifyAuth = async () => {
      setIsAuthChecking(true)
      try {
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
        const res = await fetch("/api/auth/verify", { headers })
        if (!res.ok) throw new Error("unauthorized")
        const data = await res.json()
        if (!isMounted) return
        setIsAuthed(true)
      } catch (error) {
        if (!isMounted) return
        setIsAuthed(false)
        if (authToken) {
          try {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
          } catch (removeError) {
            console.warn("Could not clear auth token", removeError)
          }
          setAuthToken("")
        }
      } finally {
        if (isMounted) setIsAuthChecking(false)
      }
    }

    verifyAuth()

    return () => {
      isMounted = false
    }
  }, [authToken])

  useEffect(() => {
    if (isAuthChecking) return
    const preloader = document.getElementById("app-preloader")
    if (!preloader) return
    preloader.classList.add("app-preloader--hide")
    const timer = window.setTimeout(() => {
      preloader.remove()
    }, 220)
    return () => window.clearTimeout(timer)
  }, [isAuthChecking])

  const apiFetch = useCallback(
    async (input, init = {}) => {
      const headers = new Headers(init.headers || {})
      if (authToken) {
        headers.set("Authorization", `Bearer ${authToken}`)
      }
      const res = await fetch(input, { ...init, headers })
      if (res.status === 401) {
        setIsAuthed(false)
        setAuthToken("")
        try {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
        } catch (removeError) {
          console.warn("Could not clear auth token", removeError)
        }
      }
      return res
    },
    [authToken],
  )

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRODUCT_ORDER_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setProductOrder(parsed)
      }
    } catch (error) {
      console.warn("Could not load product order", error)
    }
  }, [])

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    setIsListsLoading(true)
    ;(async () => {
      try {
        const res = await apiFetch("/api/lists", { signal: controller.signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setLists(Array.isArray(data) ? data : [])
        listLoadErrorRef.current = false
      } catch (error) {
        if (error?.name === "AbortError") return
        setLists([])
        if (!listLoadErrorRef.current) {
          listLoadErrorRef.current = true
          toast.error("Liste verileri alınamadı (API/DB kontrol edin).")
        }
      } finally {
        setIsListsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [apiFetch, isAuthed])

  useEffect(() => {
    if (lists.length === 0) {
      if (activeListId) setActiveListId("")
      return
    }
    if (!lists.some((list) => list.id === activeListId)) {
      setActiveListId(lists[0].id)
    }
  }, [lists, activeListId])

  useEffect(() => {
    setEditingListCell({ row: null, col: null })
    setSelectedListCell({ row: null, col: null })
    setSelectedListRows(new Set())
    setSelectedListCols(new Set())
    setLastListRowSelect(null)
    setLastListColSelect(null)
    setListContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev))
    setConfirmListDelete(null)
    setListRenameDraft("")
  }, [activeListId])

  useEffect(() => {
    if (!listContextMenu.open) return
    const handleClick = () => {
      setListContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev))
    }
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setListContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev))
      }
    }
    window.addEventListener("click", handleClick)
    window.addEventListener("contextmenu", handleClick)
    window.addEventListener("keydown", handleKey)
    return () => {
      window.removeEventListener("click", handleClick)
      window.removeEventListener("contextmenu", handleClick)
      window.removeEventListener("keydown", handleKey)
    }
  }, [listContextMenu.open])

  useEffect(() => {
    return () => {
      listSaveTimers.current.forEach((timerId) => window.clearTimeout(timerId))
      listSaveTimers.current.clear()
      listSaveQueue.current.clear()
      if (listSavedTimer.current) {
        window.clearTimeout(listSavedTimer.current)
      }
    }
  }, [])

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.label === selectedTemplate),
    [selectedTemplate, templates],
  )
  const activeList = useMemo(() => lists.find((list) => list.id === activeListId), [lists, activeListId])

  useEffect(() => {
    setListRenameDraft(activeList?.name || "")
  }, [activeList?.name])

  useEffect(() => {
    if (!activeTemplate) {
      setActiveTemplateDraft("")
      setIsEditingActiveTemplate(false)
      return
    }
    setActiveTemplateDraft(activeTemplate.value || "")
    setIsEditingActiveTemplate(false)
  }, [activeTemplate])

  const messageLength = message.trim().length
  const activeTemplateLength = isEditingActiveTemplate
    ? activeTemplateDraft.trim().length
    : (activeTemplate?.value?.trim().length ?? 0)
  const activeListRows = Array.isArray(activeList?.rows) ? activeList.rows : []
  const activeListColumnCount = useMemo(() => {
    if (!activeList) return 0
    const max = activeListRows.reduce((acc, row) => Math.max(acc, row.length), 0)
    return max || DEFAULT_LIST_COLS
  }, [activeList, activeListRows])
  const activeListColumns = useMemo(
    () => Array.from({ length: activeListColumnCount }, (_, index) => index),
    [activeListColumnCount],
  )
  const activeListColumnLabels = useMemo(
    () => activeListColumns.map((index) => toColumnLabel(index)),
    [activeListColumns],
  )
  const listFormulaCache = useMemo(() => new Map(), [activeListId, activeListRows])
  const canDeleteListRow = Boolean(activeList && activeListRows.length > 1)
  const canDeleteListColumn = Boolean(activeList && activeListColumnCount > 1)
  const toNumber = (value) => {
    if (isErrorValue(value)) return value
    if (Array.isArray(value)) return errorValue(FORMULA_ERRORS.VALUE)
    if (typeof value === "number") return value
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return 0
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  const isNumericValue = (value) => {
    if (typeof value === "number") return Number.isFinite(value)
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return false
      const parsed = Number(trimmed)
      return Number.isFinite(parsed)
    }
    return false
  }

  const isListCellObject = (value) =>
    Boolean(
      value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        ("value" in value || "format" in value),
    )

  const normalizeListCellFormat = (format) => {
    const next = { ...(format || {})}
    if (!next.bold) delete next.bold
    if (!next.italic) delete next.italic
    if (!next.underline) delete next.underline
    if (!next.align || next.align === "left") delete next.align
    if (!next.tone || next.tone === "none") delete next.tone
    if (!next.type || next.type === "auto") delete next.type
    if (next.type !== "currency") delete next.currency
    return next
  }

  const buildListCell = (value, format) => {
    const cleaned = normalizeListCellFormat(format)
    if (!cleaned || Object.keys(cleaned).length === 0) return value
    return { value, format: cleaned }
  }

  const getListCellData = (rowIndex, colIndex) => {
    const cell = activeListRows[rowIndex]?.[colIndex]
    if (isListCellObject(cell)) {
      return { value: cell.value ?? "", format: normalizeListCellFormat(cell.format)}
    }
    return { value: cell ?? "", format: {} }
  }

  const updateListCellValue = (cell, value) => {
    if (isListCellObject(cell)) {
      return buildListCell(value, cell.format)
    }
    return value
  }

  const getListCellRawValue = (rowIndex, colIndex) => {
    return getListCellData(rowIndex, colIndex).value ?? ""
  }

  const getListCellValue = (rowIndex, colIndex, stack) => {
    const key = `${rowIndex}:${colIndex}`
    if (listFormulaCache.has(key)) return listFormulaCache.get(key)
    if (stack.has(key)) return errorValue(FORMULA_ERRORS.CYCLE)

    stack.add(key)
    const raw = getListCellRawValue(rowIndex, colIndex)
    let result = raw
    if (typeof raw === "string" && raw.trim().startsWith("=")) {
      const expression = raw.trim().slice(1)
      if (!expression) {
        result = ""
      } else {
        const parsed = parseFormula(expression)
        if (parsed.error) {
          result = errorValue(FORMULA_ERRORS.VALUE)
        } else {
          result = evaluateFormulaNode(parsed.node, stack)
        }
      }
    }
    stack.delete(key)
    listFormulaCache.set(key, result)
    return result
  }

  const getListCellValueFromRef = (ref, stack) => {
    const parsed = parseCellRef(ref)
    if (!parsed) return errorValue(FORMULA_ERRORS.REF)
    return getListCellValue(parsed.row, parsed.col, stack)
  }

  const getListRangeValues = (range, stack) => {
    const start = parseCellRef(range.start)
    const end = parseCellRef(range.end)
    if (!start || !end) return errorValue(FORMULA_ERRORS.REF)
    const rowStart = Math.min(start.row, end.row)
    const rowEnd = Math.max(start.row, end.row)
    const colStart = Math.min(start.col, end.col)
    const colEnd = Math.max(start.col, end.col)
    const values = []
    for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
      for (let colIndex = colStart; colIndex <= colEnd; colIndex += 1) {
        const value = getListCellValue(rowIndex, colIndex, stack)
        if (isErrorValue(value)) return value
        values.push(value)
      }
    }
    return values
  }

  const evaluateFormulaNode = (node, stack) => {
    if (!node) return errorValue(FORMULA_ERRORS.VALUE)
    if (node.type === "number") return node.value
    if (node.type === "cell") return getListCellValueFromRef(node.value, stack)
    if (node.type === "range") return getListRangeValues(node, stack)
    if (node.type === "unary") {
      const value = evaluateFormulaNode(node.value, stack)
      if (isErrorValue(value)) return value
      const numberValue = toNumber(value)
      if (isErrorValue(numberValue)) return numberValue
      return -numberValue
    }
    if (node.type === "binary") {
      const left = evaluateFormulaNode(node.left, stack)
      if (isErrorValue(left)) return left
      if (Array.isArray(left)) return errorValue(FORMULA_ERRORS.VALUE)
      const right = evaluateFormulaNode(node.right, stack)
      if (isErrorValue(right)) return right
      if (Array.isArray(right)) return errorValue(FORMULA_ERRORS.VALUE)
      const leftNumber = toNumber(left)
      if (isErrorValue(leftNumber)) return leftNumber
      const rightNumber = toNumber(right)
      if (isErrorValue(rightNumber)) return rightNumber
      if (node.op === "+") return leftNumber + rightNumber
      if (node.op === "-") return leftNumber - rightNumber
      if (node.op === "*") return leftNumber * rightNumber
      if (node.op === "/") {
        if (rightNumber === 0) return errorValue(FORMULA_ERRORS.DIV0)
        return leftNumber / rightNumber
      }
      return errorValue(FORMULA_ERRORS.VALUE)
    }
    if (node.type === "function") {
      const name = String(node.name || "").toUpperCase()
      const values = []
      for (const arg of node.args || []) {
        const result = evaluateFormulaNode(arg, stack)
        if (isErrorValue(result)) return result
        if (Array.isArray(result)) {
          values.push(...result)
        } else {
          values.push(result)
        }
      }
      const numericValues = values
        .filter((value) => isNumericValue(value))
        .map((value) => toNumber(value))
        .filter((value) => !isErrorValue(value))
      if (name === "SUM") {
        return numericValues.reduce((acc, value) => acc + value, 0)
      }
      if (name === "AVERAGE") {
        if (numericValues.length === 0) return 0
        const total = numericValues.reduce((acc, value) => acc + value, 0)
        return total / numericValues.length
      }
      if (name === "MIN") {
        if (numericValues.length === 0) return 0
        return Math.min(...numericValues)
      }
      if (name === "MAX") {
        if (numericValues.length === 0) return 0
        return Math.max(...numericValues)
      }
      if (name === "COUNT") {
        return numericValues.length
      }
      return errorValue(FORMULA_ERRORS.VALUE)
    }
    return errorValue(FORMULA_ERRORS.VALUE)
  }

  const getListCellDisplayValue = (rowIndex, colIndex) => {
    const value = getListCellValue(rowIndex, colIndex, new Set())
    const format = getListCellData(rowIndex, colIndex).format
    return formatListCellValue(value, format)
  }

  const groupedTemplates = useMemo(() => {
    return templates.reduce((acc, tpl) => {
      const cat = tpl.category || "Genel"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(tpl)
      return acc
    }, {})
  }, [templates])

  const stockSummary = useMemo(() => {
    let total = 0
    let empty = 0
    products.forEach((product) => {
      total += product.stocks.length
      if (product.stocks.length === 0) empty += 1
    })
    return { total, empty }
  }, [products])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }))
  }, [products])

  const orderedProducts = useMemo(() => {
    if (productOrder.length === 0) return sortedProducts
    const map = new Map(sortedProducts.map((product) => [product.id, product]))
    const ordered = []
    productOrder.forEach((id) => {
      const item = map.get(id)
      if (item) {
        ordered.push(item)
        map.delete(id)
      }
    })
    if (map.size > 0) {
      ordered.push(...map.values())
    }
    return ordered
  }, [productOrder, sortedProducts])

  const filteredProducts = useMemo(() => {
    const text = productSearch.trim().toLowerCase()
    const list = text
      ? orderedProducts.filter(
        (prd) =>
          prd.name.toLowerCase().includes(text) ||
          prd.stocks.some((stk) => stk.code.toLowerCase().includes(text)),
      )
      : orderedProducts
    return list
  }, [productSearch, orderedProducts])

  const taskStats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((task) => task.status === "done").length
    const doing = tasks.filter((task) => task.status === "doing").length
    const todo = tasks.filter((task) => task.status === "todo").length
    return { total, done, doing, todo }
  }, [tasks])

  const taskGroups = useMemo(() => {
    const groups = { todo: [], doing: [], done: [] }
    tasks.forEach((task) => {
      const status = task?.status && task.status in groups ? task.status : "todo"
      groups[status].push(task)
    })
    return groups
  }, [tasks])

  const focusTask = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== "done")
    if (openTasks.length === 0) return null
    return openTasks[0]
  }, [tasks])


  useEffect(() => {
    if (products.length === 0) return
    setProductOrder((prev) => {
      if (prev.length === 0) {
        return sortedProducts.map((product) => product.id)
      }
      const currentIds = new Set(products.map((product) => product.id))
      const next = prev.filter((id) => currentIds.has(id))
      const missing = sortedProducts
        .map((product) => product.id)
        .filter((id) => !next.includes(id))
      if (missing.length === 0 && next.length === prev.length) return prev
      return [...next, ...missing]
    })
  }, [products, sortedProducts])

  useEffect(() => {
    if (productOrder.length === 0) return
    try {
      localStorage.setItem(PRODUCT_ORDER_STORAGE_KEY, JSON.stringify(productOrder))
    } catch (error) {
      console.warn("Could not save product order", error)
    }
  }, [productOrder])

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
    } catch (error) {
      console.warn("Could not save tasks", error)
    }
  }, [tasks])

  useEffect(() => {
    const tick = () => {
      const today = getLocalDateString(new Date())
      setTasks((prev) => {
        let changed = false
        const next = prev.map((task) => {
          if (
            task.dueType === "repeat" &&
            task.status === "done" &&
            task.repeatWakeAt &&
            task.repeatWakeAt <= today
          ) {
            changed = true
            return { ...task, status: "todo", repeatWakeAt: "" }
          }
          return task
        })
        return changed ? next : prev
      })
    }
    tick()
    const intervalId = window.setInterval(tick, 60 * 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!isNoteModalOpen && !taskDetailTarget) return
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setIsNoteModalOpen(false)
        setTaskDetailTarget(null)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isNoteModalOpen, taskDetailTarget])

  const toggleProductOpen = (productId) => {
    setOpenProducts((prev) => ({ ...prev, [productId]: !(prev[productId] ?? false)}))
  }

  const createTaskId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
    return `tsk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  }

  const getLocalDateString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const addDays = (date, days) => {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
  }

  const formatTaskDate = (value) => {
    if (!value) return ""
    const dateValue = new Date(`${value}T00:00:00`)
    if (!Number.isNaN(dateValue.getTime())) {
      return LIST_DATE_FORMATTER.format(dateValue)
    }
    return value
  }

  const getTaskDueLabel = (task) => {
    if (task.dueType === "today") return "Bugun"
    if (task.dueType === "repeat") {
      const day = taskRepeatDays.find((item) => item.value === String(task.repeatDay))
      return day ? `Her ${day.label}` : "Tekrarlanabilir"
    }
    if (task.dueType === "date") {
      return task.dueDate ? formatTaskDate(task.dueDate) : "Tarih secilmedi"
    }
    return ""
  }

  const isTaskDueToday = (task) => {
    const today = getLocalDateString(new Date())
    if (task.dueType === "today") return true
    if (task.dueType === "date") return task.dueDate === today
    if (task.dueType === "repeat") return String(new Date().getDay()) === String(task.repeatDay)
    return false
  }

  const openNoteModal = () => {
    setNoteModalDraft(taskForm.note)
    setIsNoteModalOpen(true)
  }

  const handleNoteModalSave = () => {
    setTaskForm((prev) => ({ ...prev, note: noteModalDraft }))
    setIsNoteModalOpen(false)
  }

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false)
  }

  const openTaskDetail = (task) => {
    setTaskDetailTarget(task)
  }

  const closeTaskDetail = () => {
    setTaskDetailTarget(null)
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      note: "",
      owner: "",
      dueType: "today",
      repeatDay: "1",
      dueDate: "",
    })
  }

  const handleTaskAdd = () => {
    const titleValue = taskForm.title.trim()
    if (!titleValue) {
      toast.error("Gorev adi gerekli.")
      return
    }
    if (taskForm.dueType === "date" && !taskForm.dueDate) {
      toast.error("Ozel tarih secin.")
      return
    }
    const newTask = {
      id: createTaskId(),
      title: titleValue,
      note: taskForm.note.trim(),
      owner: taskForm.owner.trim(),
      dueType: taskForm.dueType,
      repeatDay: taskForm.dueType === "repeat" ? taskForm.repeatDay : "",
      dueDate: taskForm.dueType === "date" ? taskForm.dueDate : "",
      status: "todo",
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [newTask, ...prev])
    resetTaskForm()
    toast.success("Gorev eklendi")
  }

  const handleTaskAdvance = (taskId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        if (task.status === "todo") return { ...task, status: "doing" }
        if (task.status === "doing") {
          if (task.dueType === "repeat") {
            const tomorrow = getLocalDateString(addDays(new Date(), 1))
            return { ...task, status: "done", repeatWakeAt: tomorrow }
          }
          return { ...task, status: "done", repeatWakeAt: "" }
        }
        return { ...task, status: "done", repeatWakeAt: "" }
      }),
    )
  }

  const handleTaskReopen = (taskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: "todo", repeatWakeAt: "" } : task,
      ),
    )
  }

  const handleTaskDeleteWithConfirm = (taskId) => {
    if (confirmTaskDelete === taskId) {
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
      setConfirmTaskDelete(null)
      toast.success("Gorev silindi")
      return
    }
    setConfirmTaskDelete(taskId)
    toast("Silmek icin tekrar tikla", { position: "top-right" })
  }

  const handleTaskDragStart = (event, taskId) => {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", taskId)
    setTaskDragState({ activeId: taskId, overStatus: null })
  }

  const handleTaskDragOver = (event, status) => {
    event.preventDefault()
    if (taskDragState.overStatus === status) return
    setTaskDragState((prev) => ({ ...prev, overStatus: status }))
  }

  const handleTaskDrop = (event, status) => {
    event.preventDefault()
    const taskId = taskDragState.activeId || event.dataTransfer.getData("text/plain")
    if (!taskId) {
      setTaskDragState({ activeId: null, overStatus: null })
      return
    }
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status } : task)),
    )
    setTaskDragState({ activeId: null, overStatus: null })
  }

  const handleTaskDragEnd = () => {
    setTaskDragState({ activeId: null, overStatus: null })
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    if (isAuthChecking || isAuthLoading) return
    const password = authPassword.trim()
    if (!password) {
      setAuthError("Sifre gerekli")
      return
    }

    setAuthError("")
    setIsAuthLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        setAuthError("Sifre hatali")
        return
      }

      const data = await res.json()
      if (data?.enabled === false) {
        setIsAuthed(true)
        setAuthPassword("")
        return
      }

      const token = String(data?.token ?? "").trim()
      if (!token) {
        setAuthError("Oturum acilamadi")
        return
      }

      try {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
      } catch (error) {
        console.warn("Could not persist auth token", error)
      }
      setAuthToken(token)
      setIsAuthed(true)
      setAuthPassword("")
    } catch (error) {
      console.error("Login failed", error)
      setAuthError("Baglanti hatasi")
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthed(false)
    setAuthToken("")
    setAuthPassword("")
    setAuthError("")
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    } catch (error) {
      console.warn("Could not clear auth token", error)
    }
  }

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  const handleDragStart = (event, productId) => {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", productId)
    setDragState({ activeId: productId, overId: null })
  }

  const handleDragOver = (event, productId) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDragState((prev) =>
      prev.overId === productId ? prev : { ...prev, overId: productId },
    )
  }

  const handleDrop = (event, productId) => {
    event.preventDefault()
    const dragId = dragState.activeId || event.dataTransfer.getData("text/plain")
    if (!dragId || dragId === productId) {
      setDragState({ activeId: null, overId: null })
      return
    }
    setProductOrder((prev) => {
      const base = prev.length ? [...prev] : sortedProducts.map((product) => product.id)
      const fromIndex = base.indexOf(dragId)
      const toIndex = base.indexOf(productId)
      if (fromIndex === -1 || toIndex === -1) return prev
      base.splice(fromIndex, 1)
      base.splice(toIndex, 0, dragId)
      return base
    })
    setDragState({ activeId: null, overId: null })
  }

  const handleDragEnd = () => {
    setDragState({ activeId: null, overId: null })
  }
  useEffect(() => {
    setOpenCategories((prev) => {
      if (categories.length === 0) return {}
      const next = { ...prev }
      categories.forEach((cat, idx) => {
        if (!(cat in next)) next[cat] = idx === 0
      })
      Object.keys(next).forEach((cat) => {
        if (!categories.includes(cat)) delete next[cat]
      })
      return next
    })
  }, [categories])

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await apiFetch("/api/problems", { signal: controller.signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setProblems(data ?? [])
      } catch (error) {
        if (error?.name === "AbortError") return
        setProblems(initialProblems)
        toast.error("Problem listesi alınamadı (API/DB kontrol edin)")
      }
    })()

    return () => controller.abort()
  }, [apiFetch, isAuthed])

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await apiFetch("/api/products", { signal: controller.signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setProducts(data ?? [])
      } catch (error) {
        if (error?.name === "AbortError") return
        setProducts(initialProducts)
        toast.error("Stok listesi alınamadı (API/DB kontrol edin)")
      }
    })()

    return () => controller.abort()
  }, [apiFetch, isAuthed])

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayDone(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    const startedAt = Date.now()
    let timeoutId = null

    setIsLoading(true)

    ;(async () => {
      try {
        const [catsRes, templatesRes] = await Promise.all([
          apiFetch("/api/categories", { signal: controller.signal }),
          apiFetch("/api/templates", { signal: controller.signal }),
        ])

        if (!catsRes.ok || !templatesRes.ok) throw new Error("api_error")

        const serverCategories = await catsRes.json()
        const serverTemplates = await templatesRes.json()

        const safeCategories = Array.from(new Set(["Genel", ...(serverCategories ?? [])]))
        setCategories(safeCategories)
        setTemplates(serverTemplates ?? [])

        const firstTemplate = serverTemplates?.[0]
        setSelectedTemplate(firstTemplate?.label ?? null)
        if (firstTemplate?.category) setSelectedCategory(firstTemplate.category)
      } catch (error) {
        if (error?.name === "AbortError") return
        setCategories(fallbackCategories)
        setTemplates(fallbackTemplates)
        setSelectedTemplate(fallbackTemplates[0]?.label ?? null)
        setSelectedCategory(fallbackTemplates[0]?.category ?? "Genel")
        toast.error("Sunucuya bağlanılamadı. (API/DB kontrol edin)")
      } finally {
        const elapsed = Date.now() - startedAt
        const delay = Math.max(0, 600 - elapsed)
        timeoutId = window.setTimeout(() => setIsLoading(false), delay)
      }
    })()

    return () => {
      controller.abort()
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [apiFetch, isAuthed])

  useEffect(() => {
    setOpenProducts((prev) => {
      if (products.length === 0) return {}
      const next = {}
      products.forEach((product) => {
        next[product.id] = prev[product.id] ?? false
      })
      return next
    })

    setStockForm((prev) => {
      if (products.length === 0) return { ...prev, productId: "" }
      const exists = products.some((product) => product.id === prev.productId)
      return exists ? prev : { ...prev, productId: products[0].id }
    })
  }, [products])

  useEffect(() => {
    if (activeTab !== "stock") return
    setOpenProducts((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        next[key] = false
      })
      return next
    })
  }, [activeTab])

  const handleTemplateChange = async (nextTemplate, options = {}) => {
    setSelectedTemplate(nextTemplate)
    const tpl = templates.find((item) => item.label === nextTemplate)
    if (tpl && options.shouldCopy) {
      try {
        await navigator.clipboard.writeText(tpl.value)
        toast.success("Şablon kopyalandı", { duration: 1600, position: "top-right" })
        toast(
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
              Kopyalanan mesaj
            </p>
            <p className="text-sm text-slate-50/90 whitespace-pre-wrap">{tpl.value}</p>
          </div>,
          { duration: 3200, position: "top-right" },
        )
      } catch (error) {
        console.error("Copy failed", error)
        toast.error("Kopyalanamadı", { duration: 1600, position: "top-right" })
      }
    }
  }

  const handleActiveTemplateEditStart = () => {
    if (!activeTemplate || showLoading) return
    setActiveTemplateDraft(activeTemplate.value || "")
    setIsEditingActiveTemplate(true)
  }

  const handleActiveTemplateEditCancel = () => {
    setIsEditingActiveTemplate(false)
    setActiveTemplateDraft(activeTemplate?.value || "")
  }

  const handleActiveTemplateEditSave = async () => {
    if (!activeTemplate || showLoading) return
    const nextValue = activeTemplateDraft.trim()
    if (!nextValue) {
      toast.error("Mesaj boş olamaz.")
      return
    }
    if ((activeTemplate.value || "").trim() === nextValue) {
      setIsEditingActiveTemplate(false)
      return
    }

    setIsTemplateSaving(true)
    try {
      if (activeTemplate.id) {
        const res = await apiFetch(`/api/templates/${activeTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: nextValue }),
        })
        if (!res.ok) throw new Error("template_update_failed")
        const updated = await res.json()
        setTemplates((prev) => prev.map((tpl) => (tpl.id === updated.id ? updated : tpl)))
      } else {
        setTemplates((prev) =>
          prev.map((tpl) => (tpl.label === activeTemplate.label ? { ...tpl, value: nextValue } : tpl)),
        )
      }
      setActiveTemplateDraft(nextValue)
      setIsEditingActiveTemplate(false)
      toast.success("Şablon güncellendi")
    } catch (error) {
      console.error(error)
      toast.error("Şablon güncellenemedi (API/DB kontrol edin).")
    } finally {
      setIsTemplateSaving(false)
    }
  }

  const handleAdd = async () => {
    const safeTitleInput = title.trim()
    const safeMessage = message.trim()
    const safeCategoryInput = selectedCategory.trim()

    if (!safeMessage) {
      toast.error("Mesaj ekleyin.")
      return
    }

    const safeTitle = safeTitleInput || `Mesaj ${templates.length + 1}`
    const safeCategory = safeCategoryInput || "Genel"

    try {
      const res = await apiFetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: safeTitle, value: safeMessage, category: safeCategory }),
      })

      if (res.status === 409) {
        toast("Var olan şablon aktif edildi", { position: "top-right" })
        setSelectedTemplate(safeTitle)
        setSelectedCategory(safeCategory)
        return
      }

      if (!res.ok) throw new Error("create_failed")

      const created = await res.json()
      setTemplates((prev) => [...prev, created])
      if (!categories.includes(safeCategory)) {
        setCategories((prev) => [...prev, safeCategory])
      }
      setSelectedTemplate(created.label)
      setSelectedCategory(created.category || safeCategory)
      toast.success("Yeni şablon eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Kaydedilemedi (API/DB kontrol edin).")
    }
  }

  const handleDeleteTemplate = async (targetLabel = selectedTemplate) => {
    if (templates.length <= 1) {
      toast.error("En az bir şablon kalmalı.")
      return
    }
    const target = templates.find((tpl) => tpl.label === targetLabel)
    const targetId = target?.id
    if (!targetId) {
      toast.error("Silinecek şablon bulunamadı.")
      return
    }

    try {
      const res = await apiFetch(`/api/templates/${targetId}`, { method: "DELETE" })
      if (!res.ok && res.status !== 404) throw new Error("delete_failed")

      const nextTemplates = templates.filter((tpl) => tpl.label !== targetLabel)
      const fallback = nextTemplates[0]
      setTemplates(nextTemplates)
      const nextSelected = selectedTemplate === targetLabel ? fallback?.label ?? selectedTemplate : selectedTemplate
      if (nextSelected) {
        setSelectedTemplate(nextSelected)
        const nextTpl = nextTemplates.find((tpl) => tpl.label === nextSelected)
        if (nextTpl) {
          setSelectedCategory(nextTpl.category || "Genel")
        }
      }
      toast.success("Şablon silindi")
    } catch (error) {
      console.error(error)
      toast.error("Silinemedi (API/DB kontrol edin).")
    }
  }

  const handleDeleteWithConfirm = (targetLabel) => {
    if (confirmTarget === targetLabel) {
      handleDeleteTemplate(targetLabel)
      setConfirmTarget(null)
      return
    }
    setConfirmTarget(targetLabel)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  const handleCategoryAdd = async () => {
    const next = newCategory.trim()
    if (!next) {
      toast.error("Kategori girin.")
      return
    }
    if (categories.includes(next)) {
      toast("Kategori zaten mevcut", { position: "top-right" })
      setSelectedCategory(next)
      setNewCategory("")
      return
    }
    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      })
      if (!res.ok) throw new Error("category_create_failed")

      const nextCategories = [...categories, next]
      setCategories(nextCategories)
      setSelectedCategory(next)
      setNewCategory("")
      toast.success("Kategori eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Kategori eklenemedi (API/DB kontrol edin).")
    }
  }

  const handleCategoryDelete = async (cat) => {
    if (cat === "Genel") {
      toast.error("Genel kategorisi silinemez.")
      return
    }
    try {
      const res = await apiFetch(`/api/categories/${encodeURIComponent(cat)}`, { method: "DELETE" })
      if (!res.ok && res.status !== 404) throw new Error("category_delete_failed")

      const nextCategories = categories.filter((item) => item !== cat)
      const safeCategories = nextCategories.length ? nextCategories : ["Genel"]
      setCategories(safeCategories)
      setTemplates((prev) => prev.map((tpl) => (tpl.category === cat ? { ...tpl, category: "Genel" } : tpl)))
      if (selectedCategory === cat) {
        setSelectedCategory(safeCategories[0])
      }
      toast.success("Kategori silindi")
    } catch (error) {
      console.error(error)
      toast.error("Kategori silinemedi (API/DB kontrol edin).")
    }
  }

  const handleCategoryDeleteWithConfirm = (cat) => {
    if (confirmCategoryTarget === cat) {
      setConfirmCategoryTarget(null)
      handleCategoryDelete(cat)
      return
    }
    setConfirmCategoryTarget(cat)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  const queueListSave = useCallback(
    (list) => {
      if (!isAuthed || !list?.id) return
      listSaveQueue.current.set(list.id, { name: list.name, rows: list.rows })
      const timers = listSaveTimers.current
      const existing = timers.get(list.id)
      if (existing) {
        window.clearTimeout(existing)
      }
      const timeoutId = window.setTimeout(async () => {
        timers.delete(list.id)
        const payload = listSaveQueue.current.get(list.id)
        listSaveQueue.current.delete(list.id)
        if (!payload) return
        try {
          const res = await apiFetch(`/api/lists/${list.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error("list_save_failed")
          listSaveErrorRef.current = false
          setListSavedAt(Date.now())
          if (listSavedTimer.current) {
            window.clearTimeout(listSavedTimer.current)
          }
          listSavedTimer.current = window.setTimeout(() => {
            setListSavedAt(null)
          }, 2200)
        } catch (error) {
          if (!listSaveErrorRef.current) {
            listSaveErrorRef.current = true
            toast.error("Liste kaydedilemedi (API/DB kontrol edin).")
          }
        }
      }, 600)
      timers.set(list.id, timeoutId)
    },
    [apiFetch, isAuthed],
  )

  const updateListById = (listId, updater) => {
    if (!listId) return
    let nextList = null
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list
        const updated = updater(list)
        nextList = updated
        return updated
      }),
    )
    if (nextList) queueListSave(nextList)
  }

  const handleListSaveNow = async () => {
    if (!activeList || !isAuthed || isListSaving) return
    const list = {
      id: activeList.id,
      name: activeList.name,
      rows: Array.isArray(activeList.rows) ? activeList.rows : [],
    }
    const timers = listSaveTimers.current
    const existing = timers.get(list.id)
    if (existing) {
      window.clearTimeout(existing)
      timers.delete(list.id)
    }
    listSaveQueue.current.delete(list.id)

    setIsListSaving(true)
    try {
      const res = await apiFetch(`/api/lists/${list.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: list.name, rows: list.rows }),
      })
      if (!res.ok) throw new Error("list_save_failed")
      listSaveErrorRef.current = false
      setListSavedAt(Date.now())
      if (listSavedTimer.current) {
        window.clearTimeout(listSavedTimer.current)
      }
      listSavedTimer.current = window.setTimeout(() => {
        setListSavedAt(null)
      }, 2200)
    } catch (error) {
      console.error(error)
      if (!listSaveErrorRef.current) {
        listSaveErrorRef.current = true
        toast.error("Liste kaydedilemedi (API/DB kontrol edin).")
      }
    } finally {
      setIsListSaving(false)
    }
  }

  const handleListCreate = async () => {
    const name = listName.trim()
    if (!name) {
      toast.error("Liste adı girin.")
      return
    }
    const rows = createEmptySheet(DEFAULT_LIST_ROWS, DEFAULT_LIST_COLS)
    try {
      const res = await apiFetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rows }),
      })
      if (!res.ok) throw new Error("list_create_failed")
      const created = await res.json()
      setLists((prev) => [created, ...prev])
      setActiveListId(created.id)
      setListName("")
      toast.success("Liste oluşturuldu")
    } catch (error) {
      console.error(error)
      toast.error("Liste oluşturulamadı (API/DB kontrol edin).")
    }
  }

  const handleListRename = () => {
    if (!activeList) return
    const name = listRenameDraft.trim()
    if (!name) {
      toast.error("Liste adı boş olamaz.")
      return
    }
    if (name === activeList.name) return
    updateListById(activeList.id, (list) => ({ ...list, name }))
    toast.success("Liste adı güncellendi")
  }

  const handleListDelete = async (listId) => {
    if (!listId) return
    try {
      const res = await apiFetch(`/api/lists/${listId}`, { method: "DELETE" })
      if (!res.ok && res.status !== 404) throw new Error("list_delete_failed")
      setLists((prev) => prev.filter((list) => list.id !== listId))
      if (activeListId === listId) setActiveListId("")
      setConfirmListDelete(null)
      toast.success("Liste silindi")
    } catch (error) {
      console.error(error)
      toast.error("Liste silinemedi (API/DB kontrol edin).")
      setConfirmListDelete(null)
    }
  }

  const handleListSelect = (id) => {
    setActiveListId(id)
  }

  const handleListCellChange = (rowIndex, colIndex, value) => {
    if (!activeList) return
    updateListById(activeList.id, (list) => {
      const rows = list.rows.map((row, rIndex) => {
        if (rIndex !== rowIndex) return row
        const nextRow = [...row]
        while (nextRow.length <= colIndex) nextRow.push("")
        nextRow[colIndex] = updateListCellValue(nextRow[colIndex], value)
        return nextRow
      })
      return { ...list, rows }
    })
  }

  const getListColumnCount = (rows) =>
    rows.reduce((acc, row) => Math.max(acc, row.length), 0) || DEFAULT_LIST_COLS

  const parseClipboardGrid = (text) => {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const lines = normalized.split("\n")
    if (lines.length > 1 && lines[lines.length - 1] === "") {
      lines.pop()
    }
    return lines.map((line) => line.split("\t"))
  }

  const handleListPaste = (event, rowIndex, colIndex) => {
    if (!activeList) return
    const text = event.clipboardData?.getData("text")
    if (!text) return
    const grid = parseClipboardGrid(text)
    if (grid.length === 1 && grid[0].length === 1) return
    event.preventDefault()
    updateListById(activeList.id, (list) => {
      const baseRows = Array.isArray(list.rows) ? list.rows : []
      const rows = baseRows.map((row) => [...row])
      const requiredRows = rowIndex + grid.length
      while (rows.length < requiredRows) {
        rows.push([])
      }
      grid.forEach((gridRow, rowOffset) => {
        const targetRowIndex = rowIndex + rowOffset
        const row = rows[targetRowIndex] ?? []
        const nextRow = [...row]
        const requiredCols = colIndex + gridRow.length
        while (nextRow.length < requiredCols) {
          nextRow.push("")
        }
        gridRow.forEach((cellValue, colOffset) => {
          const targetColIndex = colIndex + colOffset
          nextRow[targetColIndex] = updateListCellValue(nextRow[targetColIndex], cellValue)
        })
        rows[targetRowIndex] = nextRow
      })
      return { ...list, rows }
    })
  }

  const buildListSelectionRange = (start, end) => {
    const min = Math.min(start, end)
    const max = Math.max(start, end)
    const next = new Set()
    for (let index = min; index <= max; index += 1) {
      next.add(index)
    }
    return next
  }

  const handleListRowSelect = (event, rowIndex) => {
    setSelectedListCell((prev) => ({ ...prev, row: rowIndex }))
    setSelectedListRows((prev) => {
      if (event.shiftKey && lastListRowSelect !== null) {
        return buildListSelectionRange(lastListRowSelect, rowIndex)
      }
      if (event.metaKey || event.ctrlKey) {
        const next = new Set(prev)
        if (next.has(rowIndex)) {
          next.delete(rowIndex)
        } else {
          next.add(rowIndex)
        }
        return next
      }
      return new Set([rowIndex])
    })
    setLastListRowSelect(rowIndex)
  }

  const handleListColumnSelect = (event, colIndex) => {
    setSelectedListCell((prev) => ({ ...prev, col: colIndex }))
    setSelectedListCols((prev) => {
      if (event.shiftKey && lastListColSelect !== null) {
        return buildListSelectionRange(lastListColSelect, colIndex)
      }
      if (event.metaKey || event.ctrlKey) {
        const next = new Set(prev)
        if (next.has(colIndex)) {
          next.delete(colIndex)
        } else {
          next.add(colIndex)
        }
        return next
      }
      return new Set([colIndex])
    })
    setLastListColSelect(colIndex)
  }

  const handleListDeleteSelectedRows = () => {
    if (!activeList) return
    const selected = Array.from(selectedListRows).filter(
      (index) => index >= 0 && index < activeListRows.length,
    )
    if (selected.length === 0) return
    if (selected.length >= activeListRows.length) {
      toast.error("En az bir satir kalmali.")
      return
    }
    const selectedSet = new Set(selected)
    updateListById(activeList.id, (list) => {
      const rows = list.rows.filter((_, index) => !selectedSet.has(index))
      return { ...list, rows }
    })
    setSelectedListRows(new Set())
    setEditingListCell({ row: null, col: null })
    setSelectedListCell({ row: null, col: null })
    setLastListRowSelect(null)
  }

  const handleListDeleteSelectedColumns = () => {
    if (!activeList) return
    const colCount = getListColumnCount(activeList.rows)
    const selected = Array.from(selectedListCols).filter((index) => index >= 0 && index < colCount)
    if (selected.length === 0) return
    if (selected.length >= colCount) {
      toast.error("En az bir sutun kalmali.")
      return
    }
    const selectedSet = new Set(selected)
    updateListById(activeList.id, (list) => {
      const rows = list.rows.map((row) => {
        if (row.length === 0) return row
        const nextRow = row.filter((_, index) => !selectedSet.has(index))
        return nextRow.length ? nextRow : [""]
      })
      return { ...list, rows }
    })
    setSelectedListCols(new Set())
    setEditingListCell({ row: null, col: null })
    setSelectedListCell({ row: null, col: null })
    setLastListColSelect(null)
  }

  const handleListInsertRow = (afterIndex = null) => {
    if (!activeList) return
    updateListById(activeList.id, (list) => {
      const colCount = getListColumnCount(list.rows)
      const nextRow = Array.from({ length: colCount }, () => "")
      const rows = [...list.rows]
      const insertIndex = Number.isFinite(afterIndex)
        ? Math.min(Math.max(afterIndex + 1, 0), rows.length)
        : rows.length
      rows.splice(insertIndex, 0, nextRow)
      return { ...list, rows }
    })
  }

  const handleListInsertColumn = (afterIndex = null) => {
    if (!activeList) return
    updateListById(activeList.id, (list) => {
      const colCount = getListColumnCount(list.rows)
      const insertIndex = Number.isFinite(afterIndex)
        ? Math.min(Math.max(afterIndex + 1, 0), colCount)
        : colCount
      if (list.rows.length === 0) {
        const row = Array.from({ length: colCount + 1 }, () => "")
        return { ...list, rows: [row] }
      }
      const rows = list.rows.map((row) => {
        const nextRow = [...row]
        while (nextRow.length < colCount) nextRow.push("")
        nextRow.splice(insertIndex, 0, "")
        return nextRow
      })
      return { ...list, rows }
    })
  }

  const handleListDeleteRow = (rowIndex = null) => {
    if (!activeList || activeList.rows.length === 0) return
    const fallbackIndex = activeList.rows.length - 1
    const targetRow = Number.isFinite(rowIndex)
      ? rowIndex
      : selectedListCell.row ?? fallbackIndex
    if (activeList.rows.length <= 1 || targetRow < 0) return
    updateListById(activeList.id, (list) => {
      const rows = list.rows.filter((_, index) => index !== targetRow)
      return { ...list, rows }
    })
    setEditingListCell({ row: null, col: null })
    setSelectedListCell({ row: null, col: null })
    setSelectedListRows(new Set())
    setLastListRowSelect(null)
  }

  const handleListDeleteColumn = (colIndex = null) => {
    if (!activeList) return
    const colCount = getListColumnCount(activeList.rows)
    const fallbackIndex = colCount - 1
    const targetCol = Number.isFinite(colIndex) ? colIndex : selectedListCell.col ?? fallbackIndex
    if (colCount <= 1 || targetCol < 0) return
    updateListById(activeList.id, (list) => {
      const rows = list.rows.map((row) => {
        if (row.length === 0) return row
        const nextRow = row.filter((_, index) => index !== targetCol)
        return nextRow.length ? nextRow : [""]
      })
      return { ...list, rows }
    })
    setEditingListCell({ row: null, col: null })
    setSelectedListCell({ row: null, col: null })
    setSelectedListCols(new Set())
    setLastListColSelect(null)
  }

  const handleListContextMenu = (event, type, index) => {
    event.preventDefault()
    event.stopPropagation()
    setListContextMenu({
      open: true,
      type,
      index,
      x: event.clientX,
      y: event.clientY,
    })
    if (type === "row") {
      setSelectedListCell((prev) => ({ ...prev, row: index }))
      setSelectedListRows((prev) =>
        prev.has(index) && prev.size > 1 ? prev : new Set([index]),
      )
      setLastListRowSelect(index)
    }
    if (type === "column") {
      setSelectedListCell((prev) => ({ ...prev, col: index }))
      setSelectedListCols((prev) =>
        prev.has(index) && prev.size > 1 ? prev : new Set([index]),
      )
      setLastListColSelect(index)
    }
  }

  const handleListContextMenuClose = () => {
    setListContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev))
  }

  const showLoading = isLoading || !delayDone

  const toastStyle = isLight
    ? { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }
    : { background: "#0f1625", color: "#e5ecff", border: "1px solid #1d2534" }

  const toastIconTheme = isLight
    ? { primary: "#2563eb", secondary: "#ffffff" }
    : { primary: "#3ac7ff", secondary: "#0f1625" }
  const templateCountText = showLoading ? <LoadingIndicator label="Yükleniyor" /> : templates.length
  const categoryCountText = showLoading ? <LoadingIndicator label="Yükleniyor" /> : categories.length
  const selectedCategoryText = showLoading ? <LoadingIndicator label="Yükleniyor" /> : selectedCategory.trim() || "Genel"
  const listCountText = isListsLoading ? <LoadingIndicator label="Yükleniyor" /> : lists.length

  const isAuthBusy = isAuthChecking || isAuthLoading

  const themeToggleButton = (
    <button
      type="button"
      onClick={handleThemeToggle}
      className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      aria-label="Tema degistir"
    >
      <span className="sr-only">Tema degistir</span>
      {isLight ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.3 4.3l1.8 1.8M17.9 17.9l1.8 1.8M2.5 12h2.5M19 12h2.5M4.3 19.7l1.8-1.8M17.9 6.1l1.8-1.8" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14.5a7.5 7.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 19 14.5Z" />
        </svg>
      )}
    </button>
  )

  const logoutButton = (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-300/60 hover:bg-rose-500/15 hover:text-rose-50"
    >
      Cikis
    </button>
  )

  const categoryColors = useMemo(() => {
    const map = {}
    categories.forEach((cat, idx) => {
      map[cat] = categoryPalette[idx % categoryPalette.length]
    })
    return map
  }, [categories])

  const getCategoryClass = (cat) => categoryColors[cat] || "border-white/10 bg-white/5 text-slate-200"
  const resetStockForm = () => setStockForm((prev) => ({ productId: prev.productId, code: "" }))

  const handleProductAdd = async () => {
    const name = productForm.name.trim()
    const deliveryTemplate = productForm.deliveryTemplate.trim()
    if (!name) {
      toast.error("Ürün ismi boş olamaz.")
      return
    }
    const deliveryMessage =
      templates.find((tpl) => tpl.label === deliveryTemplate)?.value || ""

    try {
      const res = await apiFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          deliveryTemplate: deliveryTemplate || null,
          deliveryMessage: deliveryMessage || null,
          note: deliveryTemplate || null,
        }),
      })
      if (!res.ok) throw new Error("product_create_failed")
      const created = await res.json()
      setProducts((prev) => [created, ...prev])
      setProductForm({ name: "", deliveryTemplate: "" })
      setStockForm((prev) => ({ ...prev, productId: created.id }))
      toast.success("Ürün eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Ürün eklenemedi (API/DB kontrol edin).")
    }
  }

  const handleStockAdd = async () => {
    const productId = stockForm.productId
    const normalizedCode = stockForm.code.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const codes = normalizedCode.split("\n").map((line) => line.trim()).filter(Boolean)
    if (!productId) {
      toast.error("Ürün seçin.")
      return
    }
    if (codes.length === 0) {
      toast.error("Anahtar kodu boş olamaz.")
      return
    }

    try {
      const res = await apiFetch(`/api/products/${productId}/stocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      })
      if (!res.ok) throw new Error("stock_create_failed")
      const updatedStocks = await res.json()
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId ? { ...product, stocks: updatedStocks } : product,
        ),
      )
      resetStockForm()
      toast.success(codes.length + " stok eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Stok eklenemedi (API/DB kontrol edin).")
    }
  }
  const handleBulkCopyAndDelete = async (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const rawCount = bulkCount[productId]
    const count = Math.max(
      1,
      Number(rawCount ?? product.stocks.length) || product.stocks.length,
    )
    const codes = product.stocks.slice(0, count).map((stk) => stk.code)
    const removed = product.stocks.slice(0, count)
    if (codes.length === 0) {
      toast.error("Bu üründe kopyalanacak stok yok.")
      return
    }

    const joined = codes.join("\n")
    const removedIds = new Set(removed.map((stk) => stk.id))

    try {
      await navigator.clipboard.writeText(joined)
      const res = await apiFetch("/api/stocks/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: removed.map((stk) => stk.id)}),
      })
      if (!res.ok) throw new Error("stock_bulk_delete_failed")

      setLastDeleted({ productId, stocks: removed })
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, stocks: p.stocks.filter((stk) => !removedIds.has(stk.id))}
            : p,
        ),
      )
      toast.success(`${codes.length} stok kopyalandı ve silindi`, { duration: 1800, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Stoklar silinemedi (API/DB kontrol edin).")
    }
  }
  const handleProductDeleteWithConfirm = async (productId) => {
    if (confirmProductTarget === productId) {
      try {
        const res = await apiFetch(`/api/products/${productId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 404) throw new Error("product_delete_failed")

        setProducts((prev) => {
          const next = prev.filter((p) => p.id !== productId)
          const nextFirst = next[0]?.id || ""
          setStockForm((prevForm) => ({
            ...prevForm,
            productId: prevForm.productId === productId ? nextFirst : prevForm.productId,
          }))
          setOpenProducts((prevOpen) => {
            const copy = { ...prevOpen }
            delete copy[productId]
            if (nextFirst && !(nextFirst in copy)) copy[nextFirst] = true
            return copy
          })
          return next
        })
        setConfirmProductTarget(null)
        toast.success("Ürün ve stokları silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Silinemedi (API/DB kontrol edin).")
        setConfirmProductTarget(null)
        return
      }
    }
    setConfirmProductTarget(productId)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }
  const handleEditStart = (product) => {
    const matchedTemplate =
      product.deliveryTemplate?.trim() ||
      templates.find((tpl) => tpl.value === product.deliveryMessage)?.label ||
      ""
    setEditingProduct((prev) => ({
      ...prev,
      [product.id]: { name: product.name, note: product.note, deliveryTemplate: matchedTemplate },
    }))
  }

  const handleEditChange = (productId, field, value) => {
    setEditingProduct((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value },
    }))
  }

  const handleEditCancel = (productId) => {
    setEditingProduct((prev) => {
      const copy = { ...prev }
      delete copy[productId]
      return copy
    })
  }

  const handleEditSave = async (productId) => {
    const draft = editingProduct[productId]
    const name = draft?.name?.trim()
    const selectedTemplate = draft?.deliveryTemplate?.trim()
    if (!name) {
      toast.error("İsim boş olamaz.")
      return
    }
    const templateValue = selectedTemplate
      ? templates.find((tpl) => tpl.label === selectedTemplate)?.value
      : ""
    if (selectedTemplate && !templateValue) {
      toast.error("Geçerli teslimat mesajı bulunamadı.")
      return
    }

    try {
      const res = await apiFetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          note: selectedTemplate || null,
          deliveryTemplate: selectedTemplate || null,
          deliveryMessage: templateValue || null,
        }),
      })
      if (!res.ok) throw new Error("product_update_failed")
      const updated = await res.json()
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)))
      handleEditCancel(productId)
      toast.success("Ürün güncellendi")
    } catch (error) {
      console.error(error)
      toast.error("Ürün güncellenemedi (API/DB kontrol edin).")
    }
  }
  const handleUndoDelete = async () => {
    if (!lastDeleted) {
      toast.error("Geri alınacak kayıt yok.")
      return
    }
    const { productId, stocks } = lastDeleted
    const codes = stocks.map((stk) => stk.code).filter(Boolean)
    if (codes.length === 0) {
      toast.error("Geri alınacak stok bulunamadı.")
      return
    }

    try {
      const res = await apiFetch(`/api/products/${productId}/stocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      })
      if (!res.ok) throw new Error("stock_restore_failed")
      const updatedStocks = await res.json()
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stocks: updatedStocks } : p)),
      )
      setLastDeleted(null)
      toast.success("Silinen kayıt geri alındı", { duration: 1400, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Geri alınamadı (API/DB kontrol edin).")
    }
  }
  const handleProductCopyMessage = async (productId) => {
    const product = products.find((p) => p.id === productId)
    const message = product?.deliveryMessage?.trim()
    if (!message) {
      toast.error("Bu ürüne teslimat mesajı eklenmemiş.")
      return
    }
    try {
      await navigator.clipboard.writeText(message)
      toast.success("Teslimat mesajı kopyalandı", { duration: 1500, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamadı")
    }
  }

  const handleStockDeleteWithConfirm = async (productId, stockId) => {
    const key = `${productId}-${stockId}`
    if (confirmStockTarget === key) {
      const targetProduct = products.find((p) => p.id === productId)
      const removed = targetProduct?.stocks.find((stk) => stk.id === stockId)

      try {
        const res = await apiFetch(`/api/stocks/${stockId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 404) throw new Error("stock_delete_failed")

        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId
              ? { ...product, stocks: product.stocks.filter((stk) => stk.id !== stockId)}
              : product,
          ),
        )
        if (removed) {
          setLastDeleted({ productId, stocks: [removed] })
        }

        setConfirmStockTarget(null)
        toast.success("Anahtar silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Anahtar silinemedi (API/DB kontrol edin).")
        setConfirmStockTarget(null)
        return
      }
    }
    setConfirmStockTarget(key)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }
  const handleStockCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Anahtar kopyalandı", { duration: 1500, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamadı", { duration: 1500, position: "top-right" })
    }
  }

  const handleProblemAdd = async () => {
    const user = problemUsername.trim()
    const issue = problemIssue.trim()
    if (!user || !issue) {
      toast.error("Kullanıcı adı ve sorun girin.")
      return
    }
    try {
      const res = await apiFetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, issue }),
      })
      if (!res.ok) throw new Error("problem_create_failed")
      const created = await res.json()
      setProblems((prev) => [...prev, created])
      setProblemUsername("")
      setProblemIssue("")
      toast.success("Problem eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Problem eklenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemResolve = async (id) => {
    try {
      const res = await apiFetch(`/api/problems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      })
      if (!res.ok) throw new Error("problem_update_failed")
      const updated = await res.json()
      setProblems((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success("Problem çözüldü")
    } catch (error) {
      console.error(error)
      toast.error("Güncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemReopen = async (id) => {
    try {
      const res = await apiFetch(`/api/problems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      })
      if (!res.ok) throw new Error("problem_reopen_failed")
      const updated = await res.json()
      setProblems((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success("Aktif probleme taşındı")
    } catch (error) {
      console.error(error)
      toast.error("Güncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Kullanıcı adı kopyalandı", { duration: 1400, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamadı", { duration: 1600, position: "top-right" })
    }
  }

  const handleProblemDeleteWithConfirm = async (id) => {
    if (confirmProblemTarget === id) {
      try {
        const res = await apiFetch(`/api/problems/${id}`, { method: "DELETE" })
        if (!res.ok && res.status !== 404) throw new Error("problem_delete_failed")
        setProblems((prev) => prev.filter((p) => p.id !== id))
        setConfirmProblemTarget(null)
        toast.success("Problem silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Silinemedi (API/DB kontrol edin).")
        setConfirmProblemTarget(null)
        return
      }
    }
    setConfirmProblemTarget(id)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  const openProblems = problems.filter((p) => p.status !== "resolved")
  const resolvedProblems = problems.filter((p) => p.status === "resolved")

  if (isAuthChecking) {
    return null
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-ink-900/80 px-4 py-3 shadow-card backdrop-blur">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-200">
                Pulcip Manage
              </span>
              <h1 className="font-display text-2xl font-semibold text-white">Giris paneli</h1>
            </div>
            {themeToggleButton}
          </div>

          <div className="rounded-3xl border border-white/10 bg-ink-900/70 p-6 shadow-card">
            <p className="text-sm text-slate-200/80">Paneli acmak icin sifre gir.</p>

            <form className="mt-4 space-y-4" onSubmit={handleAuthSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="auth-password">
                  Sifre
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value)
                    if (authError) setAuthError("")
                  }}
                  autoComplete="current-password"
                  disabled={isAuthBusy}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              {authError && (
                <div className="rounded-lg border border-rose-200/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={isAuthBusy}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAuthBusy ? "Kontrol ediliyor" : "Giris yap"}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-400">Sifren yoksa yoneticine sor.</p>
          </div>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: toastStyle,
            success: {
              iconTheme: {
                primary: toastIconTheme.primary,
                secondary: toastIconTheme.secondary,
              },
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="sticky top-4 z-30 flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-ink-900/80 px-3 py-2 shadow-card backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveTab("messages")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "messages"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Mesajlar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "tasks"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Gorev
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("problems")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "problems"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Problemli Müşteriler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lists")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "lists"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Listeler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "stock"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Stok
          </button>
          <div className="ml-auto flex items-center gap-2">
            {logoutButton}
            {themeToggleButton}
          </div>
        </div>

        {activeTab === "messages" && (
          <>
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Pulcip Manage
                  </span>
                  <div className="space-y-1.5">
                    <h1 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
                      Pulcip Manage
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-200/80 md:text-base">
                      Kendi tonunu bul, hazır şablonlarını hızla düzenle ve tek tıkla ekibinle paylaş.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                      <span className="h-2 w-2 rounded-full bg-accent-400" />
                      Şablon: {templateCountText}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                      Kategori sayısı: {categoryCountText}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                      Kategori: {selectedCategoryText}
                    </span>
                  </div>
                </div>

                <div className="relative w-full max-w-sm">
                  <div className="absolute inset-x-6 -bottom-16 h-40 rounded-full bg-accent-400/30 blur-3xl" />
                  <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                          Aktif şablon
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-2xl font-semibold text-white">
                            {activeTemplate?.label || (showLoading ? "Yükleniyor..." : "Yeni şablon")}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getCategoryClass(
                              activeTemplate?.category || selectedCategory || "Genel",
                            )}`}
                          >
                            {activeTemplate?.category || selectedCategory || "Genel"}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={
                            isEditingActiveTemplate ? handleActiveTemplateEditCancel : handleActiveTemplateEditStart
                          }
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                            isEditingActiveTemplate
                              ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-50"
                              : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                          }`}
                          disabled={!activeTemplate || showLoading || isTemplateSaving}
                        >
                          {isEditingActiveTemplate ? "Vazgeç" : "Mesajı düzenle"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWithConfirm(selectedTemplate)}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                            confirmTarget === selectedTemplate
                              ? "border-rose-300 bg-rose-500/25 text-rose-50"
                              : "border-rose-500/60 bg-rose-500/15 text-rose-100 hover:border-rose-300 hover:bg-rose-500/25"
                          }`}
                          disabled={!selectedTemplate || isTemplateSaving}
                        >
                          {confirmTarget === selectedTemplate ? "Emin misin?" : "Sil"}
                        </button>
                      </div>
                    </div>
                    {isEditingActiveTemplate ? (
                      <textarea
                        value={activeTemplateDraft}
                        onChange={(e) => setActiveTemplateDraft(e.target.value)}
                        rows={4}
                        autoFocus
                        disabled={isTemplateSaving}
                        placeholder="Mesaj içeriğini güncelle"
                        className="mt-3 w-full rounded-lg border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                        {activeTemplate?.value ||
                          (showLoading ? "Veriler yükleniyor..." : "Mesajını düzenleyip kaydetmeye başla.")}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300/80">
                      <span>{activeTemplateLength} karakter</span>
                      {isEditingActiveTemplate ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleActiveTemplateEditSave}
                            disabled={isTemplateSaving}
                            className="rounded-full border border-emerald-300/70 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isTemplateSaving ? "Kaydediliyor" : "Kaydet"}
                          </button>
                          <button
                            type="button"
                            onClick={handleActiveTemplateEditCancel}
                            disabled={isTemplateSaving}
                            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Vazgeç
                          </button>
                        </div>
                      ) : (
                        <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-accent-100">
                          {showLoading ? "Bekle" : "Hazır"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Şablon listesi</p>
                      <p className="text-sm text-slate-400">Başlıklarına dokunarak düzenle ve kopyala.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {showLoading && <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />}
                      {templateCountText} {showLoading ? "" : "seçenek"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {showLoading ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                            <div className="mb-3 h-4 w-24 animate-pulse rounded-full bg-white/10" />
                            <div className="grid gap-2">
                              {Array.from({ length: 2 }).map((__, jdx) => (
                                <div
                                  key={`${idx}-${jdx}`}
                                  className="h-20 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300"
                                >
                                  <div className="h-full animate-pulse rounded-xl bg-ink-800/80" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      categories.map((cat) => {
                        const list = groupedTemplates[cat] || []
                        const isOpen = openCategories[cat] ?? true
                        return (
                          <div key={cat} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                            <button
                              type="button"
                              onClick={() => setOpenCategories((prev) => ({ ...prev, [cat]: !(prev[cat] ?? true)}))}
                              className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left text-sm font-semibold text-slate-100"
                            >
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] ${getCategoryClass(cat)}`}
                                >
                                  {cat}
                                </span>
                                <span className="text-xs text-slate-400">{list.length} şablon</span>
                              </span>
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition ${
                                  isOpen ? "rotate-180 border-accent-300/60 bg-white/10 text-accent-200" : ""
                                }`}
                                aria-hidden="true"
                              >
                                &gt;
                              </span>
                            </button>

                            {isOpen && (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {list.length === 0 && (
                                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                                    Bu kategoride şablon yok.
                                  </div>
                                )}
                                {list.map((tpl) => (
                                  <div key={tpl.label} className="relative">
                                    <button
                                      type="button"
                                      onClick={() => handleTemplateChange(tpl.label, { shouldCopy: true })}
                                      className={`h-full w-full rounded-xl border px-4 py-3 text-left transition ${
                                        tpl.label === selectedTemplate
                                          ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                                          : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                                      }`}
                                >
                                  <p className="font-display text-lg">{tpl.label}</p>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kategori ekle</p>
                      <p className="text-sm text-slate-400">Yeni kategori ekle, ardından mesaj alanından seç.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {categoryCountText} kategori
                    </span>
                  </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="category-new"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Örn: Duyuru"
                    className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                  <button
                    type="button"
                    onClick={handleCategoryAdd}
                    className="w-full min-w-[140px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 sm:w-auto"
                  >
                    Ekle
                  </button>
                </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${getCategoryClass(cat)}`}
                      >
                        <span className="font-semibold">{cat}</span>
                        {cat !== "Genel" && (
                          <button
                            type="button"
                            onClick={() => handleCategoryDeleteWithConfirm(cat)}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                              confirmCategoryTarget === cat
                                ? "border-rose-300 bg-rose-500/20 text-rose-50"
                                : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                            }`}
                          >
                            {confirmCategoryTarget === cat ? "Emin misin?" : "Sil"}
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Şablon ekle</p>
                      <p className="text-sm text-slate-400">Başlık, kategori ve mesajı ekleyip kaydet.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Hızlı ekle</span>
                  </div>

                  <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="title-mini">
                        Başlık
                      </label>
                      <input
                        id="title-mini"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Örn: Karşılama notu"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="category-mini">
                        Kategori
                      </label>
                      <select
                        id="category-mini"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <label htmlFor="message-mini">Mesaj</label>
                        <span className="text-[11px] text-slate-400">Anlık karakter: {messageLength}</span>
                      </div>
                      <textarea
                        id="message-mini"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Mesaj içeriği..."
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessage("")}
                        className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-800/60`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Hızlı ipuçları</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>- Başlık boş kalırsa otomatik bir isimle kaydedilir.</li>
                    <li>- Şablona tıklamak metni panoya kopyalar.</li>
                    <li>- Kategori silince şablonlar “Genel”e taşınır.</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Gorevler
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Gorevler</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    Not ve tarih ile gorevlerini takipe al. Hepsi lokal tutulur.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Toplam: {taskStats.total}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Acik: {taskStats.todo + taskStats.doing}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Gorev tahtasi</p>
                      <p className="text-sm text-slate-400">Kartlari surukleyip yeni duruma birak.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                        Tamamlanan: {taskStats.done}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                        Devam: {taskStats.doing}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {Object.entries(taskStatusMeta).map(([status, meta]) => (
                      <div
                        key={status}
                        onDragOver={(event) => handleTaskDragOver(event, status)}
                        onDrop={(event) => handleTaskDrop(event, status)}
                        onDragLeave={() =>
                          setTaskDragState((prev) =>
                            prev.overStatus === status ? { ...prev, overStatus: null } : prev,
                          )
                        }
                        className={`flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner transition ${
                          taskDragState.overStatus === status
                            ? "border-accent-400/60 ring-2 ring-accent-400/30"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${meta.accent}`}>{meta.label}</p>
                            <p className="text-xs text-slate-400">{meta.helper}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
                            {taskGroups[status].length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {taskGroups[status].length === 0 && (
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                              Bu kolon bos.
                            </div>
                          )}
                          {taskGroups[status].map((task) => {
                            return (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(event) => handleTaskDragStart(event, task.id)}
                                onDragEnd={handleTaskDragEnd}
                                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-800/70 p-3 shadow-inner transition hover:border-accent-300/40 hover:bg-ink-800/80 hover:shadow-glow cursor-grab"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                                    {task.note && (
                                      <p
                                        className="text-xs text-slate-400 break-words"
                                        style={{
                                          display: "-webkit-box",
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                          overflowWrap: "anywhere",
                                          wordBreak: "break-word",
                                        }}
                                        title={task.note}
                                      >
                                        {task.note}
                                      </p>
                                    )}
                                    {task.owner && (
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        {task.owner}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`w-fit rounded-full border px-2 py-1 text-[11px] ${
                                    isTaskDueToday(task)
                                      ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                                      : "border-white/10 bg-white/5 text-slate-300"
                                  }`}
                                >
                                  Bitis: {getTaskDueLabel(task)}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {status !== "done" && (
                                    <button
                                      type="button"
                                      onClick={() => handleTaskAdvance(task.id)}
                                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                    >
                                      {status === "todo" ? "Baslat" : "Tamamla"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openTaskDetail(task)}
                                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                  >
                                    Detay
                                  </button>
                                  {status === "done" && (
                                    <button
                                      type="button"
                                      onClick={() => handleTaskReopen(task.id)}
                                      className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                                    >
                                      Geri al
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleTaskDeleteWithConfirm(task.id)}
                                    className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                      confirmTaskDelete === task.id
                                        ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                        : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                                    }`}
                                  >
                                    {confirmTaskDelete === task.id ? "Emin misin?" : "Sil"}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-900/70`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Gorev ekle</p>
                      <p className="text-sm text-slate-400">Yeni isleri listeye ekle.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {taskStats.total} gorev
                    </span>
                  </div>

                  <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="task-title">
                        Gorev adi
                      </label>
                      <input
                        id="task-title"
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Orn: Stok raporunu gonder"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <label htmlFor="task-note">Not</label>
                        <button
                          type="button"
                          onClick={openNoteModal}
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                        >
                          Genislet
                        </button>
                      </div>
                      <textarea
                        id="task-note"
                        rows={3}
                        value={taskForm.note}
                        onChange={(e) => setTaskForm((prev) => ({ ...prev, note: e.target.value }))}
                        placeholder="Kisa not veya kontrol listesi"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="task-owner">
                        Sorumlu
                      </label>
                      <input
                        id="task-owner"
                        type="text"
                        value={taskForm.owner}
                        onChange={(e) => setTaskForm((prev) => ({ ...prev, owner: e.target.value }))}
                        placeholder="Orn: Ayse"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="task-due-type">
                        Bitis tarihi
                      </label>
                      <select
                        id="task-due-type"
                        value={taskForm.dueType}
                        onChange={(e) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            dueType: e.target.value,
                          }))
                        }
                        className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      >
                        {taskDueTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {taskForm.dueType === "repeat" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="task-repeat-day">
                          Tekrarlanabilir gun
                        </label>
                        <select
                          id="task-repeat-day"
                          value={taskForm.repeatDay}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, repeatDay: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        >
                          {taskRepeatDays.map((day) => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {taskForm.dueType === "date" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="task-due-date">
                          Ozel tarih
                        </label>
                        <input
                          id="task-due-date"
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleTaskAdd}
                        className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                      >
                        Gorev ekle
                      </button>
                      <button
                        type="button"
                        onClick={resetTaskForm}
                        className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-800/60`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Odak notu</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <p>- Acik gorev: {taskStats.todo + taskStats.doing}</p>
                    <p>- Tamamlanan: {taskStats.done}</p>
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-200 shadow-inner">
                    {focusTask ? (
                      <>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Siradaki odak</p>
                        <p className="mt-1 text-sm text-slate-100">{focusTask.title}</p>
                      </>
                    ) : (
                      <p>Gorev kalmadi. Yeni gorev ekleyebilirsin.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lists" && (
          <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Listeler
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Listeler</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    Yeni liste oluştur, listeleri görüntüle ve hücreleri Excel benzeri biçimde düzenle.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Toplam liste: {listCountText}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Aktif: {activeList?.name || "Seçilmedi"}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Listeler</p>
                      <p className="text-sm text-slate-400">Listeye tıkla ve tabloyu aç.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {listCountText} liste
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {!isListsLoading && lists.length === 0 && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Henüz liste yok.
                      </div>
                    )}
                    {isListsLoading && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        <LoadingIndicator label="Listeler yükleniyor..." />
                      </div>
                    )}
                    {lists.map((list) => {
                      const rowCount = list.rows?.length ?? 0
                      const colCount =
                        list.rows?.reduce((acc, row) => Math.max(acc, row.length), 0) || DEFAULT_LIST_COLS
                      const isActive = list.id === activeListId
                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => handleListSelect(list.id)}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            isActive
                              ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                              : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                          }`}
                        >
                          <p className="text-sm font-semibold">{list.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {rowCount} satır · {colCount} sütun
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Liste içeriği</p>
                      <p className="text-sm text-slate-400">Hücreleri seçip düzenleyebilirsin.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>Başlıklara sağ tıkla: ekle/sil</span>
                        {listSavedAt ? (
                          <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
                            Kaydedildi
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Otomatik kaydetme aktif</span>
                        )}
                      </div>
                      {activeList && (selectedListRows.size > 0 || selectedListCols.size > 0) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedListRows.size > 0 && (
                            <button
                              type="button"
                              onClick={handleListDeleteSelectedRows}
                              className="rounded-lg border border-rose-300/70 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-200 hover:bg-rose-500/20"
                            >
                              Satirlari sil ({selectedListRows.size})
                            </button>
                          )}
                          {selectedListCols.size > 0 && (
                            <button
                              type="button"
                              onClick={handleListDeleteSelectedColumns}
                              className="rounded-lg border border-rose-300/70 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-200 hover:bg-rose-500/20"
                            >
                              Sutunlari sil ({selectedListCols.size})
                            </button>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleListSaveNow}
                        disabled={!activeList || isListSaving || isListsLoading}
                        className="inline-flex items-center rounded-[0.5rem] border border-emerald-300/70 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isListSaving ? "Kaydediliyor" : "Kaydet"}
                      </button>
                    </div>
                  </div>

                  
                  {!activeList ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                      Bir liste seçin veya yeni liste oluşturun.
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 overflow-auto rounded-xl border border-white/10 bg-ink-900/80">
                        <table className="min-w-[640px] w-full border-collapse text-xs text-slate-200">
                          <thead className="bg-white/5 text-slate-300">
                            <tr>
                              <th className="w-10 border border-white/10 px-2 py-1 text-center text-[11px] font-semibold text-slate-400">
                                #
                              </th>
                              {activeListColumnLabels.map((label, colIndex) => {
                                const isSelected =
                                  selectedListCols.has(colIndex) || selectedListCell.col === colIndex
                                return (
                                  <th
                                    key={label}
                                    onClick={(event) => handleListColumnSelect(event, colIndex)}
                                    onContextMenu={(event) =>
                                      handleListContextMenu(event, "column", colIndex)
                                    }
                                    className={`cursor-pointer border border-white/10 px-2 py-1 text-center text-[11px] font-semibold ${
                                      isSelected ? "bg-white/10 text-white" : ""
                                    }`}
                                  >
                                    {label}
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {activeListRows.map((row, rowIndex) => (
                              <tr key={`${activeList.id}-${rowIndex}`}>
                                <td
                                  onClick={(event) => handleListRowSelect(event, rowIndex)}
                                  onContextMenu={(event) => handleListContextMenu(event, "row", rowIndex)}
                                  className={`cursor-pointer border border-white/10 px-2 py-1 text-center text-[11px] ${
                                    selectedListRows.has(rowIndex) || selectedListCell.row === rowIndex
                                      ? "bg-white/10 text-white"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {rowIndex + 1}
                                </td>
                                {activeListColumns.map((colIndex) => {
                                  const cellData = getListCellData(rowIndex, colIndex)
                                  const rawValue = cellData.value ?? ""
                                  const isEditingCell =
                                    editingListCell.row === rowIndex && editingListCell.col === colIndex
                                  const displayValue = isEditingCell
                                    ? rawValue
                                    : getListCellDisplayValue(rowIndex, colIndex)
                                  const alignClass =
                                    cellData.format?.align === "center"
                                      ? "text-center"
                                      : cellData.format?.align === "right"
                                        ? "text-right"
                                        : "text-left"
                                  const cellToneClass =
                                    LIST_CELL_TONE_CLASSES[cellData.format?.tone || "none"] || ""
                                  const cellTextClass = [
                                    alignClass,
                                    cellData.format?.bold ? "font-semibold" : "",
                                    cellData.format?.italic ? "italic" : "",
                                    cellData.format?.underline ? "underline" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")
                                  return (
                                    <td
                                      key={`${rowIndex}-${colIndex}`}
                                      className={`border border-white/10 p-0 ${cellToneClass}`}
                                    >
                                      <input
                                        value={displayValue}
                                        onFocus={() => {
                                          setEditingListCell({ row: rowIndex, col: colIndex })
                                          setSelectedListCell({ row: rowIndex, col: colIndex })
                                        }}
                                      onBlur={() =>
                                        setEditingListCell((prev) =>
                                          prev.row === rowIndex && prev.col === colIndex
                                            ? { row: null, col: null }
                                            : prev,
                                        )
                                      }
                                      onChange={(e) =>
                                        handleListCellChange(rowIndex, colIndex, e.target.value)
                                      }
                                      onPaste={(e) => handleListPaste(e, rowIndex, colIndex)}
                                      spellCheck={false}
                                      className={`h-8 w-full bg-transparent px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-400/60 ${cellTextClass}`}
                                    />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni liste</p>
                      <p className="text-sm text-slate-400">Liste adını girip oluştur.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {listCountText} liste
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="list-name">
                        Liste adı
                      </label>
                      <input
                        id="list-name"
                        type="text"
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleListCreate()
                          }
                        }}
                        placeholder="Örn: Haftalık rapor"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleListCreate}
                      className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                    >
                      Liste oluştur
                    </button>
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Listeyi düzenle
                      </p>
                      <p className="text-sm text-slate-400">Aktif listenin adını değiştir ya da sil.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {activeList?.name || "Seçilmedi"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="list-rename">
                        Liste adı
                      </label>
                      <input
                        id="list-rename"
                        type="text"
                        value={listRenameDraft}
                        onChange={(e) => setListRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleListRename()
                          }
                        }}
                        placeholder="Liste adı"
                        disabled={!activeList}
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleListRename}
                        disabled={!activeList}
                        className="flex-1 min-w-[140px] rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Güncelle
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeList) return
                          if (confirmListDelete === activeList.id) {
                            handleListDelete(activeList.id)
                            return
                          }
                          setConfirmListDelete(activeList.id)
                          toast("Silmek için tekrar tıkla", { position: "top-right" })
                        }}
                        disabled={!activeList}
                        className={`min-w-[140px] rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                          confirmListDelete === activeList?.id
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {confirmListDelete === activeList?.id ? "Emin misin?" : "Listeyi sil"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-800/60`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">İpuçları</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>- Yeni liste varsayılan bir tabloyla başlar.</li>
                    <li>- Satır/sütun ekleyerek tabloyu genişlet.</li>
                    <li>- Bir hucreye cok satir yapistirinca asagiya yayilir.</li>
                    <li>- Formül için "=" ile başla (örn: =SUM(A1:A5)).</li>
                    <li>- Desteklenenler: SUM, AVERAGE, MIN, MAX, COUNT.</li>
                    <li>- Satır/sütun başlığına sağ tıkla: ekle/sil.</li>
                    <li>- Satir/sutun secmek icin basliga tikla; Shift aralik, Ctrl tek tek.</li>
                    <li>- Veriler veritabanında saklanır.</li>
                  </ul>
                </div>
              </div>
            </div>
            {listContextMenu.open && (
              <div
                className="fixed z-50"
                style={{ left: listContextMenu.x, top: listContextMenu.y }}
              >
                <div className="min-w-[180px] rounded-xl border border-white/10 bg-ink-900/95 p-2 text-xs text-slate-100 shadow-card backdrop-blur">
                  {listContextMenu.type === "row" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleListInsertRow(listContextMenu.index)
                          handleListContextMenuClose()
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                      >
                        Satır ekle
                        <span className="text-[10px] text-slate-400">Altına</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleListDeleteRow(listContextMenu.index)
                          handleListContextMenuClose()
                        }}
                        disabled={!canDeleteListRow}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Satır sil
                        <span className="text-[10px] text-rose-200/70">Seçili</span>
                      </button>
                      {selectedListRows.size > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleListDeleteSelectedRows()
                            handleListContextMenuClose()
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10"
                        >
                          Secili satirlari sil
                          <span className="text-[10px] text-rose-200/70">{selectedListRows.size}</span>
                        </button>
                      )}
                    </>
                  )}
                  {listContextMenu.type === "column" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleListInsertColumn(listContextMenu.index)
                          handleListContextMenuClose()
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                      >
                        Sütun ekle
                        <span className="text-[10px] text-slate-400">Sağına</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleListDeleteColumn(listContextMenu.index)
                          handleListContextMenuClose()
                        }}
                        disabled={!canDeleteListColumn}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Sütun sil
                        <span className="text-[10px] text-rose-200/70">Seçili</span>
                      </button>
                      {selectedListCols.size > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleListDeleteSelectedColumns()
                            handleListContextMenuClose()
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10"
                        >
                          Secili sutunlari sil
                          <span className="text-[10px] text-rose-200/70">{selectedListCols.size}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "stock" && (
          <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Stok
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Dijital Anahtar Stoku</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    Anahtarları görsel olarak tut, kopyala, ekle ve sil. Bu bölüm veri tabanına bağlı çalışır.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Toplam stok: {stockSummary.total}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Ürün: {products.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">
                    Tükenen: {stockSummary.empty}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Toplam ürün</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{products.length}</p>
                  <p className="mt-1 text-xs text-slate-400">Kayıtlı ürün sayısı</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.12),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Toplam stok</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{stockSummary.total}</p>
                  <p className="mt-1 text-xs text-slate-400">Tüm ürünlerdeki anahtar</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(244,63,94,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stoksuz ürün</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{stockSummary.empty}</p>
                  <p className="mt-1 text-xs text-slate-400">Stok bekleyen ürün</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Ürün kataloğu
                      </p>
                      <p className="text-sm text-slate-400">Stokları satır bazında yönet, toplu işlem yap.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-3 py-1.5 shadow-inner">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ara</span>
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Ürün ya da kod"
                          className="w-56 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {products.length} ürün / {stockSummary.total} stok
                      </span>
                      <span className="rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">
                        Tükenen: {stockSummary.empty}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {filteredProducts.length === 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Henüz ürün yok.
                      </div>
                    )}
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, product.id)}
                        onDragOver={(event) => handleDragOver(event, product.id)}
                        onDrop={(event) => handleDrop(event, product.id)}
                        onDragEnd={handleDragEnd}
                        title="Sürükle ve sırala"
                        className={`rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner transition hover:border-accent-400/60 hover:bg-ink-800/80 hover:shadow-card ${
                          dragState.activeId === product.id ? "opacity-60" : ""
                        } ${dragState.overId === product.id ? "ring-2 ring-accent-300/60" : ""} cursor-grab`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => toggleProductOpen(product.id)}
                            className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold text-white">{product.name}</span>
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                    product.stocks.length === 0
                                      ? "border border-rose-300/60 bg-rose-500/15 text-rose-50"
                                      : "border border-emerald-300/60 bg-emerald-500/15 text-emerald-50"
                                  }`}
                                >
                                  {product.stocks.length} stok
                                </span>
                                {product.note?.trim() && product.note.trim().toLowerCase() !== "null" && (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">
                                    {product.note}
                                  </span>
                                )}
                              </div>
                              
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5">
                            {editingProduct[product.id] ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditSave(product.id)}
                                  className="flex h-8 items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5"
                                >
                                  Kaydet
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditCancel(product.id)}
                                  className="flex h-8 items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50"
                                >
                                  İptal
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEditStart(product)}
                                className="flex h-8 items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                              >
                                Düzenle
                              </button>
                            )}
                            {lastDeleted?.productId === product.id && (
                              <button
                                type="button"
                                onClick={handleUndoDelete}
                                className="flex h-8 items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/15"
                              >
                                Geri al
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleProductOpen(product.id)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition ${
                                openProducts[product.id]
                                  ? "rotate-180 border-accent-300/60 bg-white/10 text-accent-200"
                                  : ""
                              }`}
                              aria-label="Ürün detaylarını aç/kapat"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        {openProducts[product.id] && (
                          <div className="mt-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-slate-300">
                              {product.deliveryTemplate?.trim() &&
                                templates.some((tpl) => tpl.label === product.deliveryTemplate) &&
                                product.deliveryMessage?.trim() && (
                                  <button
                                    type="button"
                                    onClick={() => handleProductCopyMessage(product.id)}
                                    className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50"
                                  >
                                    Teslimat mesajını kopyala
                                  </button>
                                )}
                              <button
                                type="button"
                                onClick={() => handleProductDeleteWithConfirm(product.id)}
                                className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                  confirmProductTarget === product.id
                                    ? "border-rose-300 bg-rose-500/20 text-rose-50"
                                    : "border-rose-400/60 bg-rose-500/10 text-rose-50 hover:border-rose-300 hover:bg-rose-500/20"
                                }`}
                              >
                                {confirmProductTarget === product.id ? "Silmek için tekrar tıkla" : "Ürünü sil"}
                              </button>
                            </div>
                            {editingProduct[product.id] && (
                              <div className="space-y-2 rounded-xl border border-white/10 bg-ink-900/70 p-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <label
                                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-300"
                                      htmlFor={`edit-name-${product.id}`}
                                    >
                                      Ürün adı
                                    </label>
                                    <input
                                      id={`edit-name-${product.id}`}
                                      type="text"
                                      value={editingProduct[product.id]?.name || ""}
                                      onChange={(e) => handleEditChange(product.id, "name", e.target.value)}
                                      className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label
                                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-300"
                                      htmlFor={`edit-note-${product.id}`}
                                    >
                                      Teslimat şablonu
                                    </label>
                                    <select
                                      id={`edit-note-${product.id}`}
                                      value={editingProduct[product.id]?.deliveryTemplate || ""}
                                      onChange={(e) => handleEditChange(product.id, "deliveryTemplate", e.target.value)}
                                      className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                                    >
                                      <option value="">Seçin</option>
                                      {templates.map((tpl) => (
                                        <option key={tpl.label} value={tpl.label}>
                                          {tpl.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                            {product.stocks.length === 0 && (
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                                Bu üründe stok yok.
                              </div>
                            )}
                            {product.stocks.length > 0 && (
                              <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                    Toplu kopyala & sil
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-2 py-1">
                                      <input
                                        id={`bulk-${product.id}`}
                                        type="text"
                                        value={bulkCount[product.id] ?? product.stocks.length}
                                        onChange={(e) =>
                                          setBulkCount((prev) => ({
                                            ...prev,
                                            [product.id]: e.target.value.replace(/\D/g, ""),
                                          }))
                                        }
                                        inputMode="numeric"
                                        className="w-16 appearance-none bg-transparent text-xs text-slate-100 focus:outline-none"
                                      />
                                      <span className="text-[11px] text-slate-500">/ {product.stocks.length}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleBulkCopyAndDelete(product.id)}
                                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                                    >
                                      Kopyala & sil
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {product.stocks.map((stk, idx) => (
                                    <div
                                      key={stk.id}
                                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 transition hover:border-accent-400/60 hover:bg-ink-800/80"
                                    >
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 transition group-hover:border-accent-300 group-hover:text-accent-100">
                                        #{idx + 1}
                                      </span>
                                      <p className="flex-1 break-all font-mono text-sm text-slate-100 group-hover:text-accent-50">
                                        {stk.code}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleStockCopy(stk.code)}
                                          className="flex h-7 items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50"
                                          aria-label="Stoku kopyala"
                                        >
                                          Kopyala
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleStockDeleteWithConfirm(product.id, stk.id)}
                                          className={`flex h-7 items-center justify-center rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 ${
                                            confirmStockTarget === `${product.id}-${stk.id}`
                                              ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                              : "border-rose-400/60 bg-rose-500/10 hover:border-rose-300 hover:bg-rose-500/20"
                                          }`}
                                          aria-label="Stoku sil"
                                        >
                                          Sil
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 lg:sticky lg:top-6">
                <div className={`${panelClass} relative overflow-hidden bg-ink-900/70`}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.12),transparent)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni ürün ekle</p>
                        <p className="text-sm text-slate-400">Sağdan ürün yarat, solda stokları görün.</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {products.length} ürün
                      </span>
                    </div>

                    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="prd-name">
                          Ürün adı
                        </label>
                        <input
                          id="prd-name"
                          type="text"
                          value={productForm.name}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Örn: Deluxe Edition"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="prd-delivery">
                          Teslimat şablonu (opsiyonel)
                        </label>
                        <select
                          id="prd-delivery"
                          value={productForm.deliveryTemplate}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, deliveryTemplate: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        >
                          <option value="">Seç (opsiyonel)</option>
                          {templates.map((tpl) => (
                            <option key={tpl.label} value={tpl.label}>
                              {tpl.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleProductAdd}
                          className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                        >
                          Ürün ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductForm({ name: "", deliveryTemplate: "" })}
                          className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${panelClass} relative overflow-hidden bg-ink-900/70`}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.08),transparent)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Stok ekle</p>
                        <p className="text-sm text-slate-400">Seçilen ürüne anahtar ekle.</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {stockSummary.total} stok
                      </span>
                    </div>

                    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-product">
                          Ürün seç
                        </label>
                        <select
                          id="stock-product"
                          value={stockForm.productId}
                          onChange={(e) => setStockForm((prev) => ({ ...prev, productId: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        >
                          {products.map((prd) => (
                            <option key={prd.id} value={prd.id}>
                              {prd.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-code">
                          Anahtar / Kod
                        </label>
                        <textarea
                          id="stock-code"
                          rows={4}
                          value={stockForm.code}
                          onChange={(e) => setStockForm((prev) => ({ ...prev, code: e.target.value }))}
                          placeholder="Her satır bir anahtar / kod, örn: XXXX-XXXX-XXXX-XXXX"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleStockAdd}
                          className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                        >
                          Stok ekle
                        </button>
                        <button
                          type="button"
                          onClick={resetStockForm}
                          className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "problems" && (
          <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Problemli Müşteriler
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Problemli Müşteriler</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    Müşteri kullanıcı adı ve sorununu kaydet; çözülünce “Problem çözüldü” ile kapat veya sil.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Açık problem: {openProblems.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Çözülen: {resolvedProblems.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Toplam: {problems.length}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Açık problemler</p>
                      <p className="text-sm text-slate-400">Kullanıcı adı ve sorun bilgisi listelenir.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {openProblems.length} kayıt
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {openProblems.length === 0 && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Açık problem yok.
                      </div>
                    )}
                    {openProblems.map((pb) => (
                      <div
                        key={pb.id}
                        className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-ink-900 p-4 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-accent-200 break-all">
                              {pb.username}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleProblemCopy(pb.username)}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-50"
                          >
                            Kopyala
                          </button>
                        </div>
                        <p className="rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-slate-200 shadow-inner">
                          {pb.issue}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleProblemResolve(pb.id)}
                            className="rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25"
                          >
                            Çözüldü
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProblemDeleteWithConfirm(pb.id)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                              confirmProblemTarget === pb.id
                                ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                            }`}
                          >
                            {confirmProblemTarget === pb.id ? "Emin misin?" : "Sil"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Çözülen problemler</p>
                      <p className="text-sm text-slate-400">Çözülmüş kayıtları sakla ya da sil.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {resolvedProblems.length} kayıt
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {resolvedProblems.length === 0 && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Çözülen kayıt yok.
                      </div>
                    )}
                    {resolvedProblems.map((pb) => (
                      <div
                        key={pb.id}
                        className="flex h-full flex-col gap-3 rounded-xl border border-emerald-200/40 bg-emerald-950/50 p-4 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex max-w-full flex-wrap rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-50 break-all">
                              {pb.username}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleProblemCopy(pb.username)}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-50"
                          >
                            Kopyala
                          </button>
                        </div>
                        <p className="rounded-lg border border-emerald-200/20 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-50/90 shadow-inner">
                          {pb.issue}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleProblemReopen(pb.id)}
                            className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                          >
                            Çözülmedi
                          </button>
                        <button
                          type="button"
                          onClick={() => handleProblemDeleteWithConfirm(pb.id)}
                          className={`w-fit rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                            confirmProblemTarget === pb.id
                              ? "border-rose-200 bg-rose-500/25 text-rose-50"
                              : "border-rose-200/80 bg-rose-500/10 text-rose-50 hover:border-rose-100 hover:bg-rose-500/20"
                          }`}
                        >
                          {confirmProblemTarget === pb.id ? "Emin misin?" : "Sil"}
                        </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Problem ekle</p>
                      <p className="text-sm text-slate-400">Kullanıcı adı ve sorunu yazıp kaydet.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      Toplam: {problems.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="pb-username">
                        Kullanıcı adı
                      </label>
                      <input
                        id="pb-username"
                        type="text"
                        value={problemUsername}
                        onChange={(e) => setProblemUsername(e.target.value)}
                        placeholder="@kullanici"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="pb-issue">
                        Sorun
                      </label>
                      <textarea
                        id="pb-issue"
                        value={problemIssue}
                        onChange={(e) => setProblemIssue(e.target.value)}
                        rows={4}
                        placeholder="Sorunun kısa özeti..."
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleProblemAdd}
                        className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProblemUsername("")
                          setProblemIssue("")
                        }}
                        className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {isNoteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={handleNoteModalClose}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-ink-900/95 p-6 shadow-card backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300/80">
                  Not editoru
                </p>
                <p className="text-sm text-slate-400">Uzun notunu burada duzenle.</p>
              </div>
              <button
                type="button"
                onClick={handleNoteModalClose}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
              >
                Kapat
              </button>
            </div>

            <textarea
              id="task-note-modal"
              rows={12}
              value={noteModalDraft}
              onChange={(e) => setNoteModalDraft(e.target.value)}
              placeholder="Detayli notunu buraya yaz..."
              className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleNoteModalSave}
                className="min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={handleNoteModalClose}
                className="min-w-[120px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
              >
                Iptal
              </button>
            </div>
          </div>
        </div>
      )}
      {taskDetailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeTaskDetail}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-ink-900/95 p-6 shadow-card backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300/80">
                  Gorev detayi
                </p>
                <p className="text-lg font-semibold text-slate-100">{taskDetailTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={closeTaskDetail}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
              >
                Kapat
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {taskDetailTarget.owner && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                  Sorumlu: {taskDetailTarget.owner}
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                Durum: {taskStatusMeta[taskDetailTarget.status]?.label || "Yapilacak"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                Bitis: {getTaskDueLabel(taskDetailTarget)}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/70 p-4 text-sm text-slate-200 shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Notlar</p>
              <div className="mt-2 max-h-[280px] overflow-auto whitespace-pre-wrap text-sm text-slate-100">
                {taskDetailTarget.note || "Not eklenmedi."}
              </div>
            </div>
          </div>
        </div>
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          style: toastStyle,
          success: {
            iconTheme: {
              primary: toastIconTheme.primary,
              secondary: toastIconTheme.secondary,
            },
          },
        }}
      />
    </div>
  )
}

export default App

























