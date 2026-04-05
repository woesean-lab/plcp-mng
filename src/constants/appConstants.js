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
    label: "Tamamlandı",
    helper: "Bitenler",
    accent: "text-emerald-200",
    badge: "border-emerald-300/60 bg-emerald-500/15 text-emerald-50",
  },
}
export const taskDueTypeOptions = [
  { value: "today", label: "Bugun" },
  { value: "none", label: "Süresiz" },
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

export const PERMISSIONS = {
  automationView: "automation.view",
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
  productsPriceDetails: "products.price.details",
  productsPriceToggle: "products.price.toggle",
  productsPriceCommandLogsView: "products.price.command.logs.view",
  productsStockFetch: "products.stock.fetch",
  productsStockFetchEdit: "products.stock.fetch.edit",
  productsStockFetchRun: "products.stock.fetch.run",
  productsStockFetchLogsView: "products.stock.fetch.logs.view",
  productsStockFetchLogsClear: "products.stock.fetch.logs.clear",
  productsStockFetchStar: "products.stock.fetch.star",
  productsStockFetchTargetDetailsView: "products.stock.fetch.target.details.view",
  productsLinkView: "products.link.view",
  productsStar: "products.star",
  productsCardToggle: "products.card.toggle",
  productsManage: "products.manage",
  applicationsView: "applications.view",
  applicationsManage: "applications.manage",
  applicationsRun: "applications.run",
  applicationsLogsView: "applications.logs.view",
  applicationsLogsClear: "applications.logs.clear",
  applicationsBackendView: "applications.backend.view",
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
  salesAnalyticsView: "sales.analytics.view",
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
    title: "Ürünler",
    items: [
      { id: PERMISSIONS.productsView, label: "Görüntüle" },
      { id: PERMISSIONS.productsStockAdd, label: "Stok ekle" },
      { id: PERMISSIONS.productsStockEdit, label: "Stok düzenle" },
      { id: PERMISSIONS.productsStockDelete, label: "Stok sil" },
      { id: PERMISSIONS.productsStockStatus, label: "Stok durum değiştir" },
      { id: PERMISSIONS.productsStockCopy, label: "Stok kopyala" },
      { id: PERMISSIONS.productsGroupManage, label: "Stok grubu yönet" },
      { id: PERMISSIONS.productsNoteManage, label: "Not grubu yönet" },
      { id: PERMISSIONS.productsMessageManage, label: "Mesaj grubu yönet" },
      { id: PERMISSIONS.productsStockToggle, label: "Stok aç/kapat" },
      { id: PERMISSIONS.productsPriceManage, label: "Fiyat ayarla" },
      { id: PERMISSIONS.productsPriceDetails, label: "Fiyat yüzde gör" },
      { id: PERMISSIONS.productsPriceToggle, label: "Fiyat aç/kapat" },
      { id: PERMISSIONS.productsPriceCommandLogsView, label: "Fiyat komut çıktılarını gör" },
      { id: PERMISSIONS.productsStockFetch, label: "Stok çek panelini gör" },
      { id: PERMISSIONS.productsStockFetchEdit, label: "Stok çek hedef yönet" },
      { id: PERMISSIONS.productsStockFetchRun, label: "Stok çek çalıştır" },
      { id: PERMISSIONS.productsStockFetchLogsView, label: "Stok çek CMD gör" },
      { id: PERMISSIONS.productsStockFetchLogsClear, label: "Stok çek log temizle" },
      { id: PERMISSIONS.productsStockFetchStar, label: "Stok çek hedef yıldızla" },
      { id: PERMISSIONS.productsStockFetchTargetDetailsView, label: "Stok çek URL/backend gör" },
      { id: PERMISSIONS.productsLinkView, label: "Link görüntüle" },
      { id: PERMISSIONS.productsStar, label: "Yıldızla" },
      { id: PERMISSIONS.productsCardToggle, label: "Kart aç/kapat" },
      { id: PERMISSIONS.productsManage, label: "Tüm yetki (eski)" },
    ],
  },
  {
    title: "Mesajlar",
    items: [
      { id: PERMISSIONS.messagesView, label: "Görüntüle" },
      { id: PERMISSIONS.messagesCreate, label: "Şablon ekle" },
      { id: PERMISSIONS.messagesTemplateEdit, label: "Şablon düzenle" },
      { id: PERMISSIONS.messagesDelete, label: "Şablon sil" },
      { id: PERMISSIONS.messagesCategoryManage, label: "Kategori yönet" },
      { id: PERMISSIONS.messagesEdit, label: "Tüm yetki (eski)" },
    ],
  },
  {
    title: "Görevler",
    items: [
      { id: PERMISSIONS.tasksView, label: "Görüntüle" },
      { id: PERMISSIONS.tasksCreate, label: "Görev ekle" },
      { id: PERMISSIONS.tasksUpdate, label: "Görev düzenle" },
      { id: PERMISSIONS.tasksProgress, label: "Durum değiştir" },
      { id: PERMISSIONS.tasksDelete, label: "Görev sil" },
      { id: PERMISSIONS.tasksEdit, label: "Tüm yetki (eski)" },
    ],
  },
  {
    title: "Satışlar",
    items: [
      { id: PERMISSIONS.salesView, label: "Görüntüle" },
      { id: PERMISSIONS.salesCreate, label: "Satış ekle" },
      { id: PERMISSIONS.salesAnalyticsView, label: "Grafik gör" },
    ],
  },
  {
    title: "Problemli Müşteriler",
    items: [
      { id: PERMISSIONS.problemsView, label: "Görüntüle" },
      { id: PERMISSIONS.problemsCreate, label: "Problem ekle" },
      { id: PERMISSIONS.problemsResolve, label: "Durum değiştir" },
      { id: PERMISSIONS.problemsDelete, label: "Problem sil" },
      { id: PERMISSIONS.problemsManage, label: "Tüm yetki (eski)" },
    ],
  },
  {
    title: "Listeler",
    items: [
      { id: PERMISSIONS.listsView, label: "Görüntüle" },
      { id: PERMISSIONS.listsCreate, label: "Liste oluştur" },
      { id: PERMISSIONS.listsRename, label: "Liste adını değiştir" },
      { id: PERMISSIONS.listsDelete, label: "Liste sil" },
      { id: PERMISSIONS.listsCellsEdit, label: "Hücre düzenle" },
      { id: PERMISSIONS.listsStructureEdit, label: "Satır/sütun düzenle" },
      { id: PERMISSIONS.listsEdit, label: "Tüm yetki (eski)" },
    ],
  },
  {
    title: "Servisler",
    items: [
      { id: PERMISSIONS.applicationsView, label: "Paneli görüntüle" },
      { id: PERMISSIONS.applicationsManage, label: "Servis yönet" },
      { id: PERMISSIONS.applicationsRun, label: "Servis çalıştır" },
      { id: PERMISSIONS.applicationsLogsView, label: "Servis Konsolu log gör" },
      { id: PERMISSIONS.applicationsLogsClear, label: "Servis Konsolu log temizle" },
      { id: PERMISSIONS.applicationsBackendView, label: "Backend map görüntüle" },
    ],
  },
  {
    title: "Admin",
    items: [
      { id: PERMISSIONS.automationView, label: "Websocket ayarları" },
      { id: PERMISSIONS.adminRolesManage, label: "Rol yönetimi" },
      { id: PERMISSIONS.adminUsersManage, label: "Kullanıcı yönetimi" },
      { id: PERMISSIONS.adminManage, label: "Tüm yetki (eski)" },
    ],
  },
]
