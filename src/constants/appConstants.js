export const PRODUCT_ORDER_STORAGE_KEY = "pulcipProductOrder"
export const THEME_STORAGE_KEY = "pulcipTheme"
export const AUTH_TOKEN_STORAGE_KEY = "pulcipAuthToken"
export const SALES_STORAGE_KEY = "pulcipSales"

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
export const taskDueTypeOptions = [
  { value: "today", label: "Bugun" },
  { value: "repeat", label: "Tekrarlanabilir gun" },
  { value: "date", label: "Ozel tarih" },
]
export const taskRepeatDays = [
  { value: "1", label: "Pazartesi" },
  { value: "2", label: "Sali" },
  { value: "3", label: "Carsamba" },
  { value: "4", label: "Persembe" },
  { value: "5", label: "Cuma" },
  { value: "6", label: "Cumartesi" },
  { value: "0", label: "Pazar" },
]
export const taskRepeatDayValues = new Set(taskRepeatDays.map((day) => day.value))

export const STOCK_STATUS = {
  available: "available",
  used: "used",
}

export const PERMISSIONS = {
  messagesView: "messages.view",
  messagesCreate: "messages.create",
  messagesTemplateEdit: "messages.template.edit",
  messagesDelete: "messages.delete",
  messagesCategoryManage: "messages.category.manage",
  messagesEdit: "messages.edit",
  tasksView: "tasks.view",
  tasksCreate: "tasks.create",
  tasksUpdate: "tasks.update",
  tasksProgress: "tasks.progress",
  tasksDelete: "tasks.delete",
  tasksEdit: "tasks.edit",
  salesView: "sales.view",
  salesCreate: "sales.create",
  problemsView: "problems.view",
  problemsCreate: "problems.create",
  problemsResolve: "problems.resolve",
  problemsDelete: "problems.delete",
  problemsManage: "problems.manage",
  listsView: "lists.view",
  listsCreate: "lists.create",
  listsRename: "lists.rename",
  listsDelete: "lists.delete",
  listsCellsEdit: "lists.cells.edit",
  listsStructureEdit: "lists.structure.edit",
  listsEdit: "lists.edit",
  stockView: "stock.view",
  stockProductCreate: "stock.product.create",
  stockProductEdit: "stock.product.edit",
  stockProductDelete: "stock.product.delete",
  stockProductReorder: "stock.product.reorder",
  stockStockAdd: "stock.stock.add",
  stockStockEdit: "stock.stock.edit",
  stockStockDelete: "stock.stock.delete",
  stockStockStatus: "stock.stock.status",
  stockStockCopy: "stock.stock.copy",
  stockStockBulk: "stock.stock.bulk",
  stockManage: "stock.manage",
  adminRolesManage: "admin.roles.manage",
  adminUsersManage: "admin.users.manage",
  adminManage: "admin.manage",
}

export const PERMISSION_GROUPS = [
  {
    title: "Mesajlar",
    items: [
      { id: PERMISSIONS.messagesView, label: "Goruntule" },
      { id: PERMISSIONS.messagesCreate, label: "Sablon ekle" },
      { id: PERMISSIONS.messagesTemplateEdit, label: "Sablon duzenle" },
      { id: PERMISSIONS.messagesDelete, label: "Sablon sil" },
      { id: PERMISSIONS.messagesCategoryManage, label: "Kategori yonet" },
      { id: PERMISSIONS.messagesEdit, label: "Tum yetki (eski)" },
    ],
  },
  {
    title: "Gorevler",
    items: [
      { id: PERMISSIONS.tasksView, label: "Goruntule" },
      { id: PERMISSIONS.tasksCreate, label: "Gorev ekle" },
      { id: PERMISSIONS.tasksUpdate, label: "Gorev duzenle" },
      { id: PERMISSIONS.tasksProgress, label: "Durum degistir" },
      { id: PERMISSIONS.tasksDelete, label: "Gorev sil" },
      { id: PERMISSIONS.tasksEdit, label: "Tum yetki (eski)" },
    ],
  },
  {
    title: "Satislar",
    items: [
      { id: PERMISSIONS.salesView, label: "Goruntule" },
      { id: PERMISSIONS.salesCreate, label: "Satis ekle" },
    ],
  },
  {
    title: "Problemli Musteriler",
    items: [
      { id: PERMISSIONS.problemsView, label: "Goruntule" },
      { id: PERMISSIONS.problemsCreate, label: "Problem ekle" },
      { id: PERMISSIONS.problemsResolve, label: "Durum degistir" },
      { id: PERMISSIONS.problemsDelete, label: "Problem sil" },
      { id: PERMISSIONS.problemsManage, label: "Tum yetki (eski)" },
    ],
  },
  {
    title: "Listeler",
    items: [
      { id: PERMISSIONS.listsView, label: "Goruntule" },
      { id: PERMISSIONS.listsCreate, label: "Liste olustur" },
      { id: PERMISSIONS.listsRename, label: "Liste adini degistir" },
      { id: PERMISSIONS.listsDelete, label: "Liste sil" },
      { id: PERMISSIONS.listsCellsEdit, label: "Hucre duzenle" },
      { id: PERMISSIONS.listsStructureEdit, label: "Satir/sutun duzenle" },
      { id: PERMISSIONS.listsEdit, label: "Tum yetki (eski)" },
    ],
  },
  {
    title: "Stok",
    items: [
      { id: PERMISSIONS.stockView, label: "Goruntule" },
      { id: PERMISSIONS.stockProductCreate, label: "Urun ekle" },
      { id: PERMISSIONS.stockProductEdit, label: "Urun duzenle" },
      { id: PERMISSIONS.stockProductDelete, label: "Urun sil" },
      { id: PERMISSIONS.stockProductReorder, label: "Urun sirala" },
      { id: PERMISSIONS.stockStockAdd, label: "Stok ekle" },
      { id: PERMISSIONS.stockStockEdit, label: "Stok duzenle" },
      { id: PERMISSIONS.stockStockDelete, label: "Stok sil" },
      { id: PERMISSIONS.stockStockStatus, label: "Stok durum degistir" },
      { id: PERMISSIONS.stockStockCopy, label: "Stok kopyala" },
      { id: PERMISSIONS.stockStockBulk, label: "Toplu islemler" },
      { id: PERMISSIONS.stockManage, label: "Tum yetki (eski)" },
    ],
  },
  {
    title: "Admin",
    items: [
      { id: PERMISSIONS.adminRolesManage, label: "Rol yonetimi" },
      { id: PERMISSIONS.adminUsersManage, label: "Kullanici yonetimi" },
      { id: PERMISSIONS.adminManage, label: "Tum yetki (eski)" },
    ],
  },
]
