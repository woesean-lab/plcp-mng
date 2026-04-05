export const fallbackTemplates = [
  {
    label: "Hoş geldin",
    value: "Hoş geldin! Burada herkese yer var.",
    category: "Karsilama",
  },
  {
    label: "Bilgilendirme",
    value: "Son durum: Görev planlandigi gibi ilerliyor.",
    category: "Bilgilendirme",
  },
  {
    label: "Hatırlatma",
    value: "Unutma: Akşam 18:00 toplantisina hazır ol.",
    category: "Hatırlatma",
  },
]

export const fallbackCategories = Array.from(
  new Set(["Genel", ...fallbackTemplates.map((tpl) => tpl.category || "Genel")]),
)

export const initialProblems = [
  { id: 1, username: "@ornek1", issue: "Ödeme ekranda takıldı, 2 kez kart denemiş.", status: "open" },
  { id: 2, username: "@ornek2", issue: "Teslimat gecikmesi şikayeti.", status: "open" },
]

export const initialProducts = [
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

export const initialTasks = [
  {
    id: "tsk-1",
    title: "Haftalik öncelik listesini güncelle",
    note: "Kritik müşteriler + teslim süreleri",
    owner: "Burak",
    dueType: "date",
    dueDate: "2025-12-29",
    status: "todo",
  },
  {
    id: "tsk-2",
    title: "Şablon kategorilerini toparla",
    note: "Genel, satış, destek",
    owner: "Ece",
    dueType: "repeat",
    repeatDays: ["2"],
    status: "doing",
  },
  {
    id: "tsk-3",
    title: "Haftalik raporu paylaş",
    note: "Cuma 17:00",
    owner: "Tuna",
    dueType: "today",
    status: "done",
  },
]

export const initialSales = [
  { id: "sale-1", date: "2025-12-20", amount: 12, createdAt: "2025-12-20T08:00:00.000Z" },
  { id: "sale-2", date: "2025-12-21", amount: 18, createdAt: "2025-12-21T08:00:00.000Z" },
  { id: "sale-3", date: "2025-12-22", amount: 9, createdAt: "2025-12-22T08:00:00.000Z" },
  { id: "sale-4", date: "2025-12-23", amount: 21, createdAt: "2025-12-23T08:00:00.000Z" },
]
