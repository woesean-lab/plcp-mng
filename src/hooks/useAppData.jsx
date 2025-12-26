import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import LoadingIndicator from "../components/LoadingIndicator"
import {
  AUTH_TOKEN_STORAGE_KEY,
  DEFAULT_LIST_COLS,
  DEFAULT_LIST_ROWS,
  FORMULA_ERRORS,
  LIST_AUTO_SAVE_DELAY_MS,
  LIST_CELL_TONE_CLASSES,
  PERMISSIONS,
  PRODUCT_ORDER_STORAGE_KEY,
  STOCK_STATUS,
  THEME_STORAGE_KEY,
  categoryPalette,
  panelClass,
  taskDueTypeOptions,
  taskRepeatDayValues,
  taskRepeatDays,
  taskStatusMeta,
} from "../constants/appConstants"
import {
  fallbackCategories,
  fallbackTemplates,
  initialProblems,
  initialProducts,
  initialTasks,
} from "../constants/appData"
import {
  createEmptySheet,
  errorValue,
  formatListCellValue,
  isErrorValue,
  LIST_DATE_FORMATTER,
  parseCellRef,
  parseFormula,
  toColumnLabel,
} from "../utils/listUtils"
import { getStockStatus, splitStocks } from "../utils/stockUtils"
import { getInitialTheme } from "../utils/theme"

export default function useAppData() {
  const [activeTab, setActiveTab] = useState("messages")
  const [isTabLoading, setIsTabLoading] = useState(false)
  const tabLoadingTimerRef = useRef(null)
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
  const [activeUser, setActiveUser] = useState(null)
  const [authUsername, setAuthUsername] = useState("")
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
  const listSavedTimer = useRef(null)
  const listAutoSaveTimer = useRef(null)
  const templateLoadTimerRef = useRef(null)
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
  const [isProblemsLoading, setIsProblemsLoading] = useState(true)
  const [problemUsername, setProblemUsername] = useState("")
  const [problemIssue, setProblemIssue] = useState("")
  const [confirmProblemTarget, setConfirmProblemTarget] = useState(null)

  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [isAdminLoading, setIsAdminLoading] = useState(false)
  const [roleDraft, setRoleDraft] = useState({ id: null, name: "", permissions: [] })
  const [userDraft, setUserDraft] = useState({ id: null, username: "", password: "", roleId: "" })
  const [confirmRoleDelete, setConfirmRoleDelete] = useState(null)
  const [confirmUserDelete, setConfirmUserDelete] = useState(null)

  const [products, setProducts] = useState([])
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [productForm, setProductForm] = useState({ name: "", deliveryTemplate: "" })
  const [stockForm, setStockForm] = useState({ productId: "", code: "" })
  const [confirmStockTarget, setConfirmStockTarget] = useState(null)
  const [productSearch, setProductSearch] = useState("")
  const [openProducts, setOpenProducts] = useState({})
  const [confirmProductTarget, setConfirmProductTarget] = useState(null)
  const [bulkCount, setBulkCount] = useState({})
  const [usedBulkCount, setUsedBulkCount] = useState({})
  const [lastDeleted, setLastDeleted] = useState(null)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [stockModalDraft, setStockModalDraft] = useState("")
  const [stockModalTarget, setStockModalTarget] = useState(null)
  const [productOrder, setProductOrder] = useState([])
  const [dragState, setDragState] = useState({ activeId: null, overId: null })
  const [editingProduct, setEditingProduct] = useState({})
  const [editingStocks, setEditingStocks] = useState({})
  const [savingStocks, setSavingStocks] = useState({})
  const [deletingStocks, setDeletingStocks] = useState({})
  const [usingStocks, setUsingStocks] = useState({})
  const [highlightStocks, setHighlightStocks] = useState({})
  const stockModalTextareaRef = useRef(null)
  const stockModalLineRef = useRef(null)
  const isStockTextSelectingRef = useRef(false)

  const [tasks, setTasks] = useState([])
  const [taskForm, setTaskForm] = useState({
    title: "",
    note: "",
    owner: "",
    dueType: "today",
    repeatDays: ["1"],
    dueDate: "",
  })
  const [confirmTaskDelete, setConfirmTaskDelete] = useState(null)
  const [taskDragState, setTaskDragState] = useState({ activeId: null, overStatus: null })
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false)
  const [taskEditDraft, setTaskEditDraft] = useState(null)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [noteModalDraft, setNoteModalDraft] = useState("")
  const [taskDetailTarget, setTaskDetailTarget] = useState(null)
  const noteTextareaRef = useRef(null)
  const noteLineRef = useRef(null)
  const detailNoteRef = useRef(null)
  const detailNoteLineRef = useRef(null)
  const noteModalTargetRef = useRef(null)
  const [isTasksLoading, setIsTasksLoading] = useState(true)
  const taskLoadErrorRef = useRef(false)

  const isLight = theme === "light"
  const permissions = useMemo(() => activeUser?.role?.permissions ?? [], [activeUser])
  const hasPermission = useCallback((permission) => permissions.includes(permission), [permissions])
  const availableTabs = useMemo(() => {
    const tabs = []
    if (permissions.includes(PERMISSIONS.messagesView)) tabs.push("messages")
    if (permissions.includes(PERMISSIONS.tasksView)) tabs.push("tasks")
    if (permissions.includes(PERMISSIONS.problemsView)) tabs.push("problems")
    if (permissions.includes(PERMISSIONS.listsView)) tabs.push("lists")
    if (permissions.includes(PERMISSIONS.stockView)) tabs.push("stock")
    if (permissions.includes(PERMISSIONS.adminManage)) tabs.push("admin")
    return tabs
  }, [permissions])
  const canManageAdmin = permissions.includes(PERMISSIONS.adminManage)

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
        if (!authToken) {
          if (isMounted) {
            setIsAuthed(false)
            setActiveUser(null)
          }
          return
        }
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
        const res = await fetch("/api/auth/verify", { headers })
        if (!res.ok) throw new Error("unauthorized")
        const data = await res.json()
        if (!isMounted) return
        setIsAuthed(true)
        setActiveUser(data?.user ?? null)
      } catch (error) {
        if (!isMounted) return
        setIsAuthed(false)
        setActiveUser(null)
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

  useEffect(() => {
    setIsTabLoading(true)
    if (tabLoadingTimerRef.current) {
      window.clearTimeout(tabLoadingTimerRef.current)
    }
    tabLoadingTimerRef.current = window.setTimeout(() => {
      setIsTabLoading(false)
    }, 350)
    return () => {
      if (tabLoadingTimerRef.current) {
        window.clearTimeout(tabLoadingTimerRef.current)
      }
    }
  }, [activeTab])

  useEffect(() => {
    if (!isAuthed || availableTabs.length === 0) return
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [activeTab, availableTabs, isAuthed])

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
        setActiveUser(null)
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

  const loadLists = useCallback(
    async (signal) => {
      setIsListsLoading(true)
      try {
        const res = await apiFetch("/api/lists", { signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setLists(Array.isArray(data) ? data : [])
        listLoadErrorRef.current = false
      } catch (error) {
        if (error?.name === "AbortError") return
        setLists([])
        if (!listLoadErrorRef.current) {
          listLoadErrorRef.current = true
          toast.error("Liste verileri al─▒namad─▒ (API/DB kontrol edin).")
        }
      } finally {
        setIsListsLoading(false)
      }
    },
    [apiFetch],
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
    loadLists(controller.signal)
    return () => controller.abort()
  }, [isAuthed, loadLists])

  useEffect(() => {
    if (!isAuthed || activeTab !== "lists") return
    const controller = new AbortController()
    loadLists(controller.signal)
    return () => controller.abort()
  }, [activeTab, isAuthed, loadLists])

  const loadAdminData = useCallback(
    async (signal) => {
      setIsAdminLoading(true)
      try {
        const [rolesRes, usersRes] = await Promise.all([
          apiFetch("/api/roles", { signal }),
          apiFetch("/api/users", { signal }),
        ])
        if (!rolesRes.ok || !usersRes.ok) throw new Error("admin_load_failed")
        const [rolesData, usersData] = await Promise.all([rolesRes.json(), usersRes.json()])
        setRoles(Array.isArray(rolesData) ? rolesData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
      } catch (error) {
        if (error?.name === "AbortError") return
        setRoles([])
        setUsers([])
        toast.error("Yonetim verileri alinamadi (API/DB kontrol edin).")
      } finally {
        setIsAdminLoading(false)
      }
    },
    [apiFetch],
  )

  useEffect(() => {
    if (!isAuthed || !canManageAdmin) {
      setRoles([])
      setUsers([])
      setIsAdminLoading(false)
      return
    }
    const controller = new AbortController()
    loadAdminData(controller.signal)
    return () => controller.abort()
  }, [canManageAdmin, isAuthed, loadAdminData])

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
      if (listSavedTimer.current) {
        window.clearTimeout(listSavedTimer.current)
      }
      if (listAutoSaveTimer.current) {
        window.clearTimeout(listAutoSaveTimer.current)
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
    let used = 0
    products.forEach((product) => {
      const { available, used: usedStocks } = splitStocks(product.stocks)
      total += available.length
      used += usedStocks.length
      if (available.length === 0) empty += 1
    })
    return { total, empty, used }
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

  const loadTasks = useCallback(
    async (signal) => {
      setIsTasksLoading(true)
      try {
        const res = await apiFetch("/api/tasks", { signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setTasks(Array.isArray(data) ? data.map(normalizeTask) : [])
        taskLoadErrorRef.current = false
      } catch (error) {
        if (error?.name === "AbortError") return
        if (!taskLoadErrorRef.current) {
          taskLoadErrorRef.current = true
          toast.error("G├Ârevler al─▒namad─▒ (API/DB kontrol edin).")
        }
        setTasks(initialTasks.map(normalizeTask))
      } finally {
        setIsTasksLoading(false)
      }
    },
    [apiFetch],
  )

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    loadTasks(controller.signal)
    return () => controller.abort()
  }, [isAuthed, loadTasks])

  useEffect(() => {
    if (!isAuthed || activeTab !== "tasks") return
    const controller = new AbortController()
    loadTasks(controller.signal)
    return () => controller.abort()
  }, [activeTab, isAuthed, loadTasks])

  useEffect(() => {
    if (!isAuthed) return
    const tick = () => {
      const today = getLocalDateString(new Date())
      let changedIds = []
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (
            task.dueType === "repeat" &&
            task.status === "done" &&
            task.repeatWakeAt &&
            task.repeatWakeAt <= today
          ) {
            changedIds.push(task.id)
            return { ...task, status: "todo", repeatWakeAt: "" }
          }
          return task
        })
        return changedIds.length > 0 ? next : prev
      })
      if (changedIds.length === 0) return
      changedIds.forEach((taskId) => {
        apiFetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "todo", repeatWakeAt: null }),
        }).catch(() => {})
      })
    }
    tick()
    const intervalId = window.setInterval(tick, 60 * 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [apiFetch, isAuthed])

  useEffect(() => {
    if (!isNoteModalOpen && !taskDetailTarget && !isTaskEditOpen) return
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setIsNoteModalOpen(false)
        setTaskDetailTarget(null)
        setIsTaskEditOpen(false)
        setTaskEditDraft(null)
        noteModalTargetRef.current = null
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isNoteModalOpen, taskDetailTarget, isTaskEditOpen])

  const toggleProductOpen = (productId) => {
    setOpenProducts((prev) => ({ ...prev, [productId]: !(prev[productId] ?? false)}))
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

  const normalizeRepeatDays = (value) => {
    const rawList = Array.isArray(value) ? value : value ? [value] : []
    return rawList
      .map((day) => String(day).trim())
      .filter((day) => day && taskRepeatDayValues.has(day))
  }

  const getRepeatDayLabels = (repeatDays) => {
    const selected = new Set(normalizeRepeatDays(repeatDays))
    return taskRepeatDays.filter((day) => selected.has(day.value)).map((day) => day.label)
  }

  const taskFormRepeatLabels = getRepeatDayLabels(taskForm.repeatDays)
  const taskEditRepeatLabels = getRepeatDayLabels(taskEditDraft?.repeatDays)

  const formatTaskDate = (value) => {
    if (!value) return ""
    const dateValue = new Date(`${value}T00:00:00`)
    if (!Number.isNaN(dateValue.getTime())) {
      return LIST_DATE_FORMATTER.format(dateValue)
    }
    return value
  }

  const normalizeTask = (task) => {
    const dueDate = task?.dueDate || ""
    const dueType = task?.dueType || (dueDate ? "date" : "today")
    const repeatDays = normalizeRepeatDays(task?.repeatDays ?? (task?.repeatDay ? [task.repeatDay] : []))
    return {
      ...task,
      note: task?.note ?? "",
      owner: task?.owner ?? "",
      dueType,
      dueDate: dueType === "date" ? dueDate : "",
      repeatDays,
      repeatWakeAt: task?.repeatWakeAt ?? "",
    }
  }

  const getTaskDueLabel = (task) => {
    if (task.dueType === "today") return "Bug├╝n"
    if (task.dueType === "repeat") {
      const labels = getRepeatDayLabels(task.repeatDays)
      const todayTag = isTaskDueToday(task) ? " (Bug├╝n)" : ""
      return labels.length > 0 ? `Her ${labels.join(", ")}${todayTag}` : `Tekrarlanabilir${todayTag}`
    }
    if (task.dueType === "date") {
      return task.dueDate ? formatTaskDate(task.dueDate) : "Tarih se├ğilmedi"
    }
    return ""
  }

  const isTaskDueToday = (task) => {
    const today = getLocalDateString(new Date())
    if (task.dueType === "today") return true
    if (task.dueType === "date") return task.dueDate === today
    if (task.dueType === "repeat") {
      const dayValue = String(new Date().getDay())
      return normalizeRepeatDays(task.repeatDays).includes(dayValue)
    }
    return false
  }

  const openNoteModal = (value, onSave) => {
    setNoteModalDraft(value ?? "")
    noteModalTargetRef.current = onSave
    setIsNoteModalOpen(true)
  }

  const handleNoteModalSave = () => {
    if (noteModalTargetRef.current) {
      noteModalTargetRef.current(noteModalDraft)
    }
    noteModalTargetRef.current = null
    setIsNoteModalOpen(false)
  }

  const handleNoteModalClose = () => {
    noteModalTargetRef.current = null
    setIsNoteModalOpen(false)
  }

  const noteModalLineCount = useMemo(() => {
    const count = noteModalDraft.split("\n").length
    return Math.max(1, count)
  }, [noteModalDraft])

  const handleNoteScroll = (event) => {
    if (!noteLineRef.current) return
    noteLineRef.current.scrollTop = event.target.scrollTop
  }

  const stockModalLineCount = useMemo(() => {
    const count = stockModalDraft.split("\n").length
    return Math.max(1, count)
  }, [stockModalDraft])

  const handleStockModalScroll = (event) => {
    if (!stockModalLineRef.current) return
    stockModalLineRef.current.scrollTop = event.target.scrollTop
  }

  const detailNoteText = taskDetailTarget?.note || ""
  const detailNoteLineCount = useMemo(() => {
    const count = detailNoteText.split("\n").length
    return Math.max(1, count)
  }, [detailNoteText])

  const handleDetailNoteScroll = (event) => {
    if (!detailNoteLineRef.current) return
    detailNoteLineRef.current.scrollTop = event.target.scrollTop
  }

  const openTaskDetail = (task) => {
    setTaskDetailTarget(task)
  }

  const closeTaskDetail = () => {
    setTaskDetailTarget(null)
  }

  const openTaskEdit = (task) => {
    const normalized = normalizeTask(task)
    setTaskEditDraft({
      id: normalized.id,
      title: normalized.title ?? "",
      note: normalized.note ?? "",
      owner: normalized.owner ?? "",
      dueType: normalized.dueType ?? "today",
      repeatDays: normalized.repeatDays ?? [],
      dueDate: normalized.dueDate ?? "",
    })
    setIsTaskEditOpen(true)
  }

  const closeTaskEdit = () => {
    setIsTaskEditOpen(false)
    setTaskEditDraft(null)
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      note: "",
      owner: "",
      dueType: "today",
      repeatDays: ["1"],
      dueDate: "",
    })
  }

  const toggleRepeatDay = (value, setState) => {
    setState((prev) => {
      if (!prev) return prev
      const current = Array.isArray(prev.repeatDays) ? prev.repeatDays : []
      const next = current.includes(value) ? current.filter((day) => day !== value) : [...current, value]
      return { ...prev, repeatDays: next }
    })
  }

  const saveTaskUpdate = async (taskId, updates) => {
    if (!isAuthed) return null
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("task_update_failed")
      const updated = await res.json()
      const normalized = normalizeTask(updated)
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? normalized
            : task,
        ),
      )
      return updated
    } catch (error) {
      console.error(error)
      toast.error("G├Ârev g├╝ncellenemedi (API/DB kontrol edin).")
      return null
    }
  }

  const handleTaskAdd = async () => {
    const titleValue = taskForm.title.trim()
    if (!titleValue) {
      toast.error("G├Ârev ad─▒ gerekli.")
      return
    }
    const repeatDays = normalizeRepeatDays(taskForm.repeatDays)
    if (taskForm.dueType === "repeat" && repeatDays.length === 0) {
      toast.error("Tekrarlanabilir g├╝n se├ğin.")
      return
    }
    if (taskForm.dueType === "date" && !taskForm.dueDate) {
      toast.error("├ûzel tarih se├ğin.")
      return
    }
    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleValue,
          note: taskForm.note.trim(),
          owner: taskForm.owner.trim(),
          dueType: taskForm.dueType,
          repeatDays: taskForm.dueType === "repeat" ? repeatDays : [],
          dueDate: taskForm.dueType === "date" ? taskForm.dueDate : "",
        }),
      })
      if (!res.ok) throw new Error("task_create_failed")
      const created = await res.json()
      setTasks((prev) => [normalizeTask(created), ...prev])
      resetTaskForm()
      toast.success("G├Ârev eklendi")
    } catch (error) {
      console.error(error)
      toast.error("G├Ârev eklenemedi (API/DB kontrol edin).")
    }
  }

  const handleTaskEditSave = async () => {
    if (!taskEditDraft) return
    const titleValue = taskEditDraft.title.trim()
    if (!titleValue) {
      toast.error("G├Ârev ad─▒ gerekli.")
      return
    }
    const repeatDays = normalizeRepeatDays(taskEditDraft.repeatDays)
    if (taskEditDraft.dueType === "repeat" && repeatDays.length === 0) {
      toast.error("Tekrarlanabilir g├╝n se├ğin.")
      return
    }
    if (taskEditDraft.dueType === "date" && !taskEditDraft.dueDate) {
      toast.error("├ûzel tarih se├ğin.")
      return
    }
    const updated = await saveTaskUpdate(taskEditDraft.id, {
      title: titleValue,
      note: taskEditDraft.note.trim(),
      owner: taskEditDraft.owner.trim(),
      dueType: taskEditDraft.dueType,
      repeatDays: taskEditDraft.dueType === "repeat" ? repeatDays : [],
      dueDate: taskEditDraft.dueType === "date" ? taskEditDraft.dueDate : null,
    })
    if (!updated) return
    closeTaskEdit()
    toast.success("G├Ârev g├╝ncellendi")
  }

  const handleTaskAdvance = async (taskId) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    if (task.status === "todo") {
      await saveTaskUpdate(taskId, { status: "doing" })
      return
    }
    if (task.status === "doing") {
      if (task.dueType === "repeat") {
        const tomorrow = getLocalDateString(addDays(new Date(), 1))
        await saveTaskUpdate(taskId, { status: "done", repeatWakeAt: tomorrow })
        return
      }
      await saveTaskUpdate(taskId, { status: "done", repeatWakeAt: null })
    }
  }

  const handleTaskReopen = async (taskId) => {
    await saveTaskUpdate(taskId, { status: "todo", repeatWakeAt: null })
  }

  const handleTaskDeleteWithConfirm = async (taskId) => {
    if (confirmTaskDelete === taskId) {
      try {
        const res = await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 404) throw new Error("task_delete_failed")
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
        setConfirmTaskDelete(null)
        toast.success("G├Ârev silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("G├Ârev silinemedi (API/DB kontrol edin).")
        setConfirmTaskDelete(null)
        return
      }
    }
    setConfirmTaskDelete(taskId)
    toast("Silmek i├ğin tekrar t─▒kla", { position: "top-right" })
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

  const handleTaskDrop = async (event, status) => {
    event.preventDefault()
    const taskId = taskDragState.activeId || event.dataTransfer.getData("text/plain")
    if (!taskId) {
      setTaskDragState({ activeId: null, overStatus: null })
      return
    }
    await saveTaskUpdate(taskId, { status })
    setTaskDragState({ activeId: null, overStatus: null })
  }
  const handleTaskDragEnd = () => {
    setTaskDragState({ activeId: null, overStatus: null })
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    if (isAuthChecking || isAuthLoading) return
    const username = authUsername.trim()
    const password = authPassword.trim()
    if (!username || !password) {
      setAuthError("Kullanici adi ve sifre gerekli")
      return
    }

    setAuthError("")
    setIsAuthLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        setAuthError("Bilgiler hatali")
        return
      }

      const data = await res.json()
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
      setActiveUser(data?.user ?? null)
      setAuthUsername("")
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
    setActiveUser(null)
    setAuthUsername("")
    setAuthPassword("")
    setAuthError("")
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    } catch (error) {
      console.warn("Could not clear auth token", error)
    }
  }

  const resetRoleDraft = () => setRoleDraft({ id: null, name: "", permissions: [] })
  const resetUserDraft = () => setUserDraft({ id: null, username: "", password: "", roleId: "" })

  const handleRoleEditStart = (role) => {
    setRoleDraft({
      id: role?.id ?? null,
      name: role?.name ?? "",
      permissions: Array.isArray(role?.permissions) ? role.permissions : [],
    })
  }

  const handleRoleEditCancel = () => {
    resetRoleDraft()
    setConfirmRoleDelete(null)
  }

  const toggleRolePermission = (permission) => {
    setRoleDraft((prev) => {
      const next = new Set(prev.permissions || [])
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return { ...prev, permissions: Array.from(next) }
    })
  }

  const handleRoleSave = async () => {
    const name = roleDraft.name.trim()
    if (!name) {
      toast.error("Rol adi gerekli.")
      return
    }
    try {
      const res = await apiFetch(roleDraft.id ? `/api/roles/${roleDraft.id}` : "/api/roles", {
        method: roleDraft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions: roleDraft.permissions }),
      })
      if (!res.ok) throw new Error("role_save_failed")
      const saved = await res.json()
      setRoles((prev) =>
        roleDraft.id
          ? prev.map((role) => (role.id === saved.id ? saved : role))
          : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)),
      )
      resetRoleDraft()
      toast.success(roleDraft.id ? "Rol guncellendi" : "Rol eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Rol kaydedilemedi (API/DB kontrol edin).")
    }
  }

  const handleRoleDeleteWithConfirm = async (roleId) => {
    if (confirmRoleDelete === roleId) {
      try {
        const res = await apiFetch(`/api/roles/${roleId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 204) throw new Error("role_delete_failed")
        setRoles((prev) => prev.filter((role) => role.id !== roleId))
        setConfirmRoleDelete(null)
        toast.success("Rol silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Rol silinemedi (API/DB kontrol edin).")
        setConfirmRoleDelete(null)
        return
      }
    }
    setConfirmRoleDelete(roleId)
    toast("Silmek icin tekrar tikla", { position: "top-right" })
  }

  const handleUserEditStart = (user) => {
    setUserDraft({
      id: user?.id ?? null,
      username: user?.username ?? "",
      password: "",
      roleId: user?.role?.id ? String(user.role.id) : "",
    })
  }

  const handleUserEditCancel = () => {
    resetUserDraft()
    setConfirmUserDelete(null)
  }

  const handleUserSave = async () => {
    const username = userDraft.username.trim()
    if (!username) {
      toast.error("Kullanici adi gerekli.")
      return
    }
    if (!userDraft.id && !userDraft.password.trim()) {
      toast.error("Sifre gerekli.")
      return
    }

    const roleId = userDraft.roleId ? Number(userDraft.roleId) : null
    if (userDraft.roleId && !Number.isFinite(roleId)) {
      toast.error("Rol secimi hatali.")
      return
    }

    const payload = {
      username,
      ...(roleId === null ? { roleId: null } : { roleId }),
      ...(userDraft.password.trim() ? { password: userDraft.password.trim() } : {}),
    }

    try {
      const res = await apiFetch(userDraft.id ? `/api/users/${userDraft.id}` : "/api/users", {
        method: userDraft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("user_save_failed")
      const saved = await res.json()
      setUsers((prev) =>
        userDraft.id ? prev.map((user) => (user.id === saved.id ? saved : user)) : [...prev, saved],
      )
      if (activeUser?.id === saved.id) {
        setActiveUser(saved)
      }
      resetUserDraft()
      toast.success(userDraft.id ? "Kullanici guncellendi" : "Kullanici eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Kullanici kaydedilemedi (API/DB kontrol edin).")
    }
  }

  const handleUserDeleteWithConfirm = async (userId) => {
    if (confirmUserDelete === userId) {
      try {
        const res = await apiFetch(`/api/users/${userId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 204) throw new Error("user_delete_failed")
        setUsers((prev) => prev.filter((user) => user.id !== userId))
        setConfirmUserDelete(null)
        toast.success("Kullanici silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Kullanici silinemedi (API/DB kontrol edin).")
        setConfirmUserDelete(null)
        return
      }
    }
    setConfirmUserDelete(userId)
    toast("Silmek icin tekrar tikla", { position: "top-right" })
  }

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  const handleDragStart = (event, productId) => {
    if (isStockTextSelectingRef.current) {
      event.preventDefault()
      return
    }
    if (event.target.closest('[data-no-drag="true"]')) {
      event.preventDefault()
      return
    }
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

  const loadProblems = useCallback(
    async (signal) => {
      setIsProblemsLoading(true)
      try {
        const res = await apiFetch("/api/problems", { signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setProblems(data ?? [])
      } catch (error) {
        if (error?.name === "AbortError") return
        setProblems(initialProblems)
        toast.error("Problem listesi al─▒namad─▒ (API/DB kontrol edin)")
      } finally {
        setIsProblemsLoading(false)
      }
    },
    [apiFetch],
  )

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    loadProblems(controller.signal)
    return () => controller.abort()
  }, [isAuthed, loadProblems])

  useEffect(() => {
    if (!isAuthed || activeTab !== "problems") return
    const controller = new AbortController()
    loadProblems(controller.signal)
    return () => controller.abort()
  }, [activeTab, isAuthed, loadProblems])

  const loadProducts = useCallback(
    async (signal) => {
      setIsProductsLoading(true)
      try {
        const res = await apiFetch("/api/products", { signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setProducts(data ?? [])
      } catch (error) {
        if (error?.name === "AbortError") return
        setProducts(initialProducts)
        toast.error("Stok listesi al─▒namad─▒ (API/DB kontrol edin)")
      } finally {
        setIsProductsLoading(false)
      }
    },
    [apiFetch],
  )

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    loadProducts(controller.signal)
    return () => controller.abort()
  }, [isAuthed, loadProducts])

  useEffect(() => {
    if (!isAuthed || activeTab !== "stock") return
    const controller = new AbortController()
    loadProducts(controller.signal)
    return () => controller.abort()
  }, [activeTab, isAuthed, loadProducts])

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayDone(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  const loadTemplates = useCallback(
    async (signal) => {
      const startedAt = Date.now()
      if (templateLoadTimerRef.current) {
        window.clearTimeout(templateLoadTimerRef.current)
        templateLoadTimerRef.current = null
      }

      setIsLoading(true)

      try {
        const [catsRes, templatesRes] = await Promise.all([
          apiFetch("/api/categories", { signal }),
          apiFetch("/api/templates", { signal }),
        ])

        if (!catsRes.ok || !templatesRes.ok) throw new Error("api_error")

        const serverCategories = await catsRes.json()
        const serverTemplates = await templatesRes.json()

        const safeCategories = Array.from(new Set(["Genel", ...(serverCategories ?? [])]))
        setCategories(safeCategories)
        setTemplates(serverTemplates ?? [])

        setSelectedTemplate((prev) => {
          if (prev && (serverTemplates ?? []).some((tpl) => tpl.label === prev)) return prev
          return serverTemplates?.[0]?.label ?? null
        })
        setSelectedCategory((prev) => {
          if (prev && safeCategories.includes(prev)) return prev
          return serverTemplates?.[0]?.category || safeCategories[0] || "Genel"
        })
      } catch (error) {
        if (error?.name === "AbortError") return
        setCategories(fallbackCategories)
        setTemplates(fallbackTemplates)
        setSelectedTemplate(fallbackTemplates[0]?.label ?? null)
        setSelectedCategory(fallbackTemplates[0]?.category ?? "Genel")
        toast.error("Sunucuya ba─şlan─▒lamad─▒. (API/DB kontrol edin)")
      } finally {
        const elapsed = Date.now() - startedAt
        const delay = Math.max(0, 600 - elapsed)
        templateLoadTimerRef.current = window.setTimeout(() => setIsLoading(false), delay)
      }
    },
    [apiFetch],
  )

  useEffect(() => {
    if (!isAuthed) return
    const controller = new AbortController()
    loadTemplates(controller.signal)
    return () => {
      controller.abort()
      if (templateLoadTimerRef.current) {
        window.clearTimeout(templateLoadTimerRef.current)
        templateLoadTimerRef.current = null
      }
    }
  }, [isAuthed, loadTemplates])

  useEffect(() => {
    if (!isAuthed || activeTab !== "messages") return
    const controller = new AbortController()
    loadTemplates(controller.signal)
    return () => {
      controller.abort()
      if (templateLoadTimerRef.current) {
        window.clearTimeout(templateLoadTimerRef.current)
        templateLoadTimerRef.current = null
      }
    }
  }, [activeTab, isAuthed, loadTemplates])

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
        toast.success("┼Şablon kopyaland─▒", { duration: 1600, position: "top-right" })
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
        toast.error("Kopyalanamad─▒", { duration: 1600, position: "top-right" })
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
      toast.error("Mesaj bo┼ş olamaz.")
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
      toast.success("┼Şablon g├╝ncellendi")
    } catch (error) {
      console.error(error)
      toast.error("┼Şablon g├╝ncellenemedi (API/DB kontrol edin).")
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
        toast("Var olan ┼şablon aktif edildi", { position: "top-right" })
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
      toast.success("Yeni ┼şablon eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Kaydedilemedi (API/DB kontrol edin).")
    }
  }

  const handleDeleteTemplate = async (targetLabel = selectedTemplate) => {
    if (templates.length <= 1) {
      toast.error("En az bir ┼şablon kalmal─▒.")
      return
    }
    const target = templates.find((tpl) => tpl.label === targetLabel)
    const targetId = target?.id
    if (!targetId) {
      toast.error("Silinecek ┼şablon bulunamad─▒.")
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
      toast.success("┼Şablon silindi")
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
    toast("Silmek i├ğin tekrar t─▒kla", { position: "top-right" })
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
    toast("Silmek i├ğin tekrar t─▒kla", { position: "top-right" })
  }

  const updateListById = (listId, updater) => {
    if (!listId) return
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list
        return updater(list)
      }),
    )
  }

  const handleListSave = async (targetList) => {
    if (!targetList || !isAuthed || isListSaving) return
    const listPayload = {
      id: targetList.id,
      name: targetList.name,
      rows: Array.isArray(targetList.rows) ? targetList.rows : [],
    }
    setIsListSaving(true)
    try {
      const res = await apiFetch(`/api/lists/${listPayload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listPayload.name, rows: listPayload.rows }),
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

  const handleListSaveNow = async () => {
    if (!activeList) return
    await handleListSave(activeList)
  }

  const scheduleListAutoSave = useCallback(
    (list) => {
      if (!list || !isAuthed) return
      if (listAutoSaveTimer.current) {
        window.clearTimeout(listAutoSaveTimer.current)
      }
      listAutoSaveTimer.current = window.setTimeout(() => {
        handleListSave(list)
      }, LIST_AUTO_SAVE_DELAY_MS)
    },
    [handleListSave, isAuthed],
  )

  const handleListCreate = async () => {
    const name = listName.trim()
    if (!name) {
      toast.error("Liste ad─▒ girin.")
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
      toast.success("Liste olu┼şturuldu")
    } catch (error) {
      console.error(error)
      toast.error("Liste olu┼şturulamad─▒ (API/DB kontrol edin).")
    }
  }

  const handleListRename = () => {
    if (!activeList) return
    const name = listRenameDraft.trim()
    if (!name) {
      toast.error("Liste ad─▒ bo┼ş olamaz.")
      return
    }
    if (name === activeList.name) return
    updateListById(activeList.id, (list) => ({ ...list, name }))
    toast.success("Liste ad─▒ g├╝ncellendi")
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
    const rows = activeListRows.map((row, rIndex) => {
      if (rIndex !== rowIndex) return row
      const nextRow = [...row]
      while (nextRow.length <= colIndex) nextRow.push("")
      nextRow[colIndex] = updateListCellValue(nextRow[colIndex], value)
      return nextRow
    })
    const nextList = { ...activeList, rows }
    updateListById(activeList.id, () => nextList)
    scheduleListAutoSave(nextList)
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
    const baseRows = Array.isArray(activeListRows) ? activeListRows : []
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
    const nextList = { ...activeList, rows }
    updateListById(activeList.id, () => nextList)
    scheduleListAutoSave(nextList)
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

  const showLoading = isLoading || !delayDone || (activeTab === "messages" && isTabLoading)
  const isTasksTabLoading = isTasksLoading || (activeTab === "tasks" && isTabLoading)
  const isListsTabLoading = isListsLoading || (activeTab === "lists" && isTabLoading)
  const isStockTabLoading = isProductsLoading || (activeTab === "stock" && isTabLoading)
  const isProblemsTabLoading = isProblemsLoading || (activeTab === "problems" && isTabLoading)
  const isAdminTabLoading = isAdminLoading || (activeTab === "admin" && isTabLoading)

  const toastStyle = isLight
    ? { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }
    : { background: "#0f1625", color: "#e5ecff", border: "1px solid #1d2534" }

  const toastIconTheme = isLight
    ? { primary: "#2563eb", secondary: "#ffffff" }
    : { primary: "#3ac7ff", secondary: "#0f1625" }
  const templateCountText = showLoading ? <LoadingIndicator label="Yükleniyor" /> : templates.length
  const categoryCountText = showLoading ? <LoadingIndicator label="Yükleniyor" /> : categories.length
  const selectedCategoryText = showLoading ? <LoadingIndicator label="Yükleniyor" /> : selectedCategory.trim() || "Genel"
  const listCountText = isListsTabLoading ? <LoadingIndicator label="Yükleniyor" /> : lists.length
  const taskCountText = isTasksTabLoading ? <LoadingIndicator label="Yükleniyor" /> : taskStats.total

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
      toast.error("├£r├╝n ismi bo┼ş olamaz.")
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
      toast.success("├£r├╝n eklendi")
    } catch (error) {
      console.error(error)
      toast.error("├£r├╝n eklenemedi (API/DB kontrol edin).")
    }
  }

  const handleStockAdd = async () => {
    const productId = stockForm.productId
    const normalizedCode = stockForm.code.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const codes = normalizedCode.split("\n").map((line) => line.trim()).filter(Boolean)
    if (!productId) {
      toast.error("├£r├╝n se├ğin.")
      return
    }
    if (codes.length === 0) {
      toast.error("Anahtar kodu bo┼ş olamaz.")
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

  const openStockModal = (product) => {
    setStockModalTarget(product)
    setStockModalDraft("")
    setIsStockModalOpen(true)
  }

  const handleStockModalClose = () => {
    setIsStockModalOpen(false)
    setStockModalTarget(null)
  }

  const handleStockModalSave = async () => {
    if (!stockModalTarget) return
    const productId = stockModalTarget.id
    const normalized = stockModalDraft.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const codes = normalized.split("\n").map((line) => line.trim()).filter(Boolean)
    if (!productId) {
      toast.error("├£r├╝n se├ğin.")
      return
    }
    if (codes.length === 0) {
      toast.error("Anahtar kodu bo┼ş olamaz.")
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
      setStockModalDraft("")
      setIsStockModalOpen(false)
      setStockModalTarget(null)
      toast.success(codes.length + " stok eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Stok eklenemedi (API/DB kontrol edin).")
    }
  }
  const handleBulkCopyAndDelete = async (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const availableStocks = splitStocks(product.stocks).available
    const rawCount = bulkCount[productId]
    const count = Math.max(
      1,
      Number(rawCount ?? availableStocks.length) || availableStocks.length,
    )
    const codes = availableStocks.slice(0, count).map((stk) => stk.code)
    const removed = availableStocks.slice(0, count)
    if (codes.length === 0) {
      toast.error("Bu ├╝r├╝nde kopyalanacak stok yok.")
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
      toast.success(`${codes.length} stok kopyaland─▒ ve silindi`, { duration: 1800, position: "top-right" })
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
        toast.success("├£r├╝n ve stoklar─▒ silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Silinemedi (API/DB kontrol edin).")
        setConfirmProductTarget(null)
        return
      }
    }
    setConfirmProductTarget(productId)
    toast("Silmek i├ğin tekrar t─▒kla", { position: "top-right" })
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
      toast.error("─░sim bo┼ş olamaz.")
      return
    }
    const templateValue = selectedTemplate
      ? templates.find((tpl) => tpl.label === selectedTemplate)?.value
      : ""
    const hasTemplate = Boolean(selectedTemplate && templateValue)

    try {
      const res = await apiFetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          note: hasTemplate ? selectedTemplate : null,
          deliveryTemplate: hasTemplate ? selectedTemplate : null,
          deliveryMessage: hasTemplate ? templateValue : null,
        }),
      })
      if (!res.ok) throw new Error("product_update_failed")
      const updated = await res.json()
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)))
      handleEditCancel(productId)
      toast.success("├£r├╝n g├╝ncellendi")
    } catch (error) {
      console.error(error)
      toast.error("├£r├╝n g├╝ncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleStockEditStart = (stockId, code) => {
    setEditingStocks((prev) => ({ ...prev, [stockId]: code ?? "" }))
  }

  const handleStockEditChange = (stockId, value) => {
    setEditingStocks((prev) => ({ ...prev, [stockId]: value }))
  }

  const handleStockEditCancel = (stockId) => {
    setEditingStocks((prev) => {
      const next = { ...prev }
      delete next[stockId]
      return next
    })
  }

  const handleStockEditSave = async (productId, stockId) => {
    if (savingStocks[stockId]) return
    const draft = editingStocks[stockId]
    const code = draft?.trim()
    if (!code) {
      toast.error("Stok kodu bo┼ş olamaz.")
      return
    }

    const product = products.find((item) => item.id === productId)
    const existing = product?.stocks.find((stk) => stk.id === stockId)
    if (!existing) {
      toast.error("Stok bulunamad─▒.")
      handleStockEditCancel(stockId)
      return
    }
    if (existing.code === code) {
      handleStockEditCancel(stockId)
      return
    }

    setSavingStocks((prev) => ({ ...prev, [stockId]: true }))
    try {
      const res = await apiFetch(`/api/stocks/${stockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) throw new Error("stock_update_failed")
      const updated = await res.json()
      setProducts((prev) =>
        prev.map((item) =>
          item.id === productId
            ? {
              ...item,
              stocks: item.stocks.map((stk) => (stk.id === stockId ? { ...stk, ...updated } : stk)),
            }
            : item,
        ),
      )
      handleStockEditCancel(stockId)
      toast.success("Stok g├╝ncellendi")
    } catch (error) {
      console.error(error)
      toast.error("Stok g├╝ncellenemedi (API/DB kontrol edin).")
    } finally {
      setSavingStocks((prev) => {
        const next = { ...prev }
        delete next[stockId]
        return next
      })
    }
  }

  const handleUndoDelete = async () => {
    if (!lastDeleted) {
      toast.error("Geri al─▒nacak kay─▒t yok.")
      return
    }
    const { productId, stocks } = lastDeleted
    const codes = stocks.map((stk) => stk.code).filter(Boolean)
    if (codes.length === 0) {
      toast.error("Geri al─▒nacak stok bulunamad─▒.")
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
      toast.success("Silinen kay─▒t geri al─▒nd─▒", { duration: 1400, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Geri al─▒namad─▒ (API/DB kontrol edin).")
    }
  }
  const handleProductCopyMessage = async (productId) => {
    const product = products.find((p) => p.id === productId)
    const message = product?.deliveryMessage?.trim()
    if (!message) {
      toast.error("Bu ├╝r├╝ne teslimat mesaj─▒ eklenmemi┼ş.")
      return
    }
    try {
      await navigator.clipboard.writeText(message)
      toast.success("Teslimat mesaj─▒ kopyaland─▒", { duration: 1500, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamad─▒")
    }
  }

  const handleBulkCopyAndMarkUsed = async (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const availableStocks = splitStocks(product.stocks).available
    const rawCount = bulkCount[productId]
    const count = Math.max(
      1,
      Number(rawCount ?? availableStocks.length) || availableStocks.length,
    )
    const selected = availableStocks.slice(0, count)
    const codes = selected.map((stk) => stk.code)
    if (codes.length === 0) {
      toast.error("Bu ├╝r├╝nde kullan─▒lacak stok yok.")
      return
    }

    const joined = codes.join("\n")
    try {
      await navigator.clipboard.writeText(joined)
      const responses = await Promise.all(
        selected.map((stk) =>
          apiFetch(`/api/stocks/${stk.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: STOCK_STATUS.used }),
          }),
        ),
      )
      const succeededIds = new Set()
      responses.forEach((res, index) => {
        if (res.ok) succeededIds.add(selected[index].id)
      })
      if (succeededIds.size === 0) throw new Error("stock_bulk_use_failed")
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
              ...p,
              stocks: p.stocks.map((stk) =>
                succeededIds.has(stk.id) ? { ...stk, status: STOCK_STATUS.used } : stk,
              ),
            }
            : p,
        ),
      )
      const failedCount = selected.length - succeededIds.size
      if (failedCount > 0) {
        toast.error(`${failedCount} stok g├╝ncellenemedi`, { duration: 1800, position: "top-right" })
      }
      toast.success(`${succeededIds.size} stok kopyaland─▒ ve kullan─▒ld─▒`, {
        duration: 1800,
        position: "top-right",
      })
    } catch (error) {
      console.error(error)
      toast.error("Stoklar g├╝ncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleStockStatusUpdate = async (productId, stockId, nextStatus) => {
    const status =
      nextStatus === STOCK_STATUS.used ? STOCK_STATUS.used : STOCK_STATUS.available
    const shouldAnimate = status === STOCK_STATUS.used
    if (shouldAnimate) {
      setUsingStocks((prev) => ({ ...prev, [stockId]: true }))
    }
    try {
      const res = await apiFetch(`/api/stocks/${stockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("stock_status_update_failed")
      const updated = await res.json()
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
              ...product,
              stocks: product.stocks.map((stk) =>
                stk.id === stockId ? { ...stk, ...updated } : stk,
              ),
            }
            : product,
        ),
      )
      if (shouldAnimate) {
        window.setTimeout(() => {
          setUsingStocks((prev) => {
            const next = { ...prev }
            delete next[stockId]
            return next
          })
        }, 320)
      }
      toast.success(status === STOCK_STATUS.used ? "Stok kullan─▒ld─▒" : "Stok geri al─▒nd─▒", {
        duration: 1400,
        position: "top-right",
      })
    } catch (error) {
      console.error(error)
      if (shouldAnimate) {
        setUsingStocks((prev) => {
          const next = { ...prev }
          delete next[stockId]
          return next
        })
      }
      toast.error("Stok g├╝ncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleUsedBulkDelete = async (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const usedStocks = splitStocks(product.stocks).used
    const rawCount = usedBulkCount[productId]
    const count = Math.max(1, Number(rawCount ?? usedStocks.length) || usedStocks.length)
    const removed = usedStocks.slice(0, count)
    if (removed.length === 0) {
      toast.error("Bu ├╝r├╝nde silinecek kullan─▒lm─▒┼ş stok yok.")
      return
    }

    try {
      const res = await apiFetch("/api/stocks/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: removed.map((stk) => stk.id) }),
      })
      if (!res.ok) throw new Error("stock_bulk_delete_failed")

      const removedIds = new Set(removed.map((stk) => stk.id))
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, stocks: p.stocks.filter((stk) => !removedIds.has(stk.id)) }
            : p,
        ),
      )
      setUsedBulkCount((prev) => ({ ...prev, [productId]: "" }))
      toast.success(`${removed.length} kullan─▒lm─▒┼ş stok silindi`, {
        duration: 1800,
        position: "top-right",
      })
    } catch (error) {
      console.error(error)
      toast.error("Stoklar silinemedi (API/DB kontrol edin).")
    }
  }

  const handleStockDeleteWithConfirm = async (productId, stockId) => {
    const key = `${productId}-${stockId}`
    if (confirmStockTarget === key) {
      const targetProduct = products.find((p) => p.id === productId)
      const removed = targetProduct?.stocks.find((stk) => stk.id === stockId)
      const nextHighlightId = (() => {
        if (!targetProduct || !removed) return ""
        const { available, used } = splitStocks(targetProduct.stocks)
        const list = getStockStatus(removed) === STOCK_STATUS.used ? used : available
        const index = list.findIndex((stk) => stk.id === removed.id)
        if (index === -1) return ""
        return list[index + 1]?.id || list[index - 1]?.id || ""
      })()

      try {
        const res = await apiFetch(`/api/stocks/${stockId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 404) throw new Error("stock_delete_failed")

        if (nextHighlightId) {
          setHighlightStocks((prev) => ({ ...prev, [nextHighlightId]: true }))
          window.setTimeout(() => {
            setHighlightStocks((prev) => {
              const next = { ...prev }
              delete next[nextHighlightId]
              return next
            })
          }, 700)
        }
        setDeletingStocks((prev) => ({ ...prev, [stockId]: true }))
        window.setTimeout(() => {
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
          setDeletingStocks((prev) => {
            const next = { ...prev }
            delete next[stockId]
            return next
          })
          setEditingStocks((prev) => {
            const next = { ...prev }
            delete next[stockId]
            return next
          })
          setSavingStocks((prev) => {
            const next = { ...prev }
            delete next[stockId]
            return next
          })
          setConfirmStockTarget(null)
        }, 180)
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
    toast("Silmek i├ğin tekrar t─▒kla", { position: "top-right" })
  }
  const handleStockCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Anahtar kopyaland─▒", { duration: 1500, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamad─▒", { duration: 1500, position: "top-right" })
    }
  }

  const handleProblemAdd = async () => {
    const user = problemUsername.trim()
    const issue = problemIssue.trim()
    if (!user || !issue) {
      toast.error("Kullan─▒c─▒ ad─▒ ve sorun girin.")
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
      toast.success("Problem ├ğ├Âz├╝ld├╝")
    } catch (error) {
      console.error(error)
      toast.error("G├╝ncellenemedi (API/DB kontrol edin).")
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
      toast.success("Aktif probleme ta┼ş─▒nd─▒")
    } catch (error) {
      console.error(error)
      toast.error("G├╝ncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Kullan─▒c─▒ ad─▒ kopyaland─▒", { duration: 1400, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamad─▒", { duration: 1600, position: "top-right" })
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
    toast("Silmek i├ğin tekrar t─▒kla", { position: "top-right" })
  }

  const openProblems = problems.filter((p) => p.status !== "resolved")
  const resolvedProblems = problems.filter((p) => p.status === "resolved")

  return {
    isAuthChecking,
    isAuthed,
    isAuthBusy,
    activeUser,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
    handleAuthSubmit,
    logoutButton,
    themeToggleButton,
    permissions,
    hasPermission,
    canManageAdmin,
    toastStyle,
    toastIconTheme,
    activeTab,
    setActiveTab,
    showLoading,
    panelClass,
    templateCountText,
    categoryCountText,
    selectedCategoryText,
    activeTemplate,
    selectedCategory,
    getCategoryClass,
    isEditingActiveTemplate,
    handleActiveTemplateEditCancel,
    handleActiveTemplateEditStart,
    handleDeleteWithConfirm,
    confirmTarget,
    selectedTemplate,
    isTemplateSaving,
    activeTemplateDraft,
    setActiveTemplateDraft,
    activeTemplateLength,
    handleActiveTemplateEditSave,
    categories,
    groupedTemplates,
    openCategories,
    setOpenCategories,
    handleTemplateChange,
    newCategory,
    setNewCategory,
    handleCategoryAdd,
    confirmCategoryTarget,
    handleCategoryDeleteWithConfirm,
    title,
    setTitle,
    messageLength,
    message,
    setMessage,
    handleAdd,
    setSelectedCategory,
    isTasksTabLoading,
    taskCountText,
    taskStats,
    taskStatusMeta,
    taskGroups,
    taskDragState,
    setTaskDragState,
    handleTaskDragOver,
    handleTaskDrop,
    handleTaskDragStart,
    handleTaskDragEnd,
    isTaskDueToday,
    getTaskDueLabel,
    handleTaskAdvance,
    openTaskDetail,
    openTaskEdit,
    handleTaskReopen,
    handleTaskDeleteWithConfirm,
    confirmTaskDelete,
    taskForm,
    setTaskForm,
    openNoteModal,
    taskDueTypeOptions,
    taskFormRepeatLabels,
    taskRepeatDays,
    normalizeRepeatDays,
    toggleRepeatDay,
    handleTaskAdd,
    resetTaskForm,
    focusTask,
    isListsTabLoading,
    listCountText,
    activeList,
    activeListId,
    lists,
    DEFAULT_LIST_COLS,
    handleListSelect,
    listSavedAt,
    selectedListRows,
    selectedListCols,
    handleListDeleteSelectedRows,
    handleListDeleteSelectedColumns,
    handleListSaveNow,
    isListSaving,
    activeListColumnLabels,
    handleListColumnSelect,
    handleListContextMenu,
    handleListRowSelect,
    selectedListCell,
    activeListRows,
    activeListColumns,
    getListCellData,
    editingListCell,
    setEditingListCell,
    setSelectedListCell,
    getListCellDisplayValue,
    LIST_CELL_TONE_CLASSES,
    handleListCellChange,
    handleListPaste,
    listName,
    setListName,
    handleListCreate,
    listRenameDraft,
    setListRenameDraft,
    handleListRename,
    confirmListDelete,
    setConfirmListDelete,
    handleListDelete,
    canDeleteListRow,
    canDeleteListColumn,
    listContextMenu,
    handleListInsertRow,
    handleListContextMenuClose,
    handleListDeleteRow,
    handleListInsertColumn,
    handleListDeleteColumn,
    isStockTabLoading,
    stockSummary,
    products,
    productSearch,
    setProductSearch,
    filteredProducts,
    splitStocks,
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    lastDeleted,
    handleUndoDelete,
    openStockModal,
    openProducts,
    toggleProductOpen,
    templates,
    handleProductCopyMessage,
    editingProduct,
    handleEditStart,
    handleEditChange,
    handleEditSave,
    handleEditCancel,
    confirmProductTarget,
    confirmStockTarget,
    handleProductDeleteWithConfirm,
    bulkCount,
    setBulkCount,
    handleBulkCopyAndMarkUsed,
    handleBulkCopyAndDelete,
    deletingStocks,
    usingStocks,
    highlightStocks,
    isStockTextSelectingRef,
    editingStocks,
    savingStocks,
    handleStockEditChange,
    handleStockEditSave,
    handleStockEditCancel,
    handleStockCopy,
    handleStockEditStart,
    handleStockStatusUpdate,
    handleStockDeleteWithConfirm,
    STOCK_STATUS,
    usedBulkCount,
    setUsedBulkCount,
    handleUsedBulkDelete,
    productForm,
    setProductForm,
    handleProductAdd,
    stockForm,
    setStockForm,
    handleStockAdd,
    resetStockForm,
    isProblemsTabLoading,
    openProblems,
    resolvedProblems,
    problems,
    handleProblemCopy,
    handleProblemResolve,
    handleProblemDeleteWithConfirm,
    confirmProblemTarget,
    handleProblemReopen,
    problemUsername,
    setProblemUsername,
    problemIssue,
    setProblemIssue,
    handleProblemAdd,
    roles,
    users,
    isAdminLoading,
    isAdminTabLoading,
    roleDraft,
    setRoleDraft,
    userDraft,
    setUserDraft,
    confirmRoleDelete,
    confirmUserDelete,
    handleRoleEditStart,
    handleRoleEditCancel,
    toggleRolePermission,
    handleRoleSave,
    handleRoleDeleteWithConfirm,
    handleUserEditStart,
    handleUserEditCancel,
    handleUserSave,
    handleUserDeleteWithConfirm,
    isTaskEditOpen,
    taskEditDraft,
    setTaskEditDraft,
    closeTaskEdit,
    handleTaskEditSave,
    taskEditRepeatLabels,
    isNoteModalOpen,
    handleNoteModalClose,
    noteModalDraft,
    noteLineRef,
    noteModalLineCount,
    noteTextareaRef,
    handleNoteScroll,
    setNoteModalDraft,
    handleNoteModalSave,
    isStockModalOpen,
    handleStockModalClose,
    stockModalDraft,
    setStockModalDraft,
    stockModalTarget,
    stockModalLineRef,
    stockModalLineCount,
    stockModalTextareaRef,
    handleStockModalScroll,
    handleStockModalSave,
    taskDetailTarget,
    closeTaskDetail,
    detailNoteText,
    detailNoteLineCount,
    detailNoteLineRef,
    detailNoteRef,
    handleDetailNoteScroll
  }
}
