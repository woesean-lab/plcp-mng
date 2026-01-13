export const PRODUCT_ORDER_STORAGE_KEY = "pulcipProductOrder"
export const THEME_STORAGE_KEY = "pulcipTheme"
export const AUTH_TOKEN_STORAGE_KEY = "pulcipAuthToken"
export const SALES_STORAGE_KEY = "pulcipSales"
export const ELDORADO_KEYS_STORAGE_KEY = "pulcipEldoradoKeys"
export const ELDORADO_GROUPS_STORAGE_KEY = "pulcipEldoradoGroups"
export const ELDORADO_NOTES_STORAGE_KEY = "pulcipEldoradoNotes"
export const ELDORADO_NOTE_GROUPS_STORAGE_KEY = "pulcipEldoradoNoteGroups"
export const ELDORADO_MESSAGE_GROUPS_STORAGE_KEY = "pulcipEldoradoMessageGroups"
export const ELDORADO_STOCK_ENABLED_STORAGE_KEY = "pulcipEldoradoStockEnabled"

export const DEFAULT_LIST_ROWS = 12
export const DEFAULT_LIST_COLS = 8
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
  { value: "none", label: "Süresiz" },
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
  productsView: "products.view",
  productsStockAdd: "products.stock.add",
  productsStockEdit: "products.stock.edit",
  productsStockDelete: "products.stock.delete",
  productsStockStatus: "products.stock.status",
  productsStockCopy: "products.stock.copy",
  productsGroupManage: "products.group.manage",
  productsNoteManage: "products.note.manage",
  productsMessageManage: "products.message.manage",
  productsStockToggle: "products.stock.toggle",
  productsPriceManage: "products.price.manage",
  productsLinkView: "products.link.view",
  productsStar: "products.star",
  productsCardToggle: "products.card.toggle",
  productsManage: "products.manage",
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
  adminRolesManage: "admin.roles.manage",
  adminUsersManage: "admin.users.manage",
  adminManage: "admin.manage",
}

export const PERMISSION_GROUPS = [
  {
    title: "Urunler",
    items: [
      { id: PERMISSIONS.productsView, label: "Goruntule" },
      { id: PERMISSIONS.productsStockAdd, label: "Stok ekle" },
      { id: PERMISSIONS.productsStockEdit, label: "Stok duzenle" },
      { id: PERMISSIONS.productsStockDelete, label: "Stok sil" },
      { id: PERMISSIONS.productsStockStatus, label: "Stok durum degistir" },
      { id: PERMISSIONS.productsStockCopy, label: "Stok kopyala" },
      { id: PERMISSIONS.productsGroupManage, label: "Stok grubu yonet" },
      { id: PERMISSIONS.productsNoteManage, label: "Not grubu yonet" },
      { id: PERMISSIONS.productsMessageManage, label: "Mesaj grubu yonet" },
      { id: PERMISSIONS.productsStockToggle, label: "Stok ac/kapat" },
      { id: PERMISSIONS.productsPriceManage, label: "Fiyat ayarla" },
      { id: PERMISSIONS.productsLinkView, label: "Link goruntule" },
      { id: PERMISSIONS.productsStar, label: "Yildizla" },
      { id: PERMISSIONS.productsCardToggle, label: "Kart ac/kapat" },
      { id: PERMISSIONS.productsManage, label: "Tum yetki (eski)" },
    ],
  },
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
    title: "Admin",
    items: [
      { id: PERMISSIONS.adminRolesManage, label: "Rol yonetimi" },
      { id: PERMISSIONS.adminUsersManage, label: "Kullanici yonetimi" },
      { id: PERMISSIONS.adminManage, label: "Tum yetki (eski)" },
    ],
  },
]
