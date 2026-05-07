import crypto from "node:crypto"
import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import "dotenv/config"
import express from "express"
import { PrismaClient } from "@prisma/client"
import { io as createSocketIoClient } from "socket.io-client"
import {
  buildSocketIoWsUrl,
  parseSocketIoEventPacket,
  splitEnginePackets,
} from "../src/utils/socketIoClient.js"
import {
  formatRoundedPriceNumber,
  normalizePricePayloadValues,
  roundPriceNumber,
} from "../src/utils/priceMath.js"
import { parseFlexibleNumberInput } from "../src/utils/numberInput.js"

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, "..")
const distDir = path.resolve(appRoot, "dist")

const normalizeEldoradoListingUrl = (rawUrl, fallbackCategory = "") => {
  const value = String(rawUrl ?? "").trim()
  if (!value) return ""
  try {
    const parsed = new URL(value)
    const parts = parsed.pathname.split("/").filter(Boolean)
    const lowered = parts.map((part) => part.toLowerCase())
    const usersIndex = lowered.indexOf("users")
    const shopIndex = lowered.indexOf("shop")

    const storeSlug =
      usersIndex >= 0 && parts[usersIndex + 1]
        ? String(parts[usersIndex + 1]).trim()
        : "PulcipStore"
    const pathCategory =
      shopIndex >= 0 && parts[shopIndex + 1]
        ? String(parts[shopIndex + 1]).trim()
        : ""
    const queryCategory = String(parsed.searchParams.get("category") ?? "").trim()
    const category = pathCategory || queryCategory || String(fallbackCategory ?? "").trim()
    if (!category) return value

    const page =
      String(parsed.searchParams.get("page") ?? "").trim() ||
      String(parsed.searchParams.get("pageIndex") ?? "").trim() ||
      "1"

    const normalized = new URL(`${parsed.protocol}//${parsed.host}/users/${storeSlug}/shop/${encodeURIComponent(category)}`)
    normalized.searchParams.set("page", page)
    return normalized.toString()
  } catch {
    return value
  }
}

const eldoradoItemsUrls = Array.from(
  new Set(
    [
      normalizeEldoradoListingUrl(
        process.env.ELDORADO_ITEMS_URL ??
          "https://www.eldorado.gg/users/PulcipStore/shop/CustomItem?page=1",
        "CustomItem",
      ),
      normalizeEldoradoListingUrl(
        process.env.ELDORADO_ACCOUNTS_URL ??
          "https://www.eldorado.gg/users/PulcipStore/shop/Account?page=1",
        "Account",
      ),
      normalizeEldoradoListingUrl(
        process.env.ELDORADO_CURRENCY_URL ??
          "https://www.eldorado.gg/users/PulcipStore/shop/Currency?page=1",
        "Currency",
      ),
      normalizeEldoradoListingUrl(
        process.env.ELDORADO_GIFTCARDS_URL ??
          "https://www.eldorado.gg/users/PulcipStore/shop/GiftCard?page=1",
        "GiftCard",
      ),
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  ),
)
const eldoradoTopupsUrl =
  normalizeEldoradoListingUrl(
    process.env.ELDORADO_TOPUPS_URL ??
      "https://www.eldorado.gg/users/PulcipStore/shop/TopUp?page=1",
    "TopUp",
  )
const eldoradoItemsPagesRaw = Number(process.env.ELDORADO_ITEMS_PAGES ?? 25)
const eldoradoTopupsPagesRaw = Number(process.env.ELDORADO_TOPUPS_PAGES ?? 1)
const eldoradoItemsPages =
  Number.isFinite(eldoradoItemsPagesRaw) && eldoradoItemsPagesRaw > 0 ? eldoradoItemsPagesRaw : 25
const eldoradoTopupsPages =
  Number.isFinite(eldoradoTopupsPagesRaw) && eldoradoTopupsPagesRaw > 0 ? eldoradoTopupsPagesRaw : 1
const eldoradoTitleSelector = process.env.ELDORADO_TITLE_SELECTOR ?? ".offer-title"
const eldoradoDataDir = path.resolve(appRoot, "src", "data")
const eldoradoItemsPath = path.join(eldoradoDataDir, "eldorado-products.json")
const eldoradoTopupsPath = path.join(eldoradoDataDir, "eldorado-topups.json")
const eldoradoLogPath =
  process.env.ELDORADO_LOG_PATH ?? path.join(eldoradoDataDir, "eldorado-scrape.log")
const eldoradoScriptPath = path.resolve(appRoot, "scripts", "eldorado-scrape.mjs")
const playwrightBrowsersPath =
  process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.resolve(appRoot, ".cache", "ms-playwright")
let eldoradoRefreshInFlight = false
let eldoradoRefreshStatus = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  message: "",
}

const port = Number(process.env.PORT ?? 3000)
const adminUsername = String(process.env.ADMIN_USERNAME ?? "admin").trim() || "admin"
const adminPassword = String(process.env.ADMIN_PASSWORD ?? "admin123").trim()
const authTokenTtlMsRaw = Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 12)
const authTokenTtlMs =
  Number.isFinite(authTokenTtlMsRaw) && authTokenTtlMsRaw > 0
    ? authTokenTtlMsRaw
    : 1000 * 60 * 60 * 12
const authTokens = new Map()
const DEFAULT_ADMIN_PERMISSIONS = [
  "automation.view",
  "messages.view",
  "messages.create",
  "messages.template.edit",
  "messages.delete",
  "messages.category.manage",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "tasks.progress",
  "tasks.delete",
  "sales.view",
  "sales.create",
  "sales.analytics.view",
  "accounting.view",
  "accounting.create",
  "accounting.analytics.view",
  "problems.view",
  "problems.create",
  "problems.resolve",
  "problems.delete",
  "lists.view",
  "lists.create",
  "lists.rename",
  "lists.delete",
  "lists.cells.edit",
  "lists.structure.edit",
  "products.view",
  "products.stock.add",
  "products.stock.edit",
  "products.stock.delete",
  "products.stock.status",
  "products.stock.copy",
  "products.group.manage",
  "products.note.manage",
  "products.message.manage",
  "products.stock.toggle",
  "products.price.manage",
  "products.price.details",
  "products.price.toggle",
  "products.price.command.logs.view",
  "products.stock.fetch",
  "products.stock.fetch.edit",
  "products.stock.fetch.run",
  "products.stock.fetch.logs.view",
  "products.stock.fetch.logs.clear",
  "products.stock.fetch.star",
  "products.stock.fetch.target.details.view",
  "products.link.view",
  "products.star",
  "products.card.toggle",
  "products.manage",
  "applications.view",
  "applications.manage",
  "applications.run",
  "applications.logs.view",
  "applications.logs.clear",
  "applications.backend.view",

  "admin.roles.manage",
  "admin.users.manage",
]
const LEGACY_PERMISSIONS = [
  "messages.edit",
  "tasks.edit",
  "problems.manage",
  "lists.edit",
  "admin.manage",
]
const allowedPermissions = new Set([...DEFAULT_ADMIN_PERMISSIONS, ...LEGACY_PERMISSIONS])

const normalizePermissions = (value) => {
  const rawList = Array.isArray(value) ? value : []
  return rawList
    .map((perm) => String(perm ?? "").trim())
    .filter((perm) => perm && allowedPermissions.has(perm))
}

const normalizeAutomationBackendKind = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")

const normalizeAutomationBackendOption = (entry) => {
  if (typeof entry === "string") {
    const key = entry.trim()
    if (!key) return null
    return { key, label: key, kind: "" }
  }
  if (!entry || typeof entry !== "object") return null
  const key = String(entry?.key ?? entry?.backend ?? entry?.id ?? "").trim()
  if (!key) return null
  const label = String(entry?.label ?? entry?.title ?? entry?.name ?? key).trim() || key
  const kind = normalizeAutomationBackendKind(entry?.kind ?? entry?.group ?? entry?.type)
  return { key, label, kind }
}

const normalizeAutomationBackendOptions = (value) => {
  const list = Array.isArray(value)
    ? value
      : value && typeof value === "object"
      ? Object.entries(value).map(([key, rawValue]) => {
          if (rawValue && typeof rawValue === "object") {
            return {
              key,
              label: String(rawValue?.label ?? rawValue?.name ?? key).trim() || key,
              kind: normalizeAutomationBackendKind(
                rawValue?.kind ?? rawValue?.group ?? rawValue?.type,
              ),
            }
          }
          return {
            key,
            label: String(rawValue ?? key).trim() || key,
            kind: "",
          }
        })
      : []

  const seenKeys = new Set()
  const normalized = []
  list.forEach((entry) => {
    const option = normalizeAutomationBackendOption(entry)
    if (!option || seenKeys.has(option.key)) return
    seenKeys.add(option.key)
    normalized.push(option)
  })
  return normalized
}

const normalizeOfferAutomationTarget = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const offerId = String(entry?.offerId ?? "").trim()
  const backend = String(entry?.backend ?? "").trim()
  const url = String(entry?.url ?? "").trim()
  const starred = Boolean(entry?.starred)
  if (!id || !offerId || !backend || !url) return null
  return { id, offerId, backend, url, starred }
}

const normalizeOfferAutomationTargetInput = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const backend = String(value?.backend ?? "").trim()
  const url = String(value?.url ?? "").trim()
  if (!backend || !url) return null
  if (backend.length > 120 || url.length > 2000) return null
  return { backend, url }
}

const readJsonFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Failed to read eldorado data", error)
    }
    return []
  }
}

const normalizeEldoradoMainCategory = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

  if (normalized === "currency") return "Currency"
  if (normalized === "topup" || normalized === "topups") return "TopUp"
  if (normalized === "giftcard" || normalized === "giftcards") return "GiftCard"
  if (normalized === "account" || normalized === "accounts") return "Account"
  if (normalized === "customitem" || normalized === "item" || normalized === "items") return "CustomItem"
  return ""
}

const normalizeEldoradoOffer = (item) => {
  const id = String(item?.id ?? "").trim()
  const name = String(item?.name ?? "").trim()
  if (!id || !name) return null
  const hrefRaw = item?.href
  const href = hrefRaw === undefined || hrefRaw === null ? "" : String(hrefRaw).trim()
  const imageUrlRaw = item?.imageUrl
  const imageUrl =
    imageUrlRaw === undefined || imageUrlRaw === null ? "" : String(imageUrlRaw).trim()
  const hasHref = Boolean(href)
  const categoryRaw = item?.category
  const category = categoryRaw === undefined || categoryRaw === null ? "" : String(categoryRaw).trim()
  const mainCategory =
    normalizeEldoradoMainCategory(item?.mainCategory) ||
    normalizeEldoradoMainCategory(item?.category)
  const missing = hasHref ? Boolean(item?.missing) : true
  return {
    id,
    name,
    href,
    imageUrl,
    category,
    mainCategory,
    kind: String(item?.kind ?? "").trim(),
    missing,
  }
}

const normalizeEldoradoList = (value) => {
  if (!Array.isArray(value)) return []
  return value.map(normalizeEldoradoOffer).filter(Boolean)
}

const normalizeEldoradoSyncOffer = (item) => {
  const normalized = normalizeEldoradoOffer(item)
  if (!normalized) return null
  const seenInRunRaw = item?.seenInRun
  const seenInRun =
    typeof seenInRunRaw === "boolean"
      ? seenInRunRaw
      : normalized.missing
        ? false
        : true
  return {
    ...normalized,
    seenInRun,
  }
}

const normalizeEldoradoCatalog = (value) => ({
  items: Array.isArray(value?.items) ? value.items : [],
  topups: Array.isArray(value?.topups) ? value.topups : [],
  currency: Array.isArray(value?.currency) ? value.currency : [],
  accounts: Array.isArray(value?.accounts) ? value.accounts : [],
  giftCards: Array.isArray(value?.giftCards) ? value.giftCards : [],
})

const mapEldoradoOffersToCatalog = (offers) => {
  const items = []
  const topups = []

  offers.forEach((offer) => {
    const normalized = normalizeEldoradoOffer(offer)
    if (!normalized) return
    const kind = String(offer.kind ?? "items")
    // Keep the missing flag persisted by scraper/sync logic.
    // Do not override it here by lastSeenAt comparison, otherwise transient scrape misses
    // appear as immediate false-positives in UI.
    if (kind === "topups") {
      topups.push(normalized)
    } else {
      items.push(normalized)
    }
  })

  return normalizeEldoradoCatalog({
    items,
    topups,
    currency: [],
    accounts: [],
    giftCards: [],
  })
}

const loadEldoradoStockGroupMeta = async () => {
  const [groups, assignments] = await Promise.all([
    prisma.eldoradoStockGroup.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.eldoradoStockGroupAssignment.findMany(),
  ])
  const assignmentMap = {}
  assignments.forEach((entry) => {
    if (!entry?.offerId || !entry?.groupId) return
    assignmentMap[entry.offerId] = entry.groupId
  })
  return { groups, assignments: assignmentMap }
}

const addEldoradoKeyCount = (map, id, status, count) => {
  if (!id) return
  const existing = map.get(id) ?? { total: 0, used: 0 }
  existing.total += count
  if (status === "used") {
    existing.used += count
  }
  map.set(id, existing)
}

const buildEldoradoKeyCounts = async (offerIds, groupIds) => {
  const counts = new Map()
  if (groupIds.length > 0) {
    const rows = await prisma.eldoradoKey.groupBy({
      by: ["groupId", "status"],
      _count: { _all: true },
      where: { groupId: { in: groupIds } },
    })
    rows.forEach((row) => {
      addEldoradoKeyCount(counts, row.groupId, row.status, row._count._all)
    })
  }
  if (offerIds.length > 0) {
    const rows = await prisma.eldoradoKey.groupBy({
      by: ["offerId", "status"],
      _count: { _all: true },
      where: { offerId: { in: offerIds } },
    })
    rows.forEach((row) => {
      addEldoradoKeyCount(counts, row.offerId, row.status, row._count._all)
    })
  }
  return counts
}

const loadEldoradoCatalog = async () => {
  try {
    const offers = await prisma.eldoradoOffer.findMany({ orderBy: { name: "asc" } })
    if (offers.length > 0) {
      const { groups, assignments } = await loadEldoradoStockGroupMeta()
      const groupNameById = new Map(groups.map((group) => [group.id, group.name]))
      const groupIds = Array.from(new Set(Object.values(assignments)))
      const offerIds = offers.map((offer) => offer.id)
      const keyCounts = await buildEldoradoKeyCounts(offerIds, groupIds)
      const catalog = mapEldoradoOffersToCatalog(offers)
      const withCounts = (list) =>
        Array.isArray(list)
          ? list.map((offer) => {
            const assignedGroupId = assignments[offer.id] ?? ""
            const effectiveId = assignedGroupId || offer.id
            const counts = keyCounts.get(effectiveId) ?? { total: 0, used: 0 }
            const available = Math.max(0, counts.total - counts.used)
            return {
              ...offer,
              stockGroupId: assignedGroupId || null,
              stockGroupName: assignedGroupId ? groupNameById.get(assignedGroupId) ?? "" : "",
              stockCount: available,
              stockUsedCount: counts.used,
              stockTotalCount: counts.total,
            }
          })
          : []
      return {
        ...catalog,
        items: withCounts(catalog.items),
        topups: withCounts(catalog.topups),
      }
    }
  } catch (error) {
    console.warn("Failed to load Eldorado offers from database, falling back to JSON.", error)
  }

  await fs.mkdir(eldoradoDataDir, { recursive: true })
  const [items, topups] = await Promise.all([
    readJsonFile(eldoradoItemsPath),
    readJsonFile(eldoradoTopupsPath),
  ])
  const catalog = normalizeEldoradoCatalog({
    items: normalizeEldoradoList(items),
    topups: normalizeEldoradoList(topups),
    currency: [],
    accounts: [],
    giftCards: [],
  })
  return catalog
}

const loadEldoradoStore = async () => {
  let deliveryTemplateRows = []
  try {
    deliveryTemplateRows = await prisma.eldoradoOfferDeliveryTemplate.findMany({
      include: {
        template: {
          select: { id: true, label: true, value: true, category: true },
        },
      },
    })
  } catch (error) {
    if (error?.code !== "P2021") throw error
  }

  const [
    stockGroups,
    stockAssignments,
    stockEnabled,
    automationConfig,
    offerAutomationRows,
    offerAutomationTargetRows,
    offerPriceRows,
    offerPriceEnabledRows,
    offerNotes,
    noteGroups,
    noteAssignments,
    noteGroupNoteRows,
    messageGroups,
    messageAssignments,
    messageGroupTemplateRows,
    messageTemplateRows,
    offerStars,
  ] = await Promise.all([
    prisma.eldoradoStockGroup.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.eldoradoStockGroupAssignment.findMany(),
    prisma.eldoradoStockEnabled.findMany(),
    prisma.automationConfig.findUnique({
      where: { id: "default" },
      select: { wsUrl: true, backendMaps: true },
    }),
    prisma.eldoradoOfferAutomation.findMany(),
    prisma.eldoradoOfferAutomationTarget.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.eldoradoOfferPrice.findMany(),
    prisma.eldoradoOfferPriceEnabled.findMany(),
    prisma.eldoradoOfferNote.findMany(),
    prisma.eldoradoNoteGroup.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.eldoradoNoteGroupAssignment.findMany(),
    prisma.eldoradoNoteGroupNote.findMany(),
    prisma.eldoradoMessageGroup.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.eldoradoMessageGroupAssignment.findMany(),
    prisma.eldoradoMessageGroupTemplate.findMany(),
    prisma.eldoradoMessageTemplate.findMany(),
    prisma.eldoradoOfferStar.findMany(),
  ])

  const stockGroupAssignments = {}
  stockAssignments.forEach((entry) => {
    if (entry?.offerId && entry?.groupId) {
      stockGroupAssignments[entry.offerId] = entry.groupId
    }
  })

  const stockEnabledByOffer = {}
  stockEnabled.forEach((entry) => {
    if (!entry?.offerId) return
    stockEnabledByOffer[entry.offerId] = Boolean(entry.enabled)
  })

  const automationEnabledByOffer = {}
  const automationBackendByOffer = {}
  const automationBackendsByOffer = {}
  offerAutomationRows.forEach((entry) => {
    if (!entry?.offerId) return
    automationEnabledByOffer[entry.offerId] = Boolean(entry.enabled)
    const rawBackends = Array.isArray(entry?.backends) ? entry.backends : []
    const normalizedBackends = rawBackends
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
    const legacyBackend = String(entry?.backend ?? "").trim()
    const mergedBackends = normalizedBackends.length > 0
      ? normalizedBackends
      : legacyBackend
        ? [legacyBackend]
        : []
    if (mergedBackends.length > 0) {
      automationBackendsByOffer[entry.offerId] = Array.from(new Set(mergedBackends))
      automationBackendByOffer[entry.offerId] = automationBackendsByOffer[entry.offerId][0]
    }
  })

  const automationTargetsByOffer = {}
  offerAutomationTargetRows.forEach((entry) => {
    const normalized = normalizeOfferAutomationTarget(entry)
    if (!normalized) return
    if (!automationTargetsByOffer[normalized.offerId]) {
      automationTargetsByOffer[normalized.offerId] = []
    }
    automationTargetsByOffer[normalized.offerId].push({
      id: normalized.id,
      backend: normalized.backend,
      url: normalized.url,
      starred: Boolean(normalized.starred),
    })
  })

  const automationBackendOptions = normalizeAutomationBackendOptions(automationConfig?.backendMaps)

  const offerPrices = {}
  offerPriceRows.forEach((entry) => {
    if (!entry?.offerId) return
    offerPrices[entry.offerId] = {
      base: entry.base ?? null,
      percent: entry.percent ?? null,
      result: entry.result ?? null,
    }
  })

  const offerPriceEnabledByOffer = {}
  offerPriceEnabledRows.forEach((entry) => {
    if (!entry?.offerId) return
    offerPriceEnabledByOffer[entry.offerId] = Boolean(entry.enabled)
  })

  const notesByOffer = {}
  offerNotes.forEach((entry) => {
    if (!entry?.offerId) return
    const note = String(entry.note ?? "").trim()
    if (!note) return
    notesByOffer[entry.offerId] = note
  })

  const noteGroupAssignments = {}
  noteAssignments.forEach((entry) => {
    if (entry?.offerId && entry?.groupId) {
      noteGroupAssignments[entry.offerId] = entry.groupId
    }
  })

  const noteGroupNotes = {}
  noteGroupNoteRows.forEach((entry) => {
    if (!entry?.groupId) return
    const note = String(entry.note ?? "").trim()
    if (!note) return
    noteGroupNotes[entry.groupId] = note
  })

  const messageGroupAssignments = {}
  messageAssignments.forEach((entry) => {
    if (entry?.offerId && entry?.groupId) {
      messageGroupAssignments[entry.offerId] = entry.groupId
    }
  })

  const messageGroupTemplates = {}
  messageGroupTemplateRows.forEach((entry) => {
    if (!entry?.groupId || !entry?.label) return
    if (!messageGroupTemplates[entry.groupId]) messageGroupTemplates[entry.groupId] = []
    messageGroupTemplates[entry.groupId].push(entry.label)
  })

  const messageTemplatesByOffer = {}
  messageTemplateRows.forEach((entry) => {
    if (!entry?.offerId || !entry?.label) return
    if (!messageTemplatesByOffer[entry.offerId]) messageTemplatesByOffer[entry.offerId] = []
    messageTemplatesByOffer[entry.offerId].push(entry.label)
  })

  const deliveryTemplatesByOffer = {}
  deliveryTemplateRows.forEach((entry) => {
    if (!entry?.offerId || !entry?.template?.id) return
    deliveryTemplatesByOffer[entry.offerId] = {
      templateId: entry.template.id,
      label: String(entry.template.label ?? "").trim(),
      value: String(entry.template.value ?? "").trim(),
      category: String(entry.template.category ?? "").trim(),
    }
  })

  const starredOffers = {}
  offerStars.forEach((entry) => {
    if (!entry?.offerId) return
    starredOffers[entry.offerId] = true
  })

  return {
    stockGroups: stockGroups.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt.toISOString(),
    })),
    stockGroupAssignments,
    stockEnabledByOffer,
    automationWsUrl: String(automationConfig?.wsUrl ?? "").trim(),
    automationEnabledByOffer,
    automationBackendByOffer,
    automationBackendsByOffer,
    automationTargetsByOffer,
    automationBackendOptions,
    offerPriceEnabledByOffer,
    offerPrices,
    notesByOffer,
    noteGroups: noteGroups.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt.toISOString(),
    })),
    noteGroupAssignments,
    noteGroupNotes,
    messageGroups: messageGroups.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt.toISOString(),
    })),
    messageGroupAssignments,
    messageGroupTemplates,
    messageTemplatesByOffer,
    deliveryTemplatesByOffer,
    starredOffers,
  }
}

const syncEldoradoOffers = async (kind, offers, seenAtOverride) => {
  const normalized = Array.isArray(offers)
    ? offers.map(normalizeEldoradoSyncOffer).filter(Boolean)
    : []
  if (normalized.length === 0) return 0
  const seenAt = seenAtOverride instanceof Date ? seenAtOverride : new Date()
  const normalizedIds = normalized.map((offer) => offer.id)
  const [existingRows, previousSync] = await Promise.all([
    prisma.eldoradoOffer.findMany({
      where: { id: { in: normalizedIds } },
      select: { id: true, lastSeenAt: true, mainCategory: true },
    }),
    prisma.eldoradoSync.findUnique({
      where: { kind },
      select: { lastSyncAt: true },
    }),
  ])
  const existingById = new Map(existingRows.map((entry) => [entry.id, entry]))
  const operations = normalized.map((offer) => {
    const existing = existingById.get(offer.id)
    const seenInRun = offer.seenInRun === true
    const missing = offer.missing === true
    const nextLastSeenAt = seenInRun ? seenAt : existing?.lastSeenAt ?? null
    const nextMainCategory =
      normalizeEldoradoMainCategory(offer.mainCategory) ||
      normalizeEldoradoMainCategory(existing?.mainCategory) ||
      (kind === "topups" ? "TopUp" : null)
    const update = {
      name: offer.name,
      kind,
      lastSeenAt: nextLastSeenAt,
      missing,
      href: offer.href || null,
      imageUrl: offer.imageUrl || null,
      category: offer.category || null,
      mainCategory: nextMainCategory,
      price: null,
    }
    return prisma.eldoradoOffer.upsert({
      where: { id: offer.id },
      update,
      create: {
        id: offer.id,
        name: offer.name,
        category: offer.category || null,
        mainCategory: nextMainCategory,
        href: offer.href || null,
        imageUrl: offer.imageUrl || null,
        kind,
        missing: false,
        lastSeenAt: seenInRun ? seenAt : null,
      },
    })
  })
  await prisma.$transaction(operations)
  const previousSyncAt = previousSync?.lastSyncAt instanceof Date ? previousSync.lastSyncAt : null
  if (previousSyncAt) {
    await prisma.eldoradoOffer.updateMany({
      where: {
        kind,
        id: { notIn: normalizedIds },
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: previousSyncAt } }],
      },
      data: { missing: true },
    })
  }
  // Always treat offers without URL as missing.
  await prisma.eldoradoOffer.updateMany({
    where: {
      kind,
      OR: [{ href: null }, { href: "" }],
    },
    data: { missing: true },
  })
  return normalized.length
}

const markEldoradoSync = async (kind, syncedAt) => {
  await prisma.eldoradoSync.upsert({
    where: { kind },
    update: { lastSyncAt: syncedAt },
    create: { kind, lastSyncAt: syncedAt },
  })
}

const runEldoradoScrape = ({ url, urls, pages, outputPath }) => {
  return new Promise((resolve, reject) => {
    const normalizedUrls = Array.isArray(urls)
      ? urls.map((value) => String(value ?? "").trim()).filter(Boolean)
      : []
    const fallbackUrl = String(url ?? normalizedUrls[0] ?? "").trim()
    const env = {
      ...process.env,
      // Set scrape URLs only from refresh flow.
      ELDORADO_URLS: normalizedUrls.length > 0 ? normalizedUrls.join(",") : "",
      ELDORADO_URL: fallbackUrl,
      ELDORADO_PAGES: String(pages),
      ELDORADO_OUTPUT: outputPath,
      ELDORADO_TITLE_SELECTOR: eldoradoTitleSelector,
      ELDORADO_LOG_PATH: eldoradoLogPath,
      PLAYWRIGHT_BROWSERS_PATH: playwrightBrowsersPath,
    }
    const child = spawn(process.execPath, [eldoradoScriptPath], { env, cwd: appRoot })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", (error) => {
      reject(error)
    })
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        const detail = stderr || stdout || `eldorado scrape failed with code ${code}`
        reject(new Error(detail.trim()))
      }
    })
  })
}

const runEldoradoRefreshJob = async () => {
  const startedAtIso = new Date().toISOString()
  eldoradoRefreshInFlight = true
  eldoradoRefreshStatus = {
    status: "running",
    startedAt: startedAtIso,
    finishedAt: null,
    message: "",
  }

  try {
    await runEldoradoScrape({
      urls: eldoradoItemsUrls,
      url: eldoradoItemsUrls[0] ?? "",
      pages: eldoradoItemsPages,
      outputPath: eldoradoItemsPath,
    })
    await runEldoradoScrape({
      url: eldoradoTopupsUrl,
      pages: eldoradoTopupsPages,
      outputPath: eldoradoTopupsPath,
    })
    const [items, topups] = await Promise.all([
      readJsonFile(eldoradoItemsPath),
      readJsonFile(eldoradoTopupsPath),
    ])
    const itemsSyncedAt = new Date()
    const topupsSyncedAt = new Date()
    await syncEldoradoOffers("items", items, itemsSyncedAt)
    await syncEldoradoOffers("topups", topups, topupsSyncedAt)
    await Promise.all([
      markEldoradoSync("items", itemsSyncedAt),
      markEldoradoSync("topups", topupsSyncedAt),
    ])

    eldoradoRefreshStatus = {
      status: "success",
      startedAt: startedAtIso,
      finishedAt: new Date().toISOString(),
      message: "",
    }
  } catch (error) {
    const message = String(error?.message || "refresh_failed").trim()
    console.error("Eldorado refresh failed", error)
    eldoradoRefreshStatus = {
      status: "error",
      startedAt: startedAtIso,
      finishedAt: new Date().toISOString(),
      message,
    }
  } finally {
    eldoradoRefreshInFlight = false
  }
}

const issueAuthToken = (userId) => {
  const token = crypto.randomBytes(32).toString("hex")
  authTokens.set(token, { userId, expiresAt: Date.now() + authTokenTtlMs })
  return token
}

const getAuthTokenEntry = (token) => {
  if (!token) return false
  const entry = authTokens.get(token)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    authTokens.delete(token)
    return false
  }
  return entry
}

const readAuthToken = (req) => {
  const header = req.get("authorization") || ""
  const [type, token] = header.split(" ")
  if (type !== "Bearer") return ""
  return token?.trim() || ""
}

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

const verifyPassword = (password, stored) => {
  if (!stored) return false
  const [algo, salt, hash] = stored.split("$")
  if (algo !== "scrypt" || !salt || !hash) return false
  const derived = crypto.scryptSync(password, salt, 64).toString("hex")
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"))
}

const serializeUser = (user) => {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    role: user.role
      ? {
        id: user.role.id,
        name: user.role.name,
        permissions: normalizePermissions(user.role.permissions),
      }
      : null,
  }
}

const loadUserForToken = async (token) => {
  const entry = getAuthTokenEntry(token)
  if (!entry) return null
  const user = await prisma.user.findUnique({
    where: { id: entry.userId },
    include: { role: true },
  })
  if (!user) {
    authTokens.delete(token)
    return null
  }
  return user
}

const initialTemplates = [
  { label: "HoÅŸ geldin", value: "HoÅŸ geldin! Burada herkese yer var.", category: "KarÅŸÄ±lama" },
  { label: "Bilgilendirme", value: "Son durum: GÃ¶rev planlandÄ±ÄŸÄ± gibi ilerliyor.", category: "Bilgilendirme" },
  { label: "HatÄ±rlatma", value: "Unutma: AkÅŸam 18:00 toplantÄ±sÄ±na hazÄ±r ol.", category: "HatÄ±rlatma" },
]


const initialAutomations = [
  { title: "Knife Crown", backend: "knife-crown" },
  { title: "Stok kontrol zinciri", backend: "stock-check" },
  { title: "Problem eskalasyonu", backend: "problem-escalation" },
]
const AUTOMATION_LOG_LIMIT = 300
const ELDORADO_AUTOMATION_LOG_LIMIT = 300
const ELDORADO_PRICE_COMMAND_LOG_LIMIT = 300
const APPLICATION_LOG_LIMIT = 300
let accountingStorageReadyPromise = null

const ensureAccountingRecordStorage = async () => {
  if (accountingStorageReadyPromise) return accountingStorageReadyPromise

  accountingStorageReadyPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AccountingRecord" (
        "id" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "available" NUMERIC NOT NULL,
        "pending" NUMERIC NOT NULL,
        "withdrawal" NUMERIC NOT NULL DEFAULT 0,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AccountingRecord_pkey" PRIMARY KEY ("id")
      )
    `)

    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "date" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "available" NUMERIC`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "pending" NUMERIC`)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "withdrawal" NUMERIC NOT NULL DEFAULT 0`,
    )
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "note" TEXT`)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    )
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AccountingRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    )

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AccountingRecord" ALTER COLUMN "available" TYPE NUMERIC USING "available"::numeric`,
    )
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AccountingRecord" ALTER COLUMN "pending" TYPE NUMERIC USING "pending"::numeric`,
    )
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AccountingRecord" ALTER COLUMN "withdrawal" TYPE NUMERIC USING "withdrawal"::numeric`,
    )
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ALTER COLUMN "date" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ALTER COLUMN "available" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ALTER COLUMN "pending" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AccountingRecord" ALTER COLUMN "withdrawal" SET NOT NULL`)
  })().catch((error) => {
    accountingStorageReadyPromise = null
    throw error
  })

  return accountingStorageReadyPromise
}

async function ensureDefaults() {
  await prisma.category.upsert({
    where: { name: "Genel" },
    create: { name: "Genel" },
    update: {},
  })

  const templateCount = await prisma.template.count()
  if (templateCount === 0) {
    const uniqueCategories = Array.from(new Set(initialTemplates.map((tpl) => tpl.category))).filter(Boolean)
    await prisma.category.createMany({
      data: uniqueCategories.map((name) => ({ name })),
      skipDuplicates: true,
    })
    await prisma.template.createMany({ data: initialTemplates })
  }

  let adminRole = await prisma.role.findUnique({ where: { name: "Admin" } })
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { name: "Admin", permissions: DEFAULT_ADMIN_PERMISSIONS },
    })
  } else {
    const normalizedCurrentPermissions = normalizePermissions(adminRole.permissions)
    const mergedPermissions = Array.from(
      new Set([...normalizedCurrentPermissions, ...DEFAULT_ADMIN_PERMISSIONS]),
    )
    if (mergedPermissions.length !== normalizedCurrentPermissions.length) {
      adminRole = await prisma.role.update({
        where: { id: adminRole.id },
        data: { permissions: mergedPermissions },
      })
    }
  }

  const allRoles = await prisma.role.findMany({
    select: { id: true, permissions: true },
  })
  const rolePermissionUpdates = allRoles
    .map((role) => {
      const normalizedPermissions = normalizePermissions(role.permissions)
      const currentPermissions = Array.isArray(role.permissions)
        ? role.permissions.map((perm) => String(perm ?? "").trim()).filter(Boolean)
        : []
      if (JSON.stringify(normalizedPermissions) === JSON.stringify(currentPermissions)) {
        return null
      }
      return prisma.role.update({
        where: { id: role.id },
        data: { permissions: normalizedPermissions },
      })
    })
    .filter(Boolean)
  if (rolePermissionUpdates.length > 0) {
    await prisma.$transaction(rolePermissionUpdates)
  }

  const automationCount = await prisma.automation.count()
  if (automationCount === 0) {
    await prisma.automation.createMany({ data: initialAutomations })
  }

  await prisma.automationConfig.upsert({
    where: { id: "default" },
    create: { id: "default", wsUrl: null, backendMaps: [] },
    update: {},
  })

  const userCount = await prisma.user.count()
  if (userCount === 0) {
    if (!adminPassword) {
      console.warn("ADMIN_PASSWORD not set; no default admin user created.")
      return
    }
    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash: hashPassword(adminPassword),
        roleId: adminRole.id,
      },
    })
    console.log(`Default admin user created: ${adminUsername}`)
  }
}

const app = express()
app.disable("x-powered-by")

app.use(express.json({ limit: "40mb" }))

const requireAuth = async (req, res, next) => {
  try {
    const token = readAuthToken(req)
    const user = await loadUserForToken(token)
    if (!user) {
      res.status(401).json({ error: "unauthorized" })
      return
    }
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

const requirePermission = (permission) => (req, res, next) => {
  const permissions = req.user?.role?.permissions || []
  if (!permissions.includes(permission)) {
    res.status(403).json({ error: "forbidden" })
    return
  }
  next()
}

const requireAnyPermission = (permissionList) => (req, res, next) => {
  const permissions = req.user?.role?.permissions || []
  const required = Array.isArray(permissionList) ? permissionList : [permissionList]
  if (!required.some((permission) => permissions.includes(permission))) {
    res.status(403).json({ error: "forbidden" })
    return
  }
  next()
}

const PRODUCT_STOCK_FETCH_VIEW_PERMISSIONS = [
  "products.stock.fetch",
  "products.stock.fetch.edit",
  "products.stock.fetch.run",
  "products.stock.fetch.logs.view",
  "products.manage",
]
const PRODUCT_STOCK_FETCH_EDIT_PERMISSIONS = [
  "products.stock.fetch.edit",
  "products.stock.fetch",
  "products.manage",
]
const PRODUCT_STOCK_FETCH_RUN_PERMISSIONS = [
  "products.stock.fetch.run",
  "products.stock.fetch",
  "products.manage",
]
const PRODUCT_STOCK_FETCH_LOGS_PERMISSIONS = [
  "products.stock.fetch.logs.view",
  "products.stock.fetch.run",
  "products.stock.fetch",
  "products.manage",
]
const PRODUCT_STOCK_FETCH_LOGS_CLEAR_PERMISSIONS = [
  "products.stock.fetch.logs.clear",
  "products.manage",
]
const PRODUCT_STOCK_FETCH_STAR_PERMISSIONS = [
  "products.stock.fetch.star",
  "products.stock.fetch.edit",
  "products.stock.fetch",
  "products.manage",
]
const PRODUCT_PRICE_RUN_PERMISSIONS = ["products.price.manage", "products.manage"]
const PRODUCT_PRICE_LOGS_PERMISSIONS = [
  "products.price.command.logs.view",
  "products.price.manage",
  "products.manage",
]
const PRODUCT_PRICE_LOGS_CLEAR_PERMISSIONS = ["products.price.manage", "products.manage"]
const APPLICATION_VIEW_PERMISSIONS = [
  "applications.view",
  "applications.manage",
  "applications.run",
  "applications.logs.view",
  "admin.manage",
]
const APPLICATION_MANAGE_PERMISSIONS = [
  "applications.manage",
  "admin.manage",
]
const APPLICATION_RUN_PERMISSIONS = [
  "applications.run",
  "applications.manage",
  "admin.manage",
]
const APPLICATION_LOGS_VIEW_PERMISSIONS = [
  "applications.logs.view",
  "applications.run",
  "applications.manage",
  "applications.view",
  "admin.manage",
]
const APPLICATION_LOGS_CLEAR_PERMISSIONS = [
  "applications.logs.clear",
  "applications.manage",
  "admin.manage",
]

const normalizeAutomationRunLogEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!id || !time || !status || !message) return null
  return { id, time, status, message }
}

const normalizeEldoradoAutomationRunLogEntry = (entry, offerIdFromRoute = "") => {
  const offerId = String(offerIdFromRoute || entry?.offerId || "").trim()
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!offerId || !id || !time || !status || !message) return null
  return { offerId, id, time, status, message }
}

const normalizeEldoradoPriceCommandRunLogEntry = (entry, offerIdFromRoute = "") => {
  const offerId = String(offerIdFromRoute || entry?.offerId || "").trim()
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!offerId || !id || !time || !status || !message) return null
  return { offerId, id, time, status, message }
}

const normalizeEldoradoPriceCommandBulkLogEntry = (entry, usernameFromUser = "") => {
  const username = String(usernameFromUser || entry?.username || "").trim()
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!username || !id || !time || !status || !message) return null
  return { username, id, time, status, message }
}

const normalizeApplicationPayload = (value) => {
  const name = String(value?.name ?? "").trim()
  const about = String(value?.about ?? "").trim()
  const backendKey = String(value?.backendKey ?? "").trim()
  const backendLabel = String(value?.backendLabel ?? "").trim() || backendKey
  const isActiveRaw = value?.isActive
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : String(isActiveRaw ?? "").trim()
        ? String(isActiveRaw).toLowerCase() === "true"
        : true
  if (!name || !about || !backendKey) return null
  return { name, about, backendKey, backendLabel, isActive }
}

const serializeApplication = (entry) => ({
  id: String(entry?.id ?? "").trim(),
  name: String(entry?.name ?? "").trim(),
  about: String(entry?.about ?? "").trim(),
  backendKey: String(entry?.backendKey ?? "").trim(),
  backendLabel: String(entry?.backendLabel ?? "").trim(),
  isActive: Boolean(entry?.isActive),
  createdAt: entry?.createdAt instanceof Date ? entry.createdAt.toISOString() : null,
  updatedAt: entry?.updatedAt instanceof Date ? entry.updatedAt.toISOString() : null,
})

const normalizeApplicationRunLogEntry = (entry, applicationIdFromRoute = "") => {
  const applicationId = String(applicationIdFromRoute || entry?.applicationId || "").trim()
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!applicationId || !id || !time || !status || !message) return null
  return { applicationId, id, time, status, message }
}

const normalizeEventMessage = (value) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const APPLICATION_RUN_SESSION_LIMIT = 60
const APPLICATION_RUN_RETENTION_MS = 1000 * 60 * 60 * 12
let applicationRunSerial = 0
const applicationRunSessions = new Map()

const formatApplicationRunTime = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

const normalizeApplicationRunPromptOptions = (value) => {
  const raw = Array.isArray(value) ? value : []
  return raw
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const optionValue = String(entry.value ?? entry.key ?? "").trim()
        const optionLabel = String(entry.label ?? entry.name ?? optionValue).trim() || optionValue
        if (!optionValue) return null
        return { value: optionValue, label: optionLabel }
      }
      const normalized = String(entry ?? "").trim()
      if (!normalized) return null
      return { value: normalized, label: normalized }
    })
    .filter(Boolean)
}

const normalizeApplicationRunPromptInputType = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "choice" || normalized === "confirm" || normalized === "text") return normalized
  return "text"
}

const normalizeApplicationRunPrompt = (payload, backendFallback = "") => {
  const inputType = normalizeApplicationRunPromptInputType(payload?.inputType)
  const message =
    String(payload?.message ?? "").trim() ||
    (inputType === "choice"
      ? "Bir secim yapin."
      : inputType === "confirm"
        ? "Onay verin."
        : "Metin girin.")
  const options = normalizeApplicationRunPromptOptions(payload?.options)
  const backend = String(payload?.backend ?? backendFallback ?? "").trim()
  const step = String(payload?.step ?? "").trim()
  const placeholder = String(payload?.placeholder ?? "").trim()
  if (!backend) return null
  if (inputType === "choice" && options.length === 0) return null
  return {
    backend,
    step,
    inputType,
    message,
    options,
    placeholder,
  }
}

const isApplicationRunLiveStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  return normalized === "running" || normalized === "connecting"
}

const sortApplicationRunsDesc = (a, b) => {
  const startedDiff = Number(b?.startedAtMs ?? 0) - Number(a?.startedAtMs ?? 0)
  if (startedDiff !== 0) return startedDiff
  return String(b?.id ?? "").localeCompare(String(a?.id ?? ""))
}

const cloneApplicationRunPrompt = (entry) => {
  if (!entry || typeof entry !== "object") return null
  const normalized = normalizeApplicationRunPrompt(entry, entry.backend)
  if (!normalized) return null
  return {
    ...normalized,
    options: normalized.options.map((option) => ({ ...option })),
  }
}

const serializeApplicationRunSession = (entry) => {
  if (!entry || typeof entry !== "object") return null
  return {
    id: String(entry.id ?? "").trim(),
    label: String(entry.label ?? "").trim(),
    serial: Number(entry.serial ?? 0) || 0,
    applicationId: String(entry.applicationId ?? "").trim(),
    applicationName: String(entry.applicationName ?? "").trim(),
    applicationAbout: String(entry.applicationAbout ?? "").trim(),
    backendKey: String(entry.backendKey ?? "").trim(),
    backendLabel: String(entry.backendLabel ?? "").trim(),
    status: String(entry.status ?? "").trim() || "error",
    connectionState: String(entry.connectionState ?? "").trim() || "idle",
    startedAtMs: Number(entry.startedAtMs ?? 0) || 0,
    endedAtMs: Number(entry.endedAtMs ?? 0) || 0,
    createdByUsername: String(entry.createdByUsername ?? "").trim(),
    pendingPrompt: cloneApplicationRunPrompt(entry.pendingPrompt),
  }
}

const serializeApplicationRunLog = (entry) => {
  if (!entry || typeof entry !== "object") return null
  const id = String(entry.id ?? "").trim()
  const time = String(entry.time ?? "").trim()
  const status = String(entry.status ?? "").trim()
  const message = String(entry.message ?? "").trim()
  if (!id || !time || !status || !message) return null
  return { id, time, status, message }
}

const persistApplicationHistoryLog = async (applicationId, status, message) => {
  const normalizedApplicationId = String(applicationId ?? "").trim()
  const normalizedMessage = String(message ?? "").trim()
  const normalizedStatus = String(status ?? "").trim() || "running"
  if (!normalizedApplicationId || !normalizedMessage) return

  const entry = {
    id: `app-log-${Date.now()}-${crypto.randomUUID()}`,
    applicationId: normalizedApplicationId,
    time: formatApplicationRunTime(),
    status: normalizedStatus,
    message: normalizedMessage,
  }

  try {
    await prisma.applicationRunLog.create({ data: entry })

    const overflow = await prisma.applicationRunLog.findMany({
      where: { applicationId: normalizedApplicationId },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: APPLICATION_LOG_LIMIT,
    })
    if (overflow.length > 0) {
      await prisma.applicationRunLog.deleteMany({
        where: { id: { in: overflow.map((item) => item.id) } },
      })
    }
  } catch (error) {
    console.error("Application run log persistence failed", error)
  }
}

const queueApplicationHistoryLog = (applicationId, status, message) => {
  void persistApplicationHistoryLog(applicationId, status, message)
}

const isSocketIoClientSocket = (socket) =>
  Boolean(socket && typeof socket.emit === "function" && typeof socket.disconnect === "function")

const buildSocketIoClientTarget = (rawUrl, extraQuery = {}) => {
  try {
    const parsed = new URL(rawUrl)
    const normalizedProtocol =
      parsed.protocol === "ws:" ? "http:" : parsed.protocol === "wss:" ? "https:" : parsed.protocol
    const origin = `${normalizedProtocol}//${parsed.host}`
    const pathName = /\/socket\.io\/?$/i.test(parsed.pathname)
      ? parsed.pathname.endsWith("/")
        ? parsed.pathname
        : `${parsed.pathname}/`
      : "/socket.io/"
    const query = {}

    parsed.searchParams.forEach((value, key) => {
      const normalizedValue = String(value ?? "").trim()
      if (normalizedValue) {
        query[key] = normalizedValue
      }
    })

    Object.entries(extraQuery).forEach(([key, value]) => {
      const normalizedValue = String(value ?? "").trim()
      if (normalizedValue) {
        query[key] = normalizedValue
      } else {
        delete query[key]
      }
    })

    return { origin, pathName, query }
  } catch {
    return null
  }
}

const closeApplicationRunSocket = (run) => {
  if (!run || typeof run !== "object") return
  const socket = run.socket
  run.socket = null
  if (!socket) return
  try {
    if (isSocketIoClientSocket(socket)) {
      socket.disconnect()
    } else if (typeof socket.close === "function") {
      socket.close()
    }
  } catch {
    // Ignore close errors.
  }
}

const appendApplicationRunLog = (run, status, message, options = {}) => {
  if (!run || typeof run !== "object") return null
  const normalizedMessage = String(message ?? "").trim()
  if (!normalizedMessage) return null
  const entry = {
    id: `run-log-${Date.now()}-${crypto.randomUUID()}`,
    time: formatApplicationRunTime(),
    status: String(status ?? "").trim() || "running",
    message: normalizedMessage,
  }

  const currentLogs = Array.isArray(run.logs) ? run.logs : []
  run.logs = [entry, ...currentLogs].slice(0, APPLICATION_LOG_LIMIT)

  if (options.persist !== false) {
    const runLabel = String(run.label ?? "").trim()
    const historyMessage = runLabel ? `[${runLabel}] ${normalizedMessage}` : normalizedMessage
    queueApplicationHistoryLog(run.applicationId, entry.status, historyMessage)
  }

  return entry
}

const completeApplicationRun = (run, status, message = "") => {
  if (!run || typeof run !== "object" || run.settled) return
  run.settled = true
  run.pendingPrompt = null
  run.status = String(status ?? "").trim() || "error"
  run.connectionState = run.status === "error" ? "error" : run.hasConnected ? "connected" : "idle"
  run.endedAtMs = Date.now()
  if (message) {
    appendApplicationRunLog(run, run.status, message)
  }
  closeApplicationRunSocket(run)
}

const sendApplicationRunSocketEvent = (run, eventName, payload) => {
  if (!run || typeof run !== "object") return false
  const socket = run.socket
  if (!socket) return false
  const normalizedEventName = String(eventName ?? "").trim()
  if (!normalizedEventName) return false
  try {
    if (isSocketIoClientSocket(socket)) {
      if (!socket.connected) return false
      socket.emit(normalizedEventName, payload ?? {})
      return true
    }

    const webSocketApi = globalThis.WebSocket
    if (!webSocketApi || socket.readyState !== webSocketApi.OPEN) return false
    socket.send(`42${JSON.stringify([normalizedEventName, payload ?? {}])}`)
    return true
  } catch {
    return false
  }
}

const pruneApplicationRunSessions = () => {
  const now = Date.now()
  const completedRuns = Array.from(applicationRunSessions.values())
    .filter((run) => !isApplicationRunLiveStatus(run.status))
    .sort(sortApplicationRunsDesc)

  completedRuns.forEach((run, index) => {
    const endedAtMs = Number(run.endedAtMs ?? 0) || Number(run.startedAtMs ?? 0)
    const ageMs = now - endedAtMs
    const shouldRemove = index >= APPLICATION_RUN_SESSION_LIMIT || ageMs > APPLICATION_RUN_RETENTION_MS
    if (!shouldRemove) return
    closeApplicationRunSocket(run)
    applicationRunSessions.delete(run.id)
  })
}

const canManageApplicationRuns = (user) => {
  const permissions = user?.role?.permissions || []
  return permissions.includes("applications.manage") || permissions.includes("admin.manage")
}

const canAccessApplicationRunSession = (run, user) => {
  if (!run || !user) return false
  if (canManageApplicationRuns(user)) return true
  return String(run.createdByUsername ?? "").trim() === String(user?.username ?? "").trim()
}

const createApplicationRunSession = ({ application, wsUrl, username }) => {
  pruneApplicationRunSessions()

  applicationRunSerial += 1
  const serial = applicationRunSerial
  const startedAtMs = Date.now()
  const run = {
    id: `service-run-${startedAtMs}-${serial}`,
    label: `${application.name} #${serial}`,
    serial,
    applicationId: String(application.id ?? "").trim(),
    applicationName: String(application.name ?? "").trim(),
    applicationAbout: String(application.about ?? "").trim(),
    backendKey: String(application.backendKey ?? "").trim(),
    backendLabel:
      String(application.backendLabel ?? application.backendKey ?? "").trim() ||
      String(application.backendKey ?? "").trim(),
    status: "connecting",
    connectionState: "connecting",
    startedAtMs,
    endedAtMs: 0,
    createdByUsername: String(username ?? "").trim() || "bilinmeyen-kullanici",
    pendingPrompt: null,
    logs: [],
    socket: null,
    settled: false,
    hasConnected: false,
    hasResult: false,
    hasSocketErrorSignal: false,
  }

  applicationRunSessions.set(run.id, run)

  appendApplicationRunLog(run, "running", `Calistiran: ${run.createdByUsername}`)
  appendApplicationRunLog(run, "running", `Calistiriliyor: ${run.applicationName}`)
  appendApplicationRunLog(run, "running", `Backend map: ${run.backendLabel}`)

  const socketTarget = buildSocketIoClientTarget(wsUrl, { backend: run.backendKey })
  if (!socketTarget) {
    completeApplicationRun(run, "error", `${run.applicationName} icin Socket.IO adresi olusturulamadi.`)
    return run
  }

  let socket = null
  try {
    socket = createSocketIoClient(socketTarget.origin, {
      path: socketTarget.pathName,
      query: socketTarget.query,
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
      timeout: 15000,
    })
  } catch {
    completeApplicationRun(run, "error", `${run.applicationName} icin websocket baglantisi baslatilamadi.`)
    return run
  }

  run.socket = socket

  socket.on("connect", () => {
    if (run.settled) return
    if (run.hasSocketErrorSignal) {
      run.hasSocketErrorSignal = false
      appendApplicationRunLog(run, "running", `${run.applicationName} websocket baglantisi toparlandi, islem devam ediyor.`)
    } else if (!run.hasConnected) {
      appendApplicationRunLog(run, "running", `${run.applicationName} baglandi.`)
    }
    run.hasConnected = true
    run.status = "running"
    run.connectionState = "connected"
  })

  socket.on("script-triggered", () => {
    if (run.settled) return
    appendApplicationRunLog(run, "running", `${run.backendLabel} script baslatildi.`)
  })

  socket.on("script-started", () => {
    if (run.settled) return
    appendApplicationRunLog(run, "running", `${run.backendLabel} script baslatildi.`)
  })

  socket.on("durum", (payload) => {
    if (run.settled) return
    const lines = normalizeEventMessage(
      typeof payload?.message === "string" || typeof payload?.message === "number" ? payload.message : payload,
    )
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      appendApplicationRunLog(run, "running", `${run.backendLabel} => -`)
      return
    }

    lines.forEach((line) => {
      appendApplicationRunLog(run, "running", `${run.backendLabel} => ${line}`)
    })
  })

  socket.on("script-log", (payload) => {
    if (run.settled) return
    const stream = String(payload?.stream ?? "").trim().toLowerCase()
    const lines = String(payload?.message ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    lines.forEach((line) => {
      appendApplicationRunLog(run, stream === "stderr" ? "error" : "running", line)
    })
  })

  socket.on("kullanici-girdisi-gerekli", (payload) => {
    if (run.settled) return
    const promptBackend = String(payload?.backend ?? run.backendKey).trim() || run.backendKey
    const prompt = normalizeApplicationRunPrompt(payload, promptBackend)
    if (prompt) {
      run.pendingPrompt = prompt
      appendApplicationRunLog(run, "running", `${run.backendLabel} => ${prompt.message}`)
    }
  })

  socket.on("sonuc", (payload) => {
    if (run.settled) return
    const valueText =
      typeof payload?.value === "string"
        ? payload.value.trim()
        : payload?.value === undefined || payload?.value === null
          ? String(payload ?? "").trim()
          : String(payload.value).trim()
    appendApplicationRunLog(run, "success", `${run.backendLabel} => ${valueText || "-"}`)
    run.hasResult = true
    completeApplicationRun(run, "success", `${run.applicationName}: Servis hatasiz bitirildi.`)
  })

  socket.on("script-exit", (payload) => {
    if (run.settled) return
    const exitCode = Number(payload?.code ?? payload?.exitCode)
    if (Number.isFinite(exitCode)) {
      appendApplicationRunLog(
        run,
        exitCode === 0 ? "success" : "error",
        `Script cikti. Kod: ${exitCode}`,
      )
    }
    if (!run.hasResult) {
      completeApplicationRun(run, "error", `${run.applicationName} cikti ancak sonuc alinmadi.`)
    }
  })

  socket.on("connect_error", (error) => {
    if (run.settled) return
    const reason = String(error?.message ?? "").trim()
    if (run.hasConnected) {
      run.hasSocketErrorSignal = true
      run.status = "running"
      run.connectionState = "connecting"
      appendApplicationRunLog(
        run,
        "running",
        reason
          ? `${run.applicationName} websocket baglanti hatasi algiladi: ${reason}`
          : `${run.applicationName} websocket baglanti hatasi algiladi, baglanti takip ediliyor...`,
      )
      return
    }

    completeApplicationRun(
      run,
      "error",
      reason
        ? `${run.applicationName} icin websocket baglantisi baslatilamadi: ${reason}`
        : `${run.applicationName} icin websocket baglantisi baslatilamadi.`,
    )
  })

  socket.on("disconnect", (reason) => {
    if (run.settled) return
    run.socket = null
    const normalizedReason = String(reason ?? "").trim()
    if (run.hasResult) {
      completeApplicationRun(run, "success", `${run.applicationName}: Servis hatasiz bitirildi.`)
      return
    }
    if (run.hasConnected) {
      completeApplicationRun(
        run,
        "error",
        normalizedReason
          ? `${run.applicationName} baglantisi sonuc gelmeden kapandi. Sebep: ${normalizedReason}`
          : `${run.applicationName} baglantisi acildi ancak sonuc gelmedi.`,
      )
      return
    }
    completeApplicationRun(
      run,
      "error",
      normalizedReason
        ? `${run.applicationName} icin websocket baglantisi kapandi. Sebep: ${normalizedReason}`
        : `${run.applicationName} icin websocket baglantisi kapandi.`,
    )
  })

  return run
}

const ELDORADO_RUN_RETENTION_MS = 1000 * 60 * 60 * 12
const AUTOMATION_STAR_PREFIX = "\u2605 "
const eldoradoAutomationRunsByOffer = new Map()
const eldoradoPriceCommandRunsByOffer = new Map()

const persistEldoradoAutomationHistoryLog = async (offerId, status, message) => {
  const normalizedOfferId = String(offerId ?? "").trim()
  const normalizedMessage = String(message ?? "").trim()
  const normalizedStatus = String(status ?? "").trim() || "running"
  if (!normalizedOfferId || !normalizedMessage) return

  const entry = {
    id: `eldorado-auto-log-${Date.now()}-${crypto.randomUUID()}`,
    offerId: normalizedOfferId,
    time: formatApplicationRunTime(),
    status: normalizedStatus,
    message: normalizedMessage,
  }

  try {
    await prisma.eldoradoAutomationRunLog.create({ data: entry })

    const overflow = await prisma.eldoradoAutomationRunLog.findMany({
      where: { offerId: normalizedOfferId },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: ELDORADO_AUTOMATION_LOG_LIMIT,
    })
    if (overflow.length > 0) {
      await prisma.eldoradoAutomationRunLog.deleteMany({
        where: { id: { in: overflow.map((item) => item.id) } },
      })
    }
  } catch (error) {
    console.error("Eldorado automation log persistence failed", error)
  }
}

const persistEldoradoPriceCommandHistoryLog = async (offerId, status, message) => {
  const normalizedOfferId = String(offerId ?? "").trim()
  const normalizedMessage = String(message ?? "").trim()
  const normalizedStatus = String(status ?? "").trim() || "running"
  if (!normalizedOfferId || !normalizedMessage) return

  const entry = {
    id: `eldorado-price-log-${Date.now()}-${crypto.randomUUID()}`,
    offerId: normalizedOfferId,
    time: formatApplicationRunTime(),
    status: normalizedStatus,
    message: normalizedMessage,
  }

  try {
    await prisma.eldoradoPriceCommandRunLog.create({ data: entry })

    const overflow = await prisma.eldoradoPriceCommandRunLog.findMany({
      where: { offerId: normalizedOfferId },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: ELDORADO_PRICE_COMMAND_LOG_LIMIT,
    })
    if (overflow.length > 0) {
      await prisma.eldoradoPriceCommandRunLog.deleteMany({
        where: { id: { in: overflow.map((item) => item.id) } },
      })
    }
  } catch (error) {
    console.error("Eldorado price command log persistence failed", error)
  }
}

const queueEldoradoAutomationHistoryLog = (offerId, status, message) => {
  void persistEldoradoAutomationHistoryLog(offerId, status, message)
}

const queueEldoradoPriceCommandHistoryLog = (offerId, status, message) => {
  void persistEldoradoPriceCommandHistoryLog(offerId, status, message)
}

const closeEldoradoAutomationSocket = (run) => {
  if (!run || typeof run !== "object") return
  const socket = run.socket
  run.socket = null
  if (!socket) return
  try {
    socket.close()
  } catch {
    // Ignore close errors.
  }
}

const closeEldoradoPriceCommandSocket = (run) => {
  if (!run || typeof run !== "object") return
  const socket = run.socket
  run.socket = null
  if (!socket) return
  try {
    socket.close()
  } catch {
    // Ignore close errors.
  }
}

const clearEldoradoAutomationRunTimeout = (run) => {
  if (!run?.timeoutId) return
  clearTimeout(run.timeoutId)
  run.timeoutId = null
}

const clearEldoradoPriceCommandRunTimeout = (run) => {
  if (!run?.timeoutId) return
  clearTimeout(run.timeoutId)
  run.timeoutId = null
}

const appendEldoradoAutomationRunLog = (run, status, message, options = {}) => {
  if (!run || typeof run !== "object") return null
  const normalizedMessage = String(message ?? "").trim()
  if (!normalizedMessage) return null
  const entry = {
    id: `eldorado-auto-run-log-${Date.now()}-${crypto.randomUUID()}`,
    time: formatApplicationRunTime(),
    status: String(status ?? "").trim() || "running",
    message: normalizedMessage,
  }
  const currentLogs = Array.isArray(run.logs) ? run.logs : []
  run.logs = [entry, ...currentLogs].slice(0, ELDORADO_AUTOMATION_LOG_LIMIT)
  if (options.persist !== false) {
    queueEldoradoAutomationHistoryLog(run.offerId, entry.status, normalizedMessage)
  }
  return entry
}

const appendEldoradoPriceCommandRunLog = (run, status, message, options = {}) => {
  if (!run || typeof run !== "object") return null
  const normalizedMessage = String(message ?? "").trim()
  if (!normalizedMessage) return null
  const entry = {
    id: `eldorado-price-run-log-${Date.now()}-${crypto.randomUUID()}`,
    time: formatApplicationRunTime(),
    status: String(status ?? "").trim() || "running",
    message: normalizedMessage,
  }
  const currentLogs = Array.isArray(run.logs) ? run.logs : []
  run.logs = [entry, ...currentLogs].slice(0, ELDORADO_PRICE_COMMAND_LOG_LIMIT)
  if (options.persist !== false) {
    queueEldoradoPriceCommandHistoryLog(run.offerId, entry.status, normalizedMessage)
  }
  return entry
}

const cloneEldoradoAutomationPrompt = (prompt) => {
  if (!prompt || typeof prompt !== "object") return null
  const backend = String(prompt.backend ?? "").trim()
  const message = String(prompt.message ?? "").trim()
  if (!backend) return null
  return { backend, message }
}

const cloneEldoradoAutomationResultPopup = (value) => {
  if (!value || typeof value !== "object") return null
  return {
    title: String(value.title ?? "").trim(),
    backend: String(value.backend ?? "").trim(),
    value: String(value.value ?? "").trim(),
  }
}

const serializeEldoradoAutomationRun = (run) => {
  if (!run || typeof run !== "object") return null
  const lastLog = Array.isArray(run.logs) ? run.logs[0] : null
  return {
    id: String(run.id ?? "").trim(),
    offerId: String(run.offerId ?? "").trim(),
    label: String(run.label ?? "").trim(),
    status: String(run.status ?? "").trim() || "error",
    connectionState: String(run.connectionState ?? "").trim() || "idle",
    startedAtMs: Number(run.startedAtMs ?? 0) || 0,
    endedAtMs: Number(run.endedAtMs ?? 0) || 0,
    lastMessage: String(lastLog?.message ?? "").trim(),
    pendingTwoFactorPrompt: cloneEldoradoAutomationPrompt(run.pendingTwoFactorPrompt),
    resultPopup: cloneEldoradoAutomationResultPopup(run.resultPopup),
  }
}

const serializeEldoradoPriceCommandRun = (run) => {
  if (!run || typeof run !== "object") return null
  const lastLog = Array.isArray(run.logs) ? run.logs[0] : null
  return {
    id: String(run.id ?? "").trim(),
    offerId: String(run.offerId ?? "").trim(),
    label: String(run.label ?? "").trim(),
    status: String(run.status ?? "").trim() || "error",
    connectionState: String(run.connectionState ?? "").trim() || "idle",
    startedAtMs: Number(run.startedAtMs ?? 0) || 0,
    endedAtMs: Number(run.endedAtMs ?? 0) || 0,
    category: String(run.category ?? "").trim(),
    result: Number(run.result ?? Number.NaN),
    lastMessage: String(lastLog?.message ?? "").trim(),
  }
}

const serializeManagedRunLogEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null
  const id = String(entry.id ?? "").trim()
  const time = String(entry.time ?? "").trim()
  const status = String(entry.status ?? "").trim()
  const message = String(entry.message ?? "").trim()
  if (!id || !time || !status || !message) return null
  return { id, time, status, message }
}

const pruneEldoradoAutomationRuns = () => {
  const now = Date.now()
  Array.from(eldoradoAutomationRunsByOffer.entries()).forEach(([offerId, run]) => {
    if (isApplicationRunLiveStatus(run?.status)) return
    const referenceMs = Number(run?.endedAtMs ?? 0) || Number(run?.startedAtMs ?? 0)
    if (referenceMs <= 0 || now - referenceMs <= ELDORADO_RUN_RETENTION_MS) return
    closeEldoradoAutomationSocket(run)
    eldoradoAutomationRunsByOffer.delete(offerId)
  })
}

const pruneEldoradoPriceCommandRuns = () => {
  const now = Date.now()
  Array.from(eldoradoPriceCommandRunsByOffer.entries()).forEach(([offerId, run]) => {
    if (isApplicationRunLiveStatus(run?.status)) return
    const referenceMs = Number(run?.endedAtMs ?? 0) || Number(run?.startedAtMs ?? 0)
    if (referenceMs <= 0 || now - referenceMs <= ELDORADO_RUN_RETENTION_MS) return
    closeEldoradoPriceCommandSocket(run)
    eldoradoPriceCommandRunsByOffer.delete(offerId)
  })
}

const buildEldoradoAutomationBackendDisplay = (run, backendOverride = "") => {
  if (!run || typeof run !== "object") return ""
  const rawBackend = String(backendOverride || run.backend || "").trim()
  if (!rawBackend) return ""
  return rawBackend === run.backend && run.starred ? `${AUTOMATION_STAR_PREFIX}${rawBackend}` : rawBackend
}

const finalizeEldoradoAutomationCopyValue = (run, rawValue) => {
  const normalizedRawValue =
    typeof rawValue === "string"
      ? rawValue
      : rawValue === null || rawValue === undefined
        ? ""
        : (() => {
            try {
              return JSON.stringify(rawValue)
            } catch {
              return String(rawValue)
            }
          })()
  const normalizedLogValue = String(run?.copyValueFromScriptLog ?? "")
  const trimmedRawValue = normalizedRawValue.trim()
  const trimmedLogValue = normalizedLogValue.trim()
  const hasMultilineLogValue =
    Array.isArray(run?.copyValueLines) && (run.copyValueLines.length > 1 || normalizedLogValue.includes("\n"))
  const useLogValueAsFallback =
    Boolean(trimmedLogValue) &&
    (hasMultilineLogValue ||
      !trimmedRawValue ||
      (!normalizedRawValue.includes("\n") && trimmedLogValue.length > trimmedRawValue.length))
  return (useLogValueAsFallback ? trimmedLogValue : normalizedRawValue) || ""
}

const completeEldoradoAutomationRun = (run, status, message = "") => {
  if (!run || typeof run !== "object" || run.settled) return
  run.settled = true
  run.status = String(status ?? "").trim() || "error"
  run.connectionState = run.status === "error" ? "error" : run.hasConnected ? "connected" : "idle"
  run.endedAtMs = Date.now()
  run.pendingTwoFactorPrompt = null
  clearEldoradoAutomationRunTimeout(run)
  if (message) {
    appendEldoradoAutomationRunLog(run, run.status, message)
  }
  closeEldoradoAutomationSocket(run)
}

const completeEldoradoPriceCommandRun = (run, status, message = "") => {
  if (!run || typeof run !== "object" || run.settled) return
  run.settled = true
  run.status = String(status ?? "").trim() || "error"
  run.connectionState = run.status === "error" ? "error" : run.hasConnected ? "connected" : "idle"
  run.endedAtMs = Date.now()
  clearEldoradoPriceCommandRunTimeout(run)
  if (message) {
    appendEldoradoPriceCommandRunLog(run, run.status, message)
  }
  closeEldoradoPriceCommandSocket(run)
}

const resetEldoradoAutomationRunTimeout = (run, ms = 20000) => {
  if (!run || typeof run !== "object") return
  clearEldoradoAutomationRunTimeout(run)
  run.timeoutId = setTimeout(() => {
    if (run.hasResult) {
      completeEldoradoAutomationRun(run, "success", `${run.label} tamamlandi.`)
      return
    }
    completeEldoradoAutomationRun(run, "error", `${run.label} icin sonuc yaniti alinmadi (zaman asimi).`)
  }, ms)
}

const resetEldoradoPriceCommandRunTimeout = (run, ms = 120000) => {
  if (!run || typeof run !== "object") return
  clearEldoradoPriceCommandRunTimeout(run)
  run.timeoutId = setTimeout(() => {
    if (run.hasResult) {
      completeEldoradoPriceCommandRun(run, "success", `${run.label} tamamlandi.`)
      return
    }
    completeEldoradoPriceCommandRun(run, "error", `${run.label} icin sonuc yaniti alinmadi (zaman asimi).`)
  }, ms)
}

const sendEldoradoAutomationSocketEvent = (run, eventName, payload) => {
  if (!run || typeof run !== "object") return false
  const socket = run.socket
  const webSocketApi = globalThis.WebSocket
  if (!webSocketApi || !socket || socket.readyState !== webSocketApi.OPEN) return false
  const normalizedEventName = String(eventName ?? "").trim()
  if (!normalizedEventName) return false
  try {
    socket.send(`42${JSON.stringify([normalizedEventName, payload ?? {}])}`)
    return true
  } catch {
    return false
  }
}

const createEldoradoAutomationRun = ({ offerId, backend, url, starred = false, label, username, wsUrl }) => {
  pruneEldoradoAutomationRuns()

  const normalizedOfferId = String(offerId ?? "").trim()
  const normalizedBackend = String(backend ?? "").trim()
  const normalizedUrl = String(url ?? "").trim()
  const normalizedLabel = String(label ?? "").trim() || "Stok cek"
  const existingRun = eldoradoAutomationRunsByOffer.get(normalizedOfferId)
  if (existingRun && isApplicationRunLiveStatus(existingRun.status)) {
    return { run: existingRun, conflict: true }
  }

  const startedAtMs = Date.now()
  const run = {
    id: `eldorado-automation-run-${startedAtMs}-${crypto.randomUUID()}`,
    offerId: normalizedOfferId,
    backend: normalizedBackend,
    url: normalizedUrl,
    starred: Boolean(starred),
    label: normalizedLabel,
    status: "connecting",
    connectionState: "connecting",
    startedAtMs,
    endedAtMs: 0,
    logs: [],
    socket: null,
    settled: false,
    hasConnected: false,
    hasResult: false,
    timeoutId: null,
    pendingTwoFactorPrompt: null,
    resultPopup: null,
    copyValueFromScriptLog: "",
    copyValueCaptureActive: false,
    copyValueLines: [],
  }

  eldoradoAutomationRunsByOffer.set(normalizedOfferId, run)

  appendEldoradoAutomationRunLog(run, "running", `Calistiran: ${String(username ?? "").trim() || "bilinmeyen-kullanici"}`)
  appendEldoradoAutomationRunLog(
    run,
    "running",
    `${normalizedLabel} tetikleniyor... backend=${buildEldoradoAutomationBackendDisplay(run)}, url=${normalizedUrl}`,
  )

  const triggerUrl = buildSocketIoWsUrl(wsUrl, { backend: normalizedBackend, url: normalizedUrl })
  if (!triggerUrl) {
    completeEldoradoAutomationRun(run, "error", "Socket.IO adresi olusturulamadi.")
    return { run, conflict: false }
  }

  const WebSocketApi = globalThis.WebSocket
  if (!WebSocketApi) {
    completeEldoradoAutomationRun(run, "error", "Sunucu ortami WebSocket istemcisini desteklemiyor.")
    return { run, conflict: false }
  }

  let socket = null
  try {
    socket = new WebSocketApi(triggerUrl)
  } catch {
    completeEldoradoAutomationRun(run, "error", `${normalizedLabel} icin websocket baglantisi baslatilamadi.`)
    return { run, conflict: false }
  }

  run.socket = socket
  resetEldoradoAutomationRunTimeout(run, 15000)

  socket.addEventListener("message", (event) => {
    if (run.settled) return
    const payload = typeof event.data === "string" ? event.data : ""
    if (!payload) return
    const packets = splitEnginePackets(payload)

    for (const packet of packets) {
      if (run.settled) return

      if (packet === "2") {
        try {
          socket.send("3")
        } catch {
          // Ignore pong send errors.
        }
        continue
      }

      if (packet.startsWith("0{")) {
        try {
          socket.send("40")
        } catch {
          completeEldoradoAutomationRun(run, "error", `${run.label} icin Socket.IO connect paketi gonderilemedi.`)
        }
        continue
      }

      if (packet.startsWith("40")) {
        if (!run.hasConnected) {
          appendEldoradoAutomationRunLog(run, "running", "Baglandi.")
        }
        run.hasConnected = true
        run.status = "running"
        run.connectionState = "connected"
        resetEldoradoAutomationRunTimeout(run, 300000)
        continue
      }

      if (packet.startsWith("41")) {
        if (run.hasResult) {
          completeEldoradoAutomationRun(run, "success", `${run.label} tamamlandi.`)
        } else {
          completeEldoradoAutomationRun(run, "error", `${run.label} tamamlanmadan baglanti kapandi (sonuc yok).`)
        }
        return
      }

      if (packet.startsWith("44")) {
        completeEldoradoAutomationRun(
          run,
          "error",
          `${run.label} tetiklenemedi. backend=${buildEldoradoAutomationBackendDisplay(run)}`,
        )
        return
      }

      const eventPacket = parseSocketIoEventPacket(packet)
      if (!eventPacket) continue
      const eventName = String(eventPacket.event ?? "").trim().toLowerCase()
      const firstArg = eventPacket.args[0]

      if (eventName === "script-triggered" || eventName === "script-started") {
        appendEldoradoAutomationRunLog(
          run,
          "running",
          `${buildEldoradoAutomationBackendDisplay(run)} script baslatildi.`,
        )
        resetEldoradoAutomationRunTimeout(run, 300000)
        continue
      }

      if (eventName === "script-log") {
        const stream = String(firstArg?.stream ?? "").trim().toLowerCase()
        const rawMessage = String(firstArg?.message ?? "")
        if (rawMessage) {
          const marker = "COPY_VALUE:"
          const markerIndex = rawMessage.replace(/\r/g, "").indexOf(marker)
          if (markerIndex >= 0) {
            run.copyValueCaptureActive = true
            run.copyValueLines = []
            const seededLines = rawMessage
              .replace(/\r/g, "")
              .slice(markerIndex + marker.length)
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
            if (seededLines.length > 0) {
              run.copyValueLines.push(...seededLines)
              run.copyValueFromScriptLog = run.copyValueLines.join("\n")
            }
          } else if (run.copyValueCaptureActive) {
            const appendedLines = rawMessage
              .replace(/\r/g, "")
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .filter((line) => !/^\[[^\]]+\]/.test(line) && !line.startsWith("Script "))
            if (appendedLines.length > 0) {
              run.copyValueLines.push(...appendedLines)
              run.copyValueFromScriptLog = run.copyValueLines.join("\n").trim()
            }
          }

          rawMessage
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
              appendEldoradoAutomationRunLog(run, stream === "stderr" ? "error" : "running", line)
            })
        }
        resetEldoradoAutomationRunTimeout(run, 300000)
        continue
      }

      if (eventName === "iki-faktor-gerekli") {
        const promptBackend = String(firstArg?.backend ?? run.backend).trim() || run.backend
        const promptMessage =
          (typeof firstArg?.message === "string" ? firstArg.message : normalizeEventMessage(firstArg?.message ?? firstArg))
            .replace(/\s+/g, " ")
            .trim() || "Iki faktor kodu gerekli."
        run.pendingTwoFactorPrompt = {
          backend: promptBackend,
          message: promptMessage,
        }
        appendEldoradoAutomationRunLog(
          run,
          "running",
          `${buildEldoradoAutomationBackendDisplay(run, promptBackend)} => ${promptMessage}`,
        )
        resetEldoradoAutomationRunTimeout(run, 300000)
        continue
      }

      if (eventName === "durum") {
        const durumBackend = String(firstArg?.backend ?? run.backend).trim() || run.backend
        const lines = normalizeEventMessage(firstArg?.message ?? firstArg)
          .replace(/\r/g, "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

        if (lines.length === 0) {
          appendEldoradoAutomationRunLog(run, "running", `${buildEldoradoAutomationBackendDisplay(run, durumBackend)} => -`)
        } else {
          lines.forEach((line) => {
            appendEldoradoAutomationRunLog(
              run,
              "running",
              `${buildEldoradoAutomationBackendDisplay(run, durumBackend)} => ${line}`,
            )
          })
        }
        resetEldoradoAutomationRunTimeout(run, 300000)
        continue
      }

      if (eventName === "script-exit") {
        run.copyValueCaptureActive = false
        const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
        if (Number.isFinite(exitCode)) {
          appendEldoradoAutomationRunLog(
            run,
            exitCode === 0 ? "success" : "error",
            `Script cikti. Kod: ${exitCode}`,
          )
        } else {
          appendEldoradoAutomationRunLog(run, "running", "Script cikis olayi alindi.")
        }
        if (!run.hasResult) {
          completeEldoradoAutomationRun(run, "error", `${run.label} cikti ancak sonuc alinmadi.`)
          return
        }
        resetEldoradoAutomationRunTimeout(run, 5000)
        continue
      }

      if (eventName === "sonuc") {
        const resultBackend = String(firstArg?.backend ?? run.backend).trim() || run.backend
        const finalValue = finalizeEldoradoAutomationCopyValue(run, firstArg?.value)
        const valueText = String(finalValue ?? "").trim()
        const backendDisplay = buildEldoradoAutomationBackendDisplay(run, resultBackend)
        appendEldoradoAutomationRunLog(run, "success", `${backendDisplay} => ${valueText || "-"}`)
        run.resultPopup = {
          title: run.label,
          backend: backendDisplay,
          value: valueText || "-",
        }
        run.copyValueCaptureActive = false
        run.hasResult = true
        completeEldoradoAutomationRun(run, "success", `${run.label} tamamlandi.`)
        return
      }

      resetEldoradoAutomationRunTimeout(run, 300000)
    }
  })

  socket.addEventListener("error", () => {
    run.connectionState = "error"
    completeEldoradoAutomationRun(run, "error", `${run.label} icin websocket baglanti hatasi olustu.`)
  })

  socket.addEventListener("close", () => {
    if (run.settled) return
    if (run.hasResult) {
      completeEldoradoAutomationRun(run, "success", `${run.label} tamamlandi.`)
      return
    }
    if (run.hasConnected) {
      completeEldoradoAutomationRun(run, "error", `${run.label} baglantisi acildi ancak sonuc gelmedi.`)
      return
    }
    completeEldoradoAutomationRun(run, "error", `${run.label} icin websocket baglantisi kapandi.`)
  })

  return { run, conflict: false }
}

const createEldoradoPriceCommandRun = ({
  offerId,
  category,
  result,
  label,
  username,
  backendKey,
  backendLabel,
  wsUrl,
}) => {
  pruneEldoradoPriceCommandRuns()

  const normalizedOfferId = String(offerId ?? "").trim()
  const existingRun = eldoradoPriceCommandRunsByOffer.get(normalizedOfferId)
  if (existingRun && isApplicationRunLiveStatus(existingRun.status)) {
    return { run: existingRun, conflict: true }
  }

  const normalizedCategory = String(category ?? "").trim()
  const normalizedResult = roundPriceNumber(result)
  const normalizedResultToken = formatRoundedPriceNumber(normalizedResult)
  const normalizedLabel = String(label ?? "").trim() || "Sonucu Gonder"
  const normalizedBackendKey = String(backendKey ?? "").trim() || "eldorado"
  const normalizedBackendLabel =
    String(backendLabel ?? normalizedBackendKey).trim() || normalizedBackendKey
  const startedAtMs = Date.now()
  const run = {
    id: `eldorado-price-command-run-${startedAtMs}-${crypto.randomUUID()}`,
    offerId: normalizedOfferId,
    category: normalizedCategory,
    result: normalizedResult,
    label: normalizedLabel,
    backendKey: normalizedBackendKey,
    backendLabel: normalizedBackendLabel,
    status: "connecting",
    connectionState: "connecting",
    startedAtMs,
    endedAtMs: 0,
    logs: [],
    socket: null,
    settled: false,
    hasConnected: false,
    hasResult: false,
    timeoutId: null,
  }

  eldoradoPriceCommandRunsByOffer.set(normalizedOfferId, run)

  appendEldoradoPriceCommandRunLog(run, "running", `Calistiran: ${String(username ?? "").trim() || "bilinmeyen-kullanici"}`)
  appendEldoradoPriceCommandRunLog(
    run,
    "running",
    `Gonderiliyor: backend=${normalizedBackendLabel}, kategori=${normalizedCategory || "-"}`,
  )
  appendEldoradoPriceCommandRunLog(
    run,
    "running",
    `Result: ${normalizedResultToken || normalizedResult}`,
  )

  const triggerUrl = buildSocketIoWsUrl(wsUrl, {
    backend: normalizedBackendKey,
    offerId: normalizedOfferId,
    category: normalizedCategory,
    result: normalizedResultToken || normalizedResult,
  })
  if (!triggerUrl) {
    completeEldoradoPriceCommandRun(run, "error", "Socket.IO adresi olusturulamadi.")
    return { run, conflict: false }
  }

  const WebSocketApi = globalThis.WebSocket
  if (!WebSocketApi) {
    completeEldoradoPriceCommandRun(run, "error", "Sunucu ortami WebSocket istemcisini desteklemiyor.")
    return { run, conflict: false }
  }

  let socket = null
  try {
    socket = new WebSocketApi(triggerUrl)
  } catch {
    completeEldoradoPriceCommandRun(run, "error", `${normalizedLabel} icin websocket baglantisi baslatilamadi.`)
    return { run, conflict: false }
  }

  run.socket = socket
  resetEldoradoPriceCommandRunTimeout(run, 15000)

  socket.addEventListener("message", (event) => {
    if (run.settled) return
    const rawPayload = typeof event.data === "string" ? event.data : ""
    if (!rawPayload) return
    const packets = splitEnginePackets(rawPayload)

    for (const packet of packets) {
      if (run.settled) return

      if (packet === "2") {
        try {
          socket.send("3")
        } catch {
          // Ignore pong send errors.
        }
        continue
      }

      if (packet.startsWith("0{")) {
        try {
          socket.send("40")
        } catch {
          completeEldoradoPriceCommandRun(run, "error", `${run.label} icin Socket.IO baglantisi baslatilamadi.`)
        }
        continue
      }

      if (packet.startsWith("40")) {
        if (!run.hasConnected) {
          appendEldoradoPriceCommandRunLog(run, "running", "Baglandi.")
        }
        run.hasConnected = true
        run.status = "running"
        run.connectionState = "connected"
        resetEldoradoPriceCommandRunTimeout(run, 300000)
        continue
      }

      if (packet.startsWith("41")) {
        if (run.hasResult) {
          completeEldoradoPriceCommandRun(run, "success", `${run.label} tamamlandi.`)
        } else {
          completeEldoradoPriceCommandRun(run, "error", `${run.label} tamamlanmadan baglanti kapandi.`)
        }
        return
      }

      if (packet.startsWith("44")) {
        completeEldoradoPriceCommandRun(run, "error", `${run.label} tetiklenemedi. backend=${run.backendLabel}`)
        return
      }

      const eventPacket = parseSocketIoEventPacket(packet)
      if (!eventPacket) continue
      const eventName = String(eventPacket.event ?? "").trim().toLowerCase()
      const firstArg = eventPacket.args[0]

      if (eventName === "script-triggered" || eventName === "script-started") {
        appendEldoradoPriceCommandRunLog(run, "running", `${run.backendLabel} script baslatildi.`)
        resetEldoradoPriceCommandRunTimeout(run, 300000)
        continue
      }

      if (eventName === "durum") {
        const lines = normalizeEventMessage(firstArg?.message ?? firstArg)
          .replace(/\r/g, "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
        if (lines.length === 0) {
          appendEldoradoPriceCommandRunLog(run, "running", `${run.backendLabel} => -`)
        } else {
          lines.forEach((line) => {
            appendEldoradoPriceCommandRunLog(run, "running", `${run.backendLabel} => ${line}`)
          })
        }
        resetEldoradoPriceCommandRunTimeout(run, 300000)
        continue
      }

      if (eventName === "script-log") {
        String(firstArg?.message ?? "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => {
            appendEldoradoPriceCommandRunLog(
              run,
              String(firstArg?.stream ?? "").trim().toLowerCase() === "stderr" ? "error" : "running",
              line,
            )
          })
        resetEldoradoPriceCommandRunTimeout(run, 300000)
        continue
      }

      if (eventName === "kullanici-girdisi-gerekli") {
        appendEldoradoPriceCommandRunLog(
          run,
          "error",
          `${run.backendLabel} => Kullanici girdisi istendi. Bu panel bu akisi desteklemiyor.`,
        )
        completeEldoradoPriceCommandRun(run, "error", `${run.label} kullanici girdisi bekliyor.`)
        return
      }

      if (eventName === "sonuc") {
        const valueText = normalizeEventMessage(firstArg?.value ?? firstArg).trim()
        appendEldoradoPriceCommandRunLog(run, "success", `${run.backendLabel} => ${valueText || "-"}`)
        run.hasResult = true
        completeEldoradoPriceCommandRun(run, "success", `${run.label} tamamlandi.`)
        return
      }

      if (eventName === "script-exit") {
        const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
        if (Number.isFinite(exitCode)) {
          appendEldoradoPriceCommandRunLog(
            run,
            exitCode === 0 ? "success" : "error",
            `Script cikti. Kod: ${exitCode}`,
          )
        }
        if (!run.hasResult) {
          completeEldoradoPriceCommandRun(run, "error", `${run.label} cikti ancak sonuc alinmadi.`)
          return
        }
        resetEldoradoPriceCommandRunTimeout(run, 5000)
        continue
      }

      resetEldoradoPriceCommandRunTimeout(run, 300000)
    }
  })

  socket.addEventListener("error", () => {
    run.connectionState = "error"
    completeEldoradoPriceCommandRun(run, "error", `${run.label} icin websocket baglanti hatasi olustu.`)
  })

  socket.addEventListener("close", () => {
    if (run.settled) return
    if (run.hasResult) {
      completeEldoradoPriceCommandRun(run, "success", `${run.label} tamamlandi.`)
      return
    }
    if (run.hasConnected) {
      completeEldoradoPriceCommandRun(run, "error", `${run.label} baglantisi acildi ancak sonuc gelmedi.`)
      return
    }
    completeEldoradoPriceCommandRun(run, "error", `${run.label} icin websocket baglantisi kapandi.`)
  })

  return { run, conflict: false }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body?.username ?? "").trim()
  const password = String(req.body?.password ?? "")
  if (!username || !password) {
    res.status(400).json({ ok: false, error: "username and password required" })
    return
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ ok: false, error: "invalid_credentials" })
    return
  }

  const token = issueAuthToken(user.id)
  res.json({ ok: true, token, expiresInMs: authTokenTtlMs, user: serializeUser(user) })
})

app.get("/api/auth/verify", async (req, res) => {
  const token = readAuthToken(req)
  const user = await loadUserForToken(token)
  if (!user) {
    res.status(401).json({ ok: false })
    return
  }

  res.json({ ok: true, user: serializeUser(user) })
})

app.use("/api", requireAuth)

app.get("/api/automations", requirePermission("automation.view"), async (_req, res) => {
  const automations = await prisma.automation.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  res.json(automations)
})

app.post("/api/automations", requirePermission("automation.view"), async (req, res) => {
  const title = String(req.body?.title ?? "").trim()
  const backend = String(req.body?.backend ?? "").trim()

  if (!title || !backend) {
    res.status(400).json({ error: "title and backend are required" })
    return
  }

  const created = await prisma.automation.create({
    data: {
      title,
      backend,
    },
  })
  res.status(201).json(created)
})

app.put("/api/automations/:id", requirePermission("automation.view"), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  const title = String(req.body?.title ?? "").trim()
  const backend = String(req.body?.backend ?? "").trim()

  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }
  if (!title || !backend) {
    res.status(400).json({ error: "title and backend are required" })
    return
  }

  try {
    const updated = await prisma.automation.update({
      where: { id },
      data: { title, backend },
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Automation not found" })
      return
    }
    throw error
  }
})

app.delete("/api/automations/:id", requirePermission("automation.view"), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  try {
    await prisma.automation.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Automation not found" })
      return
    }
    throw error
  }
})

app.get("/api/automation/config", requirePermission("automation.view"), async (_req, res) => {
  const config = await prisma.automationConfig.findUnique({
    where: { id: "default" },
  })
  const backendOptions = normalizeAutomationBackendOptions(config?.backendMaps)
  res.json({
    wsUrl: String(config?.wsUrl ?? "").trim(),
    backendOptions,
  })
})

app.put("/api/automation/config", requirePermission("automation.view"), async (req, res) => {
  const hasWsUrl = Object.prototype.hasOwnProperty.call(req.body ?? {}, "wsUrl")
  const hasBackendOptions =
    Object.prototype.hasOwnProperty.call(req.body ?? {}, "backendOptions") ||
    Object.prototype.hasOwnProperty.call(req.body ?? {}, "backendMaps")
  if (!hasWsUrl && !hasBackendOptions) {
    res.status(400).json({ error: "wsUrl or backendOptions is required" })
    return
  }

  let wsUrl = ""
  if (hasWsUrl) {
    const wsUrlRaw = String(req.body?.wsUrl ?? "").trim()
    if (wsUrlRaw) {
      try {
        const parsed = new URL(wsUrlRaw)
        const protocol = String(parsed.protocol || "").toLowerCase()
        if (protocol !== "ws:" && protocol !== "wss:") {
          res.status(400).json({ error: "wsUrl must start with ws:// or wss://" })
          return
        }
        wsUrl = wsUrlRaw
      } catch {
        res.status(400).json({ error: "Invalid wsUrl" })
        return
      }
    }
  }

  let backendOptions = []
  if (hasBackendOptions) {
    const rawBackendOptions = Object.prototype.hasOwnProperty.call(req.body ?? {}, "backendOptions")
      ? req.body?.backendOptions
      : req.body?.backendMaps
    backendOptions = normalizeAutomationBackendOptions(rawBackendOptions)
  }

  const createData = {
    id: "default",
    wsUrl: hasWsUrl ? wsUrl || null : null,
    backendMaps: hasBackendOptions ? backendOptions : [],
  }
  const updateData = {}
  if (hasWsUrl) {
    updateData.wsUrl = wsUrl || null
  }
  if (hasBackendOptions) {
    updateData.backendMaps = backendOptions
  }

  const updated = await prisma.automationConfig.upsert({
    where: { id: "default" },
    create: createData,
    update: updateData,
  })

  res.json({
    wsUrl: String(updated.wsUrl ?? "").trim(),
    backendOptions: normalizeAutomationBackendOptions(updated?.backendMaps),
  })
})

app.get("/api/automation/logs", requirePermission("automation.view"), async (_req, res) => {
  const logs = await prisma.automationRunLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUTOMATION_LOG_LIMIT,
  })
  res.json(logs)
})

app.post("/api/automation/logs", requirePermission("automation.view"), async (req, res) => {
  const normalized = normalizeAutomationRunLogEntry(req.body)
  if (!normalized) {
    res.status(400).json({ error: "id, time, status and message are required" })
    return
  }

  await prisma.automationRunLog.upsert({
    where: { id: normalized.id },
    create: normalized,
    update: {
      time: normalized.time,
      status: normalized.status,
      message: normalized.message,
    },
  })

  const overflow = await prisma.automationRunLog.findMany({
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: AUTOMATION_LOG_LIMIT,
  })
  if (overflow.length > 0) {
    await prisma.automationRunLog.deleteMany({
      where: {
        id: { in: overflow.map((entry) => entry.id) },
      },
    })
  }

  res.status(201).json({ ok: true })
})

app.delete("/api/automation/logs", requirePermission("automation.view"), async (_req, res) => {
  await prisma.automationRunLog.deleteMany({})
  res.json({ ok: true })
})

app.get("/api/applications", requireAnyPermission(APPLICATION_VIEW_PERMISSIONS), async (_req, res) => {
  const rows = await prisma.application.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  res.json(rows.map(serializeApplication))
})

app.post("/api/applications", requireAnyPermission(APPLICATION_MANAGE_PERMISSIONS), async (req, res) => {
  const normalized = normalizeApplicationPayload(req.body)
  if (!normalized) {
    res.status(400).json({ error: "name, about and backendKey are required" })
    return
  }

  const created = await prisma.application.create({
    data: {
      name: normalized.name,
      about: normalized.about,
      backendKey: normalized.backendKey,
      backendLabel: normalized.backendLabel,
      isActive: Boolean(normalized.isActive),
    },
  })

  res.status(201).json(serializeApplication(created))
})

app.put("/api/applications/:id", requireAnyPermission(APPLICATION_MANAGE_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  const normalized = normalizeApplicationPayload(req.body)
  if (!normalized) {
    res.status(400).json({ error: "name, about and backendKey are required" })
    return
  }

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: {
        name: normalized.name,
        about: normalized.about,
        backendKey: normalized.backendKey,
        backendLabel: normalized.backendLabel,
        isActive: Boolean(normalized.isActive),
      },
    })
    res.json(serializeApplication(updated))
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "application_not_found" })
      return
    }
    throw error
  }
})

app.post("/api/applications/:id/active", requireAnyPermission(APPLICATION_MANAGE_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, "isActive")) {
    res.status(400).json({ error: "isActive is required" })
    return
  }

  const isActiveRaw = req.body?.isActive
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : String(isActiveRaw ?? "").toLowerCase() === "true"

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: { isActive },
    })
    res.json(serializeApplication(updated))
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "application_not_found" })
      return
    }
    throw error
  }
})

app.delete("/api/applications/:id", requireAnyPermission(APPLICATION_MANAGE_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  try {
    await prisma.application.delete({ where: { id } })
    res.json({ ok: true, id })
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "application_not_found" })
      return
    }
    throw error
  }
})

app.get("/api/applications/:id/logs", requireAnyPermission(APPLICATION_LOGS_VIEW_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  const appRow = await prisma.application.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!appRow) {
    res.status(404).json({ error: "application_not_found" })
    return
  }

  const logs = await prisma.applicationRunLog.findMany({
    where: { applicationId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: APPLICATION_LOG_LIMIT,
  })
  res.json(logs)
})

app.post("/api/applications/:id/logs", requireAnyPermission(APPLICATION_RUN_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  const appRow = await prisma.application.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!appRow) {
    res.status(404).json({ error: "application_not_found" })
    return
  }

  const normalized = normalizeApplicationRunLogEntry(req.body, id)
  if (!normalized) {
    res.status(400).json({ error: "id, time, status and message are required" })
    return
  }

  await prisma.applicationRunLog.upsert({
    where: { id: normalized.id },
    create: normalized,
    update: {
      applicationId: normalized.applicationId,
      time: normalized.time,
      status: normalized.status,
      message: normalized.message,
    },
  })

  const overflow = await prisma.applicationRunLog.findMany({
    where: { applicationId: id },
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: APPLICATION_LOG_LIMIT,
  })
  if (overflow.length > 0) {
    await prisma.applicationRunLog.deleteMany({
      where: { id: { in: overflow.map((entry) => entry.id) } },
    })
  }

  res.status(201).json({ ok: true })
})

app.delete("/api/applications/:id/logs", requireAnyPermission(APPLICATION_LOGS_CLEAR_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  await prisma.applicationRunLog.deleteMany({ where: { applicationId: id } })
  res.json({ ok: true, id })
})

app.get("/api/application-runs", requireAnyPermission(APPLICATION_LOGS_VIEW_PERMISSIONS), async (req, res) => {
  pruneApplicationRunSessions()
  const canViewAll = canManageApplicationRuns(req.user)
  const username = String(req.user?.username ?? "").trim()

  const runs = Array.from(applicationRunSessions.values())
    .filter((run) => {
      if (canViewAll) return true
      return String(run.createdByUsername ?? "").trim() === username
    })
    .sort(sortApplicationRunsDesc)
    .map(serializeApplicationRunSession)
    .filter(Boolean)

  res.json(runs)
})

app.get("/api/application-runs/:runId", requireAnyPermission(APPLICATION_LOGS_VIEW_PERMISSIONS), async (req, res) => {
  pruneApplicationRunSessions()
  const runId = String(req.params?.runId ?? "").trim()
  if (!runId) {
    res.status(400).json({ error: "runId is required" })
    return
  }

  const run = applicationRunSessions.get(runId)
  if (!run) {
    res.status(404).json({ error: "application_run_not_found" })
    return
  }
  if (!canAccessApplicationRunSession(run, req.user)) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  res.json({
    run: serializeApplicationRunSession(run),
    logs: Array.isArray(run.logs) ? run.logs.map(serializeApplicationRunLog).filter(Boolean) : [],
  })
})

app.post("/api/applications/:id/run", requireAnyPermission(APPLICATION_RUN_PERMISSIONS), async (req, res) => {
  const id = String(req.params?.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "id is required" })
    return
  }

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      about: true,
      backendKey: true,
      backendLabel: true,
      isActive: true,
    },
  })
  if (!application) {
    res.status(404).json({ error: "application_not_found" })
    return
  }
  if (!application.isActive) {
    res.status(409).json({ error: "application_inactive" })
    return
  }

  const automationConfig = await prisma.automationConfig.findUnique({
    where: { id: "default" },
    select: { wsUrl: true },
  })
  const wsUrl = String(automationConfig?.wsUrl ?? "").trim()
  if (!wsUrl) {
    res.status(409).json({ error: "automation_ws_url_missing" })
    return
  }

  const username = String(req.user?.username ?? "").trim() || "bilinmeyen-kullanici"
  const run = createApplicationRunSession({ application, wsUrl, username })

  res.status(201).json({
    run: serializeApplicationRunSession(run),
    logs: Array.isArray(run.logs) ? run.logs.map(serializeApplicationRunLog).filter(Boolean) : [],
  })
})

app.post("/api/application-runs/:runId/cancel", requireAnyPermission(APPLICATION_RUN_PERMISSIONS), async (req, res) => {
  pruneApplicationRunSessions()
  const runId = String(req.params?.runId ?? "").trim()
  if (!runId) {
    res.status(400).json({ error: "runId is required" })
    return
  }

  const run = applicationRunSessions.get(runId)
  if (!run) {
    res.status(404).json({ error: "application_run_not_found" })
    return
  }
  if (!canAccessApplicationRunSession(run, req.user)) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  if (isApplicationRunLiveStatus(run.status)) {
    const backend = String(run.pendingPrompt?.backend ?? run.backendKey ?? "").trim()
    const step = String(run.pendingPrompt?.step ?? "").trim()
    if (backend) {
      const cancelPayload = {
        backend,
        step,
        reason: "user-cancelled",
      }
      const cancelSent = sendApplicationRunSocketEvent(run, "islem-iptal", cancelPayload)
      if (!cancelSent) {
        sendApplicationRunSocketEvent(run, "kullanici-girdisi", {
          backend,
          step,
          value: "iptal",
          reason: "user-cancelled",
        })
      } else {
        appendApplicationRunLog(run, "running", `${run.backendLabel} => iptal eventi gonderildi.`)
      }
    }

    completeApplicationRun(run, "error", "Islem kullanici tarafindan iptal edildi.")
  }

  res.json({
    run: serializeApplicationRunSession(run),
    logs: Array.isArray(run.logs) ? run.logs.map(serializeApplicationRunLog).filter(Boolean) : [],
  })
})

app.post("/api/application-runs/:runId/input", requireAnyPermission(APPLICATION_RUN_PERMISSIONS), async (req, res) => {
  pruneApplicationRunSessions()
  const runId = String(req.params?.runId ?? "").trim()
  if (!runId) {
    res.status(400).json({ error: "runId is required" })
    return
  }

  const run = applicationRunSessions.get(runId)
  if (!run) {
    res.status(404).json({ error: "application_run_not_found" })
    return
  }
  if (!canAccessApplicationRunSession(run, req.user)) {
    res.status(403).json({ error: "forbidden" })
    return
  }
  if (!isApplicationRunLiveStatus(run.status)) {
    res.status(409).json({ error: "application_run_not_live" })
    return
  }
  if (!run.pendingPrompt) {
    res.status(409).json({ error: "application_run_input_not_requested" })
    return
  }

  const value = String(req.body?.value ?? "").trim()
  if (!value) {
    res.status(400).json({ error: "value is required" })
    return
  }

  const backend = String(run.pendingPrompt.backend ?? run.backendKey ?? "").trim()
  if (!backend) {
    res.status(400).json({ error: "backend is required" })
    return
  }

  const sent = sendApplicationRunSocketEvent(run, "kullanici-girdisi", {
    backend,
    value,
  })
  if (!sent) {
    res.status(409).json({ error: "application_run_socket_not_open" })
    return
  }

  appendApplicationRunLog(run, "running", `> ${value}`)
  run.pendingPrompt = null

  res.json({
    run: serializeApplicationRunSession(run),
    logs: Array.isArray(run.logs) ? run.logs.map(serializeApplicationRunLog).filter(Boolean) : [],
  })
})

app.get("/api/templates", async (req, res) => {
  const templates = await prisma.template.findMany({ orderBy: { id: "asc" } })
  res.json(templates)
})

app.post("/api/templates", async (req, res) => {
  const label = String(req.body?.label ?? "").trim()
  const value = String(req.body?.value ?? "").trim()
  const category = String(req.body?.category ?? "Genel").trim() || "Genel"

  if (!label || !value) {
    res.status(400).json({ error: "label and value are required" })
    return
  }

  await prisma.category.upsert({
    where: { name: category },
    create: { name: category },
    update: {},
  })

  try {
    const created = await prisma.template.create({
      data: {
        label,
        value,
        category,
      },
    })
    res.status(201).json(created)
  } catch (error) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Template label already exists" })
      return
    }
    throw error
  }
})

app.put("/api/templates/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const label = req.body?.label === undefined ? undefined : String(req.body.label).trim()
  const value = req.body?.value === undefined ? undefined : String(req.body.value).trim()
  const categoryRaw = req.body?.category === undefined ? undefined : String(req.body.category).trim()
  const category = categoryRaw === undefined ? undefined : categoryRaw || "Genel"

  if (label !== undefined && !label) {
    res.status(400).json({ error: "label cannot be empty" })
    return
  }
  if (value !== undefined && !value) {
    res.status(400).json({ error: "value cannot be empty" })
    return
  }

  if (category !== undefined) {
    await prisma.category.upsert({
      where: { name: category },
      create: { name: category },
      update: {},
    })
  }

  try {
    const updated = await prisma.template.update({
      where: { id },
      data: {
        ...(label === undefined ? {} : { label }),
        ...(value === undefined ? {} : { value }),
        ...(category === undefined ? {} : { category }),
      },
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Template not found" })
      return
    }
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Template label already exists" })
      return
    }
    throw error
  }
})

app.post("/api/templates/:id/click", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  try {
    const updated = await prisma.template.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Template not found" })
      return
    }
    throw error
  }
})

app.delete("/api/templates/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  try {
    await prisma.template.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Template not found" })
      return
    }
    throw error
  }
})

app.get("/api/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } })
  res.json(categories.map((c) => c.name))
})

app.post("/api/categories", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }

  const category = await prisma.category.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json(category)
})

app.delete("/api/categories/:name", async (req, res) => {
  const name = String(req.params.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "invalid name" })
    return
  }
  if (name === "Genel") {
    res.status(400).json({ error: "Genel cannot be deleted" })
    return
  }

  await prisma.$transaction([
    prisma.template.updateMany({ where: { category: name }, data: { category: "Genel" } }),
    prisma.category.delete({ where: { name } }),
  ]).catch((error) => {
    if (error?.code === "P2025") return null
    throw error
  })

  res.status(204).end()
})

app.get("/api/roles", requireAnyPermission(["admin.roles.manage", "admin.manage"]), async (_req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } })
  res.json(roles)
})

app.post("/api/roles", requireAnyPermission(["admin.roles.manage", "admin.manage"]), async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }

  const permissions = normalizePermissions(req.body?.permissions)
  try {
    const created = await prisma.role.create({ data: { name, permissions } })
    res.status(201).json(created)
  } catch (error) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Role name already exists" })
      return
    }
    throw error
  }
})

app.put("/api/roles/:id", requireAnyPermission(["admin.roles.manage", "admin.manage"]), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const nameRaw = req.body?.name
  const name = nameRaw === undefined ? undefined : String(nameRaw).trim()
  if (name !== undefined && !name) {
    res.status(400).json({ error: "name cannot be empty" })
    return
  }
  const permissions = req.body?.permissions === undefined ? undefined : normalizePermissions(req.body.permissions)

  try {
    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(permissions === undefined ? {} : { permissions }),
      },
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Role not found" })
      return
    }
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Role name already exists" })
      return
    }
    throw error
  }
})

app.delete("/api/roles/:id", requireAnyPermission(["admin.roles.manage", "admin.manage"]), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const userCount = await prisma.user.count({ where: { roleId: id } })
  if (userCount > 0) {
    res.status(409).json({ error: "Role has assigned users" })
    return
  }

  try {
    await prisma.role.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Role not found" })
      return
    }
    throw error
  }
})

app.get("/api/users", requireAnyPermission(["admin.users.manage", "admin.manage"]), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { role: true },
  })
  res.json(users.map((user) => serializeUser(user)))
})

app.post("/api/users", requireAnyPermission(["admin.users.manage", "admin.manage"]), async (req, res) => {
  const username = String(req.body?.username ?? "").trim()
  const password = String(req.body?.password ?? "")
  const roleIdRaw = req.body?.roleId

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" })
    return
  }

  const roleId = roleIdRaw === null || roleIdRaw === undefined ? null : Number(roleIdRaw)
  if (roleId !== null && !Number.isFinite(roleId)) {
    res.status(400).json({ error: "invalid roleId" })
    return
  }

  try {
    const created = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        ...(roleId === null ? {} : { roleId }),
      },
      include: { role: true },
    })
    res.status(201).json(serializeUser(created))
  } catch (error) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Username already exists" })
      return
    }
    throw error
  }
})

app.put("/api/users/:id", requireAnyPermission(["admin.users.manage", "admin.manage"]), async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const usernameRaw = req.body?.username
  const passwordRaw = req.body?.password
  const roleIdRaw = req.body?.roleId

  const data = {}
  if (usernameRaw !== undefined) {
    const username = String(usernameRaw).trim()
    if (!username) {
      res.status(400).json({ error: "username cannot be empty" })
      return
    }
    data.username = username
  }
  if (passwordRaw !== undefined) {
    const password = String(passwordRaw)
    if (!password) {
      res.status(400).json({ error: "password cannot be empty" })
      return
    }
    data.passwordHash = hashPassword(password)
  }
  if (roleIdRaw !== undefined) {
    if (roleIdRaw === null) {
      data.roleId = null
    } else {
      const roleId = Number(roleIdRaw)
      if (!Number.isFinite(roleId)) {
        res.status(400).json({ error: "invalid roleId" })
        return
      }
      data.roleId = roleId
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    })
    res.json(serializeUser(updated))
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "User not found" })
      return
    }
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Username already exists" })
      return
    }
    throw error
  }
})

app.delete("/api/users/:id", requireAnyPermission(["admin.users.manage", "admin.manage"]), async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  if (req.user?.id === id) {
    res.status(400).json({ error: "cannot delete current user" })
    return
  }
  try {
    await prisma.user.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "User not found" })
      return
    }
    throw error
  }
})

app.put("/api/profile", async (req, res) => {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: "unauthorized" })
    return
  }

  const usernameRaw = req.body?.username
  const currentPassword = String(req.body?.currentPassword ?? "")
  const newPasswordRaw = req.body?.newPassword

  const username = usernameRaw === undefined ? undefined : String(usernameRaw).trim()
  const newPassword = newPasswordRaw === undefined ? undefined : String(newPasswordRaw)

  if (username !== undefined && !username) {
    res.status(400).json({ error: "username cannot be empty" })
    return
  }
  if (newPassword !== undefined && !newPassword) {
    res.status(400).json({ error: "newPassword cannot be empty" })
    return
  }

  const usernameChanged = username !== undefined && username !== user.username
  const passwordChanged = newPassword !== undefined
  if (!usernameChanged && !passwordChanged) {
    res.status(400).json({ error: "no changes" })
    return
  }
  if (!currentPassword) {
    res.status(400).json({ error: "current password required" })
    return
  }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    res.status(403).json({ error: "invalid password" })
    return
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(usernameChanged ? { username } : {}),
        ...(passwordChanged ? { passwordHash: hashPassword(newPassword) } : {}),
      },
      include: { role: true },
    })

    if (usernameChanged) {
      await prisma.task.updateMany({
        where: { owner: user.username },
        data: { owner: updated.username },
      })
    }

    res.json(serializeUser(updated))
  } catch (error) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Username already exists" })
      return
    }
    throw error
  }
})

const allowedProblemStatus = new Set(["open", "resolved", "archived"])
const allowedTaskStatus = new Set(["todo", "doing", "done"])
const allowedTaskDueTypes = new Set(["today", "none", "repeat", "date"])
const MAX_COMMENT_IMAGES = 10
const MAX_TASK_NOTE_IMAGES = 10
const MAX_IMAGE_CHARS = 3_000_000

const normalizeImageList = (imagesRaw, maxImages) => {
  const images = Array.isArray(imagesRaw)
    ? imagesRaw.map((item) => String(item ?? "")).filter(Boolean)
    : []
  return images
    .filter((item) => item.startsWith("data:image/"))
    .filter((item) => item.length <= MAX_IMAGE_CHARS)
    .slice(0, maxImages)
}

const canViewAllTasksForUser = (user) => {
  const permissions = user?.role?.permissions || []
  return (
    permissions.includes("admin.roles.manage") ||
    permissions.includes("admin.users.manage") ||
    permissions.includes("admin.manage")
  )
}

const getTaskForUser = async (user, taskId) => {
  if (!taskId) return null
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return null
  if (!canViewAllTasksForUser(user) && user?.username && task.owner !== user.username) {
    return null
  }
  return task
}
const allowedTaskRepeatDays = new Set(["0", "1", "2", "3", "4", "5", "6"])
const allowedStockStatus = new Set(["available", "used"])

const parseRepeatDays = (value) => {
  if (value === null || value === undefined) return []
  const rawList = Array.isArray(value) ? value : [value]
  return rawList.map((day) => String(day).trim()).filter((day) => day)
}

const normalizeProblemResponse = (problem) => ({
  ...problem,
  orderNumber: String(problem?.orderNumber ?? problem?.username ?? "").trim(),
})

app.get("/api/problems", async (_req, res) => {
  const problems = await prisma.problem.findMany({ orderBy: { createdAt: "desc" } })
  res.json(problems.map(normalizeProblemResponse))
})

app.post("/api/problems", async (req, res) => {
  const orderNumber = String(req.body?.orderNumber ?? req.body?.username ?? "").trim()
  const issue = String(req.body?.issue ?? "").trim()
  if (!orderNumber || !issue) {
    res.status(400).json({ error: "orderNumber and issue are required" })
    return
  }
  const created = await prisma.problem.create({ data: { username: orderNumber, issue, status: "open" } })
  res.status(201).json(normalizeProblemResponse(created))
})

app.put("/api/problems/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const orderNumberRaw =
    req.body?.orderNumber !== undefined ? req.body.orderNumber : req.body?.username
  const orderNumber = orderNumberRaw === undefined ? undefined : String(orderNumberRaw).trim()
  const issue = req.body?.issue === undefined ? undefined : String(req.body.issue).trim()
  const statusRaw = req.body?.status === undefined ? undefined : String(req.body.status).trim()
  const status = statusRaw === undefined ? undefined : statusRaw || "open"

  if (status !== undefined && !allowedProblemStatus.has(status)) {
    res.status(400).json({ error: "invalid status" })
    return
  }
  if (orderNumber !== undefined && !orderNumber) {
    res.status(400).json({ error: "orderNumber cannot be empty" })
    return
  }
  if (issue !== undefined && !issue) {
    res.status(400).json({ error: "issue cannot be empty" })
    return
  }

  try {
    const updated = await prisma.problem.update({
      where: { id },
      data: {
        ...(orderNumber === undefined ? {} : { username: orderNumber }),
        ...(issue === undefined ? {} : { issue }),
        ...(status === undefined ? {} : { status }),
      },
    })
    res.json(normalizeProblemResponse(updated))
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Problem not found" })
      return
    }
    throw error
  }
})

app.delete("/api/problems/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  try {
    await prisma.problem.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Problem not found" })
      return
    }
    throw error
  }
})

app.get(
  "/api/task-users",
  requireAnyPermission(["tasks.view", "tasks.create", "tasks.edit"]),
  async (_req, res) => {
    const taskUsers = await prisma.user.findMany({
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    })
    res.json(taskUsers)
  },
)

app.get("/api/tasks", async (req, res) => {
  const username = String(req.user?.username ?? "").trim()
  const canViewAllTasks = canViewAllTasksForUser(req.user)
  const tasks = await prisma.task.findMany({
    where: !canViewAllTasks && username ? { owner: username } : undefined,
    orderBy: { createdAt: "desc" },
  })
  res.json(tasks)
})

app.post("/api/tasks", async (req, res) => {
  const title = String(req.body?.title ?? "").trim()
  const noteRaw = req.body?.note
  const noteImagesRaw = req.body?.noteImages
  const ownerRaw = req.body?.owner
  const dueTypeRaw = req.body?.dueType
  const repeatDaysRaw = req.body?.repeatDays
  const dueDateRaw = req.body?.dueDate

  if (!title) {
    res.status(400).json({ error: "title is required" })
    return
  }

  const dueType = String(dueTypeRaw ?? "today").trim() || "today"
  if (!allowedTaskDueTypes.has(dueType)) {
    res.status(400).json({ error: "invalid dueType" })
    return
  }

  const repeatDays = parseRepeatDays(repeatDaysRaw)
  const invalidRepeatDay = repeatDays.find((day) => !allowedTaskRepeatDays.has(day))
  const dueDate = String(dueDateRaw ?? "").trim()

  if (invalidRepeatDay) {
    res.status(400).json({ error: "invalid repeatDays" })
    return
  }

  if (dueType === "repeat") {
    if (repeatDays.length === 0) {
      res.status(400).json({ error: "repeatDays required" })
      return
    }
  }

  if (dueType === "date") {
    if (!dueDate) {
      res.status(400).json({ error: "dueDate is required" })
      return
    }
  }

  const note =
    noteRaw === undefined ? undefined : noteRaw === null ? null : String(noteRaw).trim() || null
  const noteImages = normalizeImageList(noteImagesRaw, MAX_TASK_NOTE_IMAGES)
  const owner = String(ownerRaw ?? "").trim()
  if (!owner) {
    res.status(400).json({ error: "owner is required" })
    return
  }
  const ownerUser = await prisma.user.findUnique({ where: { username: owner } })
  if (!ownerUser) {
    res.status(400).json({ error: "invalid owner" })
    return
  }

  const created = await prisma.task.create({
    data: {
      title,
      status: "todo",
      dueType,
      ...(note === undefined ? {} : { note }),
      noteImages,
      owner,
      ...(dueType === "repeat" ? { repeatDays } : { repeatDays: [] }),
      ...(dueType === "date" ? { dueDate } : { dueDate: null }),
      repeatWakeAt: null,
    },
  })

  res.status(201).json(created)
})

app.put("/api/tasks/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const titleRaw = req.body?.title
  const noteRaw = req.body?.note
  const noteImagesRaw = req.body?.noteImages
  const ownerRaw = req.body?.owner
  const statusRaw = req.body?.status
  const dueTypeRaw = req.body?.dueType
  const repeatDaysRaw = req.body?.repeatDays
  const dueDateRaw = req.body?.dueDate
  const repeatWakeAtRaw = req.body?.repeatWakeAt

  const data = {}

  if (titleRaw !== undefined) {
    const title = String(titleRaw).trim()
    if (!title) {
      res.status(400).json({ error: "title cannot be empty" })
      return
    }
    data.title = title
  }

  if (noteRaw !== undefined) {
    if (noteRaw === null) {
      data.note = null
    } else {
      const note = String(noteRaw).trim()
      data.note = note ? note : null
    }
  }

  if (noteImagesRaw !== undefined) {
    if (noteImagesRaw === null) {
      data.noteImages = []
    } else {
      data.noteImages = normalizeImageList(noteImagesRaw, MAX_TASK_NOTE_IMAGES)
    }
  }

  if (ownerRaw !== undefined) {
    const owner = ownerRaw === null ? "" : String(ownerRaw).trim()
    if (!owner) {
      res.status(400).json({ error: "owner is required" })
      return
    }
    const ownerUser = await prisma.user.findUnique({ where: { username: owner } })
    if (!ownerUser) {
      res.status(400).json({ error: "invalid owner" })
      return
    }
    data.owner = owner
  }

  if (statusRaw !== undefined) {
    const status = String(statusRaw).trim()
    if (!allowedTaskStatus.has(status)) {
      res.status(400).json({ error: "invalid status" })
      return
    }
    data.status = status
  }

  let dueType = undefined
  if (dueTypeRaw !== undefined) {
    dueType = String(dueTypeRaw).trim()
    if (!allowedTaskDueTypes.has(dueType)) {
      res.status(400).json({ error: "invalid dueType" })
      return
    }
    data.dueType = dueType
  }

  let repeatDays = undefined
  if (repeatDaysRaw !== undefined) {
    if (repeatDaysRaw === null) {
      repeatDays = []
    } else {
      repeatDays = parseRepeatDays(repeatDaysRaw)
      const invalidRepeatDay = repeatDays.find((day) => !allowedTaskRepeatDays.has(day))
      if (invalidRepeatDay) {
        res.status(400).json({ error: "invalid repeatDays" })
        return
      }
    }
    data.repeatDays = repeatDays
  }

  if (dueDateRaw !== undefined) {
    if (dueDateRaw === null) {
      data.dueDate = null
    } else {
      const dueDate = String(dueDateRaw).trim()
      data.dueDate = dueDate || null
    }
  }

  if (repeatWakeAtRaw !== undefined) {
    if (repeatWakeAtRaw === null) {
      data.repeatWakeAt = null
    } else {
      const repeatWakeAt = String(repeatWakeAtRaw).trim()
      data.repeatWakeAt = repeatWakeAt || null
    }
  }

  if (dueType !== undefined) {
    if (dueType === "repeat") {
      const effectiveRepeatDays = repeatDays ?? []
      if (effectiveRepeatDays.length === 0) {
        res.status(400).json({ error: "repeatDays required" })
        return
      }
      data.repeatDays = effectiveRepeatDays
      data.dueDate = null
    }
    if (dueType === "date") {
      const dueDate = dueDateRaw === undefined ? "" : String(dueDateRaw).trim()
      if (!dueDate) {
        res.status(400).json({ error: "dueDate is required" })
        return
      }
      data.dueDate = dueDate
      data.repeatDays = []
    }
    if (dueType === "today" || dueType === "none") {
      data.repeatDays = []
      data.dueDate = null
    }
  }

  try {
    const updated = await prisma.task.update({
      where: { id },
      data,
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Task not found" })
      return
    }
    throw error
  }
})

app.get("/api/tasks/:id/comments", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const task = await getTaskForUser(req.user, id)
  if (!task) {
    res.status(404).json({ error: "Task not found" })
    return
  }

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "desc" },
  })
  res.json(comments)
})

app.post("/api/tasks/:id/comments", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const textRaw = req.body?.text
  const text = textRaw === undefined ? "" : String(textRaw).trim()
  const normalizedImages = normalizeImageList(req.body?.images, MAX_COMMENT_IMAGES)

  if (!text && normalizedImages.length === 0) {
    res.status(400).json({ error: "text or images required" })
    return
  }

  const task = await getTaskForUser(req.user, id)
  if (!task) {
    res.status(404).json({ error: "Task not found" })
    return
  }

  const created = await prisma.taskComment.create({
    data: {
      taskId: id,
      text,
      images: normalizedImages,
      authorId: req.user?.id ?? null,
      authorName: req.user?.username || "Bilinmiyor",
    },
  })
  res.status(201).json(created)
})

app.delete("/api/tasks/:id/comments/:commentId", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  const commentId = String(req.params.commentId ?? "").trim()
  if (!id || !commentId) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const task = await getTaskForUser(req.user, id)
  if (!task) {
    res.status(404).json({ error: "Task not found" })
    return
  }

  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } })
  if (!comment || comment.taskId !== id) {
    res.status(404).json({ error: "Comment not found" })
    return
  }

  const canDelete =
    canViewAllTasksForUser(req.user) ||
    (comment.authorId && comment.authorId === req.user?.id) ||
    (task.owner && task.owner === req.user?.username)
  if (!canDelete) {
    res.status(403).json({ error: "forbidden" })
    return
  }

  await prisma.taskComment.delete({ where: { id: commentId } })
  res.status(204).end()
})

app.delete("/api/tasks/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  try {
    await prisma.task.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Task not found" })
      return
    }
    throw error
  }
})

app.get("/api/sales", requireAnyPermission(["sales.view", "sales.create", "admin.manage"]), async (_req, res) => {
  const sales = await prisma.sale.findMany({ orderBy: { date: "asc" } })
  res.json(sales)
})

app.post("/api/sales", requireAnyPermission(["sales.create", "admin.manage"]), async (req, res) => {
  const date = String(req.body?.date ?? "").trim()
  const amount = Number(req.body?.amount)
  const parsed = new Date(`${date}T00:00:00`)

  if (!date || Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "invalid date" })
    return
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "invalid amount" })
    return
  }

  const existing = await prisma.sale.findUnique({ where: { date } })
  if (existing) {
    const updated = await prisma.sale.update({
      where: { id: existing.id },
      data: { amount },
    })
    res.json(updated)
    return
  }

  const created = await prisma.sale.create({ data: { date, amount } })
  res.status(201).json(created)
})

app.get(
  "/api/accounting",
  requireAnyPermission(["accounting.view", "accounting.create", "admin.manage"]),
  async (_req, res) => {
    await ensureAccountingRecordStorage()
    const records = await prisma.accountingRecord.findMany({ orderBy: { date: "asc" } })
    res.json(records)
  },
)

app.post(
  "/api/accounting",
  requireAnyPermission(["accounting.create", "admin.manage"]),
  async (req, res) => {
    await ensureAccountingRecordStorage()
    const date = String(req.body?.date ?? "").trim()
    const available = parseFlexibleNumberInput(req.body?.available)
    const pending = parseFlexibleNumberInput(req.body?.pending)
    const withdrawal =
      req.body?.withdrawal === undefined || req.body?.withdrawal === null || req.body?.withdrawal === ""
        ? 0
        : parseFlexibleNumberInput(req.body?.withdrawal)
    const noteRaw = req.body?.note
    const note = noteRaw === undefined ? null : String(noteRaw).trim() || null
    const parsed = new Date(`${date}T00:00:00`)

    if (!date || Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "invalid date" })
      return
    }
    if (!Number.isFinite(available) || available < 0) {
      res.status(400).json({ error: "invalid available" })
      return
    }
    if (!Number.isFinite(pending) || pending < 0) {
      res.status(400).json({ error: "invalid pending" })
      return
    }
    if (!Number.isFinite(withdrawal) || withdrawal < 0) {
      res.status(400).json({ error: "invalid withdrawal" })
      return
    }

    const data = { date, available, pending, withdrawal, note }
    const existing = await prisma.accountingRecord.findUnique({ where: { date } })
    if (existing) {
      const updated = await prisma.accountingRecord.update({
        where: { id: existing.id },
        data,
      })
      res.json(updated)
      return
    }

    try {
      const created = await prisma.accountingRecord.create({ data })
      res.status(201).json(created)
    } catch (error) {
      if (error?.code === "P2002") {
        const retryExisting = await prisma.accountingRecord.findUnique({ where: { date } })
        if (retryExisting) {
          const updated = await prisma.accountingRecord.update({
            where: { id: retryExisting.id },
            data,
          })
          res.json(updated)
          return
        }
      }
      throw error
    }
  },
)

app.get("/api/products", async (_req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { stocks: { orderBy: { createdAt: "asc" } } },
  })
  res.json(products)
})

app.post("/api/products", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  const noteRaw = req.body?.note
  const deliveryTemplateRaw = req.body?.deliveryTemplate
  const deliveryMessageRaw = req.body?.deliveryMessage

  const note = noteRaw === undefined ? undefined : String(noteRaw).trim() || null
  const deliveryTemplate = deliveryTemplateRaw === undefined ? undefined : String(deliveryTemplateRaw).trim() || null
  const deliveryMessage = deliveryMessageRaw === undefined ? undefined : String(deliveryMessageRaw).trim() || null

  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }

  const created = await prisma.product.create({
    data: {
      name,
      ...(note === undefined ? {} : { note }),
      ...(deliveryTemplate === undefined ? {} : { deliveryTemplate }),
      ...(deliveryMessage === undefined ? {} : { deliveryMessage }),
    },
    include: { stocks: { orderBy: { createdAt: "asc" } } },
  })
  res.status(201).json(created)
})

app.put("/api/products/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const nameRaw = req.body?.name
  const noteRaw = req.body?.note
  const deliveryTemplateRaw = req.body?.deliveryTemplate
  const deliveryMessageRaw = req.body?.deliveryMessage

  const name = nameRaw === undefined ? undefined : String(nameRaw).trim()
  const note = noteRaw === undefined ? undefined : String(noteRaw).trim() || null
  const deliveryTemplate = deliveryTemplateRaw === undefined ? undefined : String(deliveryTemplateRaw).trim() || null
  const deliveryMessage = deliveryMessageRaw === undefined ? undefined : String(deliveryMessageRaw).trim() || null

  if (name !== undefined && !name) {
    res.status(400).json({ error: "name cannot be empty" })
    return
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(note === undefined ? {} : { note }),
        ...(deliveryTemplate === undefined ? {} : { deliveryTemplate }),
        ...(deliveryMessage === undefined ? {} : { deliveryMessage }),
      },
      include: { stocks: { orderBy: { createdAt: "asc" } } },
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Product not found" })
      return
    }
    throw error
  }
})

app.delete("/api/products/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  try {
    await prisma.product.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Product not found" })
      return
    }
    throw error
  }
})

app.post("/api/products/:id/stocks", async (req, res) => {
  const productId = String(req.params.id ?? "").trim()
  if (!productId) {
    res.status(400).json({ error: "invalid product id" })
    return
  }

  const codesRaw = req.body?.codes
  const codes = Array.isArray(codesRaw)
    ? codesRaw.map((code) => String(code ?? "").trim()).filter(Boolean)
    : []

  if (codes.length === 0) {
    res.status(400).json({ error: "codes are required" })
    return
  }

  try {
    await prisma.product.findUniqueOrThrow({ where: { id: productId } })
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Product not found" })
      return
    }
    throw error
  }

  await prisma.stock.createMany({
    data: codes.map((code) => ({ code, productId })),
  })

  const stocks = await prisma.stock.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  })

  res.status(201).json(stocks)
})

app.put("/api/stocks/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const statusRaw = req.body?.status
  const codeRaw = req.body?.code
  if (statusRaw === undefined && codeRaw === undefined) {
    res.status(400).json({ error: "status or code is required" })
    return
  }

  const data = {}
  if (statusRaw !== undefined) {
    const status = String(statusRaw).trim()
    if (!allowedStockStatus.has(status)) {
      res.status(400).json({ error: "invalid status" })
      return
    }
    data.status = status
  }
  if (codeRaw !== undefined) {
    const code = String(codeRaw).trim()
    if (!code) {
      res.status(400).json({ error: "invalid code" })
      return
    }
    data.code = code
  }

  try {
    const updated = await prisma.stock.update({
      where: { id },
      data,
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Stock not found" })
      return
    }
    throw error
  }
})

app.delete("/api/stocks/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  try {
    await prisma.stock.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Stock not found" })
      return
    }
    throw error
  }
})

app.post("/api/stocks/bulk-delete", async (req, res) => {
  const idsRaw = req.body?.ids
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((id) => String(id ?? "").trim()).filter(Boolean)
    : []

  if (ids.length === 0) {
    res.status(400).json({ error: "ids are required" })
    return
  }

  const result = await prisma.stock.deleteMany({ where: { id: { in: ids } } })
  res.json({ deleted: result.count })
})

app.get("/api/eldorado/products", async (_req, res, next) => {
  try {
    const catalog = await loadEldoradoCatalog()
    res.json({ catalog })
  } catch (error) {
    next(error)
  }
})

app.get("/api/eldorado/logs", async (req, res, next) => {
  const rawLimit = Number(req.query?.limit ?? 200)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 1000) : 200
  try {
    const raw = await fs.readFile(eldoradoLogPath, "utf8")
    const lines = raw.split(/\r?\n/).filter(Boolean)
    res.json({ lines: lines.slice(-limit) })
  } catch (error) {
    if (error?.code === "ENOENT") {
      res.json({ lines: [] })
      return
    }
    next(error)
  }
})

app.get("/api/eldorado/refresh-status", async (_req, res) => {
  res.json({
    inFlight: Boolean(eldoradoRefreshInFlight),
    status: String(eldoradoRefreshStatus?.status ?? "idle"),
    startedAt: eldoradoRefreshStatus?.startedAt ?? null,
    finishedAt: eldoradoRefreshStatus?.finishedAt ?? null,
    message: String(eldoradoRefreshStatus?.message ?? ""),
  })
})

app.post("/api/eldorado/refresh", async (_req, res) => {
  if (eldoradoRefreshInFlight) {
    res.status(409).json({
      error: "refresh_in_progress",
      inFlight: true,
      status: String(eldoradoRefreshStatus?.status ?? "running"),
      startedAt: eldoradoRefreshStatus?.startedAt ?? null,
    })
    return
  }
  void runEldoradoRefreshJob()
  res.status(202).json({
    ok: true,
    inFlight: true,
    status: "running",
    startedAt: eldoradoRefreshStatus?.startedAt ?? null,
  })
})

app.get("/api/eldorado/store", async (_req, res, next) => {
  try {
    const store = await loadEldoradoStore()
    res.json(store)
  } catch (error) {
    next(error)
  }
})

app.post("/api/eldorado/offers/:id/delivery-template", async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const templateIdRaw = req.body?.templateId
  const templateId = Number(templateIdRaw)
  if (!Number.isInteger(templateId) || templateId <= 0) {
    res.status(400).json({ error: "valid templateId is required" })
    return
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true, label: true, value: true, category: true },
  })
  if (!template) {
    res.status(404).json({ error: "Template not found" })
    return
  }

  await prisma.eldoradoOfferDeliveryTemplate.upsert({
    where: { offerId },
    update: { templateId: template.id },
    create: { offerId, templateId: template.id },
  })

  res.json({
    offerId,
    deliveryTemplate: {
      templateId: template.id,
      label: String(template.label ?? "").trim(),
      value: String(template.value ?? "").trim(),
      category: String(template.category ?? "").trim(),
    },
  })
})

app.delete("/api/eldorado/offers/:id/delivery-template", async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  await prisma.eldoradoOfferDeliveryTemplate.deleteMany({ where: { offerId } })

  res.json({ offerId, deliveryTemplate: null })
})

app.post("/api/eldorado/offers/:id/star", async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }
  const starredRaw = req.body?.starred
  if (starredRaw === undefined) {
    res.status(400).json({ error: "starred is required" })
    return
  }

  const starred =
    typeof starredRaw === "boolean"
      ? starredRaw
      : String(starredRaw).toLowerCase() === "true"

  if (starred) {
    await prisma.eldoradoOfferStar.upsert({
      where: { offerId },
      update: {},
      create: { offerId },
    })
  } else {
    await prisma.eldoradoOfferStar.deleteMany({ where: { offerId } })
  }

  res.json({ offerId, starred })
})

app.post("/api/eldorado/offers/:id/price", async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const { base, percent, result } = normalizePricePayloadValues({
    base: req.body?.base,
    percent: req.body?.percent,
    result: req.body?.result,
  })

  if (!Number.isFinite(base) || !Number.isFinite(percent) || !Number.isFinite(result)) {
    res.status(400).json({ error: "invalid_price_payload" })
    return
  }

  const saved = await prisma.eldoradoOfferPrice.upsert({
    where: { offerId },
    update: { base, percent, result },
    create: { offerId, base, percent, result },
  })

  res.json({
    offerId: saved.offerId,
    base: saved.base ?? null,
    percent: saved.percent ?? null,
    result: saved.result ?? null,
  })
})

app.post("/api/eldorado/offers/:id/price-enabled", async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const enabledRaw = req.body?.enabled
  const enabled =
    typeof enabledRaw === "boolean"
      ? enabledRaw
      : String(enabledRaw).toLowerCase() === "true"

  const saved = await prisma.eldoradoOfferPriceEnabled.upsert({
    where: { offerId },
    update: { enabled },
    create: { offerId, enabled },
  })

  res.json({ offerId: saved.offerId, enabled: Boolean(saved.enabled) })
})

app.delete("/api/eldorado/offers/:id", async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const offer = await prisma.eldoradoOffer.findUnique({ where: { id: offerId } })
  if (!offer) {
    res.status(404).json({ error: "offer not found" })
    return
  }

  await prisma.$transaction([
    prisma.eldoradoKey.deleteMany({ where: { offerId } }),
    prisma.eldoradoStockEnabled.deleteMany({ where: { offerId } }),
    prisma.eldoradoOfferAutomation.deleteMany({ where: { offerId } }),
    prisma.eldoradoOfferPrice.deleteMany({ where: { offerId } }),
    prisma.eldoradoOfferPriceEnabled.deleteMany({ where: { offerId } }),
    prisma.eldoradoOfferNote.deleteMany({ where: { offerId } }),
    prisma.eldoradoStockGroupAssignment.deleteMany({ where: { offerId } }),
    prisma.eldoradoNoteGroupAssignment.deleteMany({ where: { offerId } }),
    prisma.eldoradoMessageGroupAssignment.deleteMany({ where: { offerId } }),
    prisma.eldoradoMessageTemplate.deleteMany({ where: { offerId } }),
    prisma.eldoradoOfferStar.deleteMany({ where: { offerId } }),
    prisma.eldoradoOffer.delete({ where: { id: offerId } }),
  ])

  res.json({ ok: true, offerId })
})

app.post("/api/eldorado/stock-groups", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }

  const existing = await prisma.eldoradoStockGroup.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (existing) {
    res.json({
      id: existing.id,
      name: existing.name,
      createdAt: existing.createdAt.toISOString(),
    })
    return
  }

  const created = await prisma.eldoradoStockGroup.create({ data: { name } })
  res.status(201).json({
    id: created.id,
    name: created.name,
    createdAt: created.createdAt.toISOString(),
  })
})

app.put("/api/eldorado/stock-groups/assign", async (req, res) => {
  const offerId = String(req.body?.offerId ?? "").trim()
  const groupId = String(req.body?.groupId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  if (groupId) {
    const group = await prisma.eldoradoStockGroup.findUnique({ where: { id: groupId } })
    if (!group) {
      res.status(404).json({ error: "group not found" })
      return
    }
    await prisma.eldoradoStockGroupAssignment.upsert({
      where: { offerId },
      update: { groupId },
      create: { offerId, groupId },
    })
  } else {
    await prisma.eldoradoStockGroupAssignment.deleteMany({ where: { offerId } })
  }

  res.json({ ok: true })
})

app.delete("/api/eldorado/stock-groups/:id", async (req, res) => {
  const groupId = String(req.params.id ?? "").trim()
  if (!groupId) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const group = await prisma.eldoradoStockGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    res.status(404).json({ error: "group not found" })
    return
  }

  const assignments = await prisma.eldoradoStockGroupAssignment.findMany({
    where: { groupId },
  })
  const offerIds = assignments.map((entry) => entry.offerId)
  const groupKeys = await prisma.eldoradoKey.findMany({ where: { groupId } })

  const operations = []
  if (groupKeys.length > 0) {
    offerIds.forEach((offerId) => {
      const data = groupKeys.map((key) => ({
        code: key.code,
        status: key.status,
        offerId,
      }))
      operations.push(prisma.eldoradoKey.createMany({ data }))
    })
  }
  operations.push(prisma.eldoradoKey.deleteMany({ where: { groupId } }))
  operations.push(prisma.eldoradoStockGroupAssignment.deleteMany({ where: { groupId } }))
  operations.push(prisma.eldoradoStockGroup.delete({ where: { id: groupId } }))

  await prisma.$transaction(operations)
  res.json({ ok: true, affectedOffers: offerIds })
})

app.get("/api/eldorado/keys/:offerId", async (req, res) => {
  const offerId = String(req.params.offerId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "invalid offerId" })
    return
  }
  const assignment = await prisma.eldoradoStockGroupAssignment.findUnique({ where: { offerId } })
  const groupId = assignment?.groupId || null
  const keys = await prisma.eldoradoKey.findMany({
    where: groupId ? { groupId } : { offerId },
    orderBy: { createdAt: "asc" },
  })
  res.json(
    keys.map((item) => ({
      id: item.id,
      code: item.code,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
  )
})

app.post("/api/eldorado/keys/:offerId", async (req, res) => {
  const offerId = String(req.params.offerId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "invalid offerId" })
    return
  }
  const requestedStatus = String(req.body?.status ?? "").trim()
  const status = requestedStatus || "available"
  if (!allowedStockStatus.has(status)) {
    res.status(400).json({ error: "invalid status" })
    return
  }
  const codesRaw = req.body?.codes
  const codes = Array.isArray(codesRaw)
    ? codesRaw.map((code) => String(code ?? "").trim()).filter(Boolean)
    : []
  if (codes.length === 0) {
    res.status(400).json({ error: "codes are required" })
    return
  }

  const assignment = await prisma.eldoradoStockGroupAssignment.findUnique({ where: { offerId } })
  const groupId = assignment?.groupId || null
  await prisma.eldoradoKey.createMany({
    data: codes.map((code) => ({
      code,
      status,
      offerId: groupId ? null : offerId,
      groupId: groupId || null,
    })),
  })

  await prisma.eldoradoStockEnabled.upsert({
    where: { offerId },
    update: { enabled: true },
    create: { offerId, enabled: true },
  })

  const keys = await prisma.eldoradoKey.findMany({
    where: groupId ? { groupId } : { offerId },
    orderBy: { createdAt: "asc" },
  })
  res.status(201).json(
    keys.map((item) => ({
      id: item.id,
      code: item.code,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
  )
})

app.put("/api/eldorado/keys/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const statusRaw = req.body?.status
  const codeRaw = req.body?.code
  if (statusRaw === undefined && codeRaw === undefined) {
    res.status(400).json({ error: "status or code is required" })
    return
  }

  const data = {}
  if (statusRaw !== undefined) {
    const status = String(statusRaw).trim()
    if (!allowedStockStatus.has(status)) {
      res.status(400).json({ error: "invalid status" })
      return
    }
    data.status = status
  }
  if (codeRaw !== undefined) {
    const code = String(codeRaw).trim()
    if (!code) {
      res.status(400).json({ error: "invalid code" })
      return
    }
    data.code = code
  }

  try {
    const updated = await prisma.eldoradoKey.update({ where: { id }, data })
    res.json({
      id: updated.id,
      code: updated.code,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    })
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "key not found" })
      return
    }
    throw error
  }
})

app.delete("/api/eldorado/keys/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  try {
    await prisma.eldoradoKey.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "key not found" })
      return
    }
    throw error
  }
})

app.post("/api/eldorado/keys/bulk-status", async (req, res) => {
  const idsRaw = req.body?.ids
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((item) => String(item ?? "").trim()).filter(Boolean)
    : []
  const status = String(req.body?.status ?? "").trim()
  if (ids.length === 0 || !status) {
    res.status(400).json({ error: "ids and status are required" })
    return
  }
  if (!allowedStockStatus.has(status)) {
    res.status(400).json({ error: "invalid status" })
    return
  }

  const result = await prisma.eldoradoKey.updateMany({
    where: { id: { in: ids } },
    data: { status },
  })
  res.json({ updated: result.count })
})

app.post("/api/eldorado/keys/bulk-delete", async (req, res) => {
  const idsRaw = req.body?.ids
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((item) => String(item ?? "").trim()).filter(Boolean)
    : []
  if (ids.length === 0) {
    res.status(400).json({ error: "ids are required" })
    return
  }
  const result = await prisma.eldoradoKey.deleteMany({ where: { id: { in: ids } } })
  res.json({ deleted: result.count })
})

app.post("/api/eldorado/notes", async (req, res) => {
  const offerId = String(req.body?.offerId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }
  const note = String(req.body?.note ?? "").trim()
  const assignment = await prisma.eldoradoNoteGroupAssignment.findUnique({ where: { offerId } })
  if (assignment?.groupId) {
    if (note) {
      await prisma.eldoradoNoteGroupNote.upsert({
        where: { groupId: assignment.groupId },
        update: { note },
        create: { groupId: assignment.groupId, note },
      })
    } else {
      await prisma.eldoradoNoteGroupNote.deleteMany({ where: { groupId: assignment.groupId } })
    }
  } else if (note) {
    await prisma.eldoradoOfferNote.upsert({
      where: { offerId },
      update: { note },
      create: { offerId, note },
    })
  } else {
    await prisma.eldoradoOfferNote.deleteMany({ where: { offerId } })
  }
  res.json({ ok: true })
})

app.post("/api/eldorado/note-groups", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }
  const existing = await prisma.eldoradoNoteGroup.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (existing) {
    res.json({
      id: existing.id,
      name: existing.name,
      createdAt: existing.createdAt.toISOString(),
    })
    return
  }
  const created = await prisma.eldoradoNoteGroup.create({ data: { name } })
  res.status(201).json({
    id: created.id,
    name: created.name,
    createdAt: created.createdAt.toISOString(),
  })
})

app.put("/api/eldorado/note-groups/assign", async (req, res) => {
  const offerId = String(req.body?.offerId ?? "").trim()
  const groupId = String(req.body?.groupId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }
  if (groupId) {
    const group = await prisma.eldoradoNoteGroup.findUnique({ where: { id: groupId } })
    if (!group) {
      res.status(404).json({ error: "group not found" })
      return
    }
    await prisma.eldoradoNoteGroupAssignment.upsert({
      where: { offerId },
      update: { groupId },
      create: { offerId, groupId },
    })
    const offerNote = await prisma.eldoradoOfferNote.findUnique({ where: { offerId } })
    if (offerNote?.note) {
      const existingGroupNote = await prisma.eldoradoNoteGroupNote.findUnique({
        where: { groupId },
      })
      if (!existingGroupNote?.note) {
        await prisma.eldoradoNoteGroupNote.upsert({
          where: { groupId },
          update: { note: offerNote.note },
          create: { groupId, note: offerNote.note },
        })
      }
    }
  } else {
    await prisma.eldoradoNoteGroupAssignment.deleteMany({ where: { offerId } })
  }
  res.json({ ok: true })
})

app.delete("/api/eldorado/note-groups/:id", async (req, res) => {
  const groupId = String(req.params.id ?? "").trim()
  if (!groupId) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  const group = await prisma.eldoradoNoteGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    res.status(404).json({ error: "group not found" })
    return
  }

  const assignments = await prisma.eldoradoNoteGroupAssignment.findMany({ where: { groupId } })
  const offerIds = assignments.map((entry) => entry.offerId)
  const groupNote = await prisma.eldoradoNoteGroupNote.findUnique({ where: { groupId } })

  const operations = []
  if (groupNote?.note) {
    offerIds.forEach((offerId) => {
      operations.push(
        prisma.eldoradoOfferNote.upsert({
          where: { offerId },
          update: {},
          create: { offerId, note: groupNote.note },
        }),
      )
    })
  }
  operations.push(prisma.eldoradoNoteGroupAssignment.deleteMany({ where: { groupId } }))
  operations.push(prisma.eldoradoNoteGroupNote.deleteMany({ where: { groupId } }))
  operations.push(prisma.eldoradoNoteGroup.delete({ where: { id: groupId } }))

  await prisma.$transaction(operations)
  res.json({ ok: true, affectedOffers: offerIds })
})

app.post("/api/eldorado/message-groups", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }
  const existing = await prisma.eldoradoMessageGroup.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (existing) {
    res.json({
      id: existing.id,
      name: existing.name,
      createdAt: existing.createdAt.toISOString(),
    })
    return
  }
  const created = await prisma.eldoradoMessageGroup.create({ data: { name } })
  res.status(201).json({
    id: created.id,
    name: created.name,
    createdAt: created.createdAt.toISOString(),
  })
})

app.put("/api/eldorado/message-groups/assign", async (req, res) => {
  const offerId = String(req.body?.offerId ?? "").trim()
  const groupId = String(req.body?.groupId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }
  if (groupId) {
    const group = await prisma.eldoradoMessageGroup.findUnique({ where: { id: groupId } })
    if (!group) {
      res.status(404).json({ error: "group not found" })
      return
    }
    await prisma.eldoradoMessageGroupAssignment.upsert({
      where: { offerId },
      update: { groupId },
      create: { offerId, groupId },
    })
  } else {
    await prisma.eldoradoMessageGroupAssignment.deleteMany({ where: { offerId } })
  }
  res.json({ ok: true })
})

app.delete("/api/eldorado/message-groups/:id", async (req, res) => {
  const groupId = String(req.params.id ?? "").trim()
  if (!groupId) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  const group = await prisma.eldoradoMessageGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    res.status(404).json({ error: "group not found" })
    return
  }
  await prisma.eldoradoMessageGroupAssignment.deleteMany({ where: { groupId } })
  await prisma.eldoradoMessageGroupTemplate.deleteMany({ where: { groupId } })
  await prisma.eldoradoMessageGroup.delete({ where: { id: groupId } })
  res.json({ ok: true })
})

app.post("/api/eldorado/message-groups/:id/templates", async (req, res) => {
  const groupId = String(req.params.id ?? "").trim()
  const label = String(req.body?.label ?? "").trim()
  if (!groupId || !label) {
    res.status(400).json({ error: "groupId and label are required" })
    return
  }
  const group = await prisma.eldoradoMessageGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    res.status(404).json({ error: "group not found" })
    return
  }
  await prisma.eldoradoMessageGroupTemplate.upsert({
    where: { groupId_label: { groupId, label } },
    update: {},
    create: { groupId, label },
  })
  res.json({ ok: true })
})

app.delete("/api/eldorado/message-groups/:id/templates", async (req, res) => {
  const groupId = String(req.params.id ?? "").trim()
  const label = String(req.query?.label ?? "").trim()
  if (!groupId || !label) {
    res.status(400).json({ error: "groupId and label are required" })
    return
  }
  await prisma.eldoradoMessageGroupTemplate.deleteMany({ where: { groupId, label } })
  res.json({ ok: true })
})

app.post("/api/eldorado/message-templates", async (req, res) => {
  const offerId = String(req.body?.offerId ?? "").trim()
  const label = String(req.body?.label ?? "").trim()
  if (!offerId || !label) {
    res.status(400).json({ error: "offerId and label are required" })
    return
  }
  await prisma.eldoradoMessageTemplate.upsert({
    where: { offerId_label: { offerId, label } },
    update: {},
    create: { offerId, label },
  })
  res.json({ ok: true })
})

app.delete("/api/eldorado/message-templates", async (req, res) => {
  const offerId = String(req.query?.offerId ?? "").trim()
  const label = String(req.query?.label ?? "").trim()
  if (!offerId || !label) {
    res.status(400).json({ error: "offerId and label are required" })
    return
  }
  await prisma.eldoradoMessageTemplate.deleteMany({ where: { offerId, label } })
  res.json({ ok: true })
})

app.put(
  "/api/eldorado/offers/:id/automation",
  requireAnyPermission(PRODUCT_STOCK_FETCH_EDIT_PERMISSIONS),
  async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const hasEnabled = Object.prototype.hasOwnProperty.call(req.body ?? {}, "enabled")
  const hasBackend = Object.prototype.hasOwnProperty.call(req.body ?? {}, "backend")
  const hasBackends = Object.prototype.hasOwnProperty.call(req.body ?? {}, "backends")
  if (!hasEnabled && !hasBackend && !hasBackends) {
    res.status(400).json({ error: "enabled, backend or backends is required" })
    return
  }

  const createData = { offerId, enabled: false, backend: null, backends: [] }
  const updateData = {}

  if (hasEnabled) {
    const enabledRaw = req.body?.enabled
    const enabled =
      typeof enabledRaw === "boolean" ? enabledRaw : String(enabledRaw).toLowerCase() === "true"
    createData.enabled = enabled
    updateData.enabled = enabled
  }

  if (hasBackends) {
    if (!Array.isArray(req.body?.backends)) {
      res.status(400).json({ error: "backends must be an array" })
      return
    }
    const normalizedBackends = Array.from(
      new Set(
        req.body.backends
          .map((item) => String(item ?? "").trim())
          .filter(Boolean),
      ),
    )
    createData.backends = normalizedBackends
    updateData.backends = normalizedBackends
    createData.backend = normalizedBackends[0] || null
    updateData.backend = normalizedBackends[0] || null
  }

  if (hasBackend) {
    const backend = String(req.body?.backend ?? "").trim()
    if (!hasBackends) {
      const backends = backend ? [backend] : []
      createData.backend = backend || null
      updateData.backend = backend || null
      createData.backends = backends
      updateData.backends = backends
    }
  }

  const saved = await prisma.eldoradoOfferAutomation.upsert({
    where: { offerId },
    create: createData,
    update: updateData,
  })

  res.json({
    ok: true,
    offerId: saved.offerId,
    enabled: Boolean(saved.enabled),
    backend: String(saved.backend ?? "").trim(),
    backends: Array.isArray(saved.backends) ? saved.backends : [],
  })
  },
)

app.get(
  "/api/eldorado/offers/:id/automation-targets",
  requireAnyPermission(PRODUCT_STOCK_FETCH_VIEW_PERMISSIONS),
  async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const rows = await prisma.eldoradoOfferAutomationTarget.findMany({
    where: { offerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })

  res.json(
    rows
      .map(normalizeOfferAutomationTarget)
      .filter(Boolean)
      .map((entry) => ({
        id: entry.id,
        backend: entry.backend,
        url: entry.url,
        starred: Boolean(entry.starred),
      })),
  )
  },
)

app.post(
  "/api/eldorado/offers/:id/automation-targets",
  requireAnyPermission(PRODUCT_STOCK_FETCH_EDIT_PERMISSIONS),
  async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const normalizedInput = normalizeOfferAutomationTargetInput(req.body)
  if (!normalizedInput) {
    res.status(400).json({ error: "backend and url are required" })
    return
  }

  const saved = await prisma.eldoradoOfferAutomationTarget.upsert({
    where: {
      offerId_backend_url: {
        offerId,
        backend: normalizedInput.backend,
        url: normalizedInput.url,
      },
    },
    update: {},
    create: {
      offerId,
      backend: normalizedInput.backend,
      url: normalizedInput.url,
    },
  })

  res.status(201).json({
    ok: true,
    target: {
      id: saved.id,
      backend: saved.backend,
      url: saved.url,
      starred: Boolean(saved.starred),
    },
  })
  },
)

app.delete(
  "/api/eldorado/offers/:id/automation-targets/:targetId",
  requireAnyPermission(PRODUCT_STOCK_FETCH_EDIT_PERMISSIONS),
  async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  const targetId = String(req.params.targetId ?? "").trim()
  if (!offerId || !targetId) {
    res.status(400).json({ error: "offerId and targetId are required" })
    return
  }

  const removed = await prisma.eldoradoOfferAutomationTarget.deleteMany({
    where: { offerId, id: targetId },
  })
  if (removed.count === 0) {
    res.status(404).json({ error: "automation target not found" })
    return
  }

  res.json({ ok: true, offerId, targetId })
  },
)

app.put(
  "/api/eldorado/offers/:id/automation-targets/:targetId/star",
  requireAnyPermission(PRODUCT_STOCK_FETCH_STAR_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    const targetId = String(req.params.targetId ?? "").trim()
    if (!offerId || !targetId) {
      res.status(400).json({ error: "offerId and targetId are required" })
      return
    }
    const starredRaw = req.body?.starred
    const starred =
      typeof starredRaw === "boolean" ? starredRaw : String(starredRaw).toLowerCase() === "true"

    const updated = await prisma.eldoradoOfferAutomationTarget.updateMany({
      where: { id: targetId, offerId },
      data: { starred },
    })
    if (updated.count === 0) {
      res.status(404).json({ error: "automation target not found" })
      return
    }

    const target = await prisma.eldoradoOfferAutomationTarget.findUnique({ where: { id: targetId } })
    const normalized = normalizeOfferAutomationTarget(target)
    if (!normalized) {
      res.status(404).json({ error: "automation target not found" })
      return
    }

    res.json({
      ok: true,
      target: {
        id: normalized.id,
        backend: normalized.backend,
        url: normalized.url,
        starred: Boolean(normalized.starred),
      },
    })
  },
)

app.get(
  "/api/eldorado/offers/:id/automation-logs",
  requireAnyPermission(PRODUCT_STOCK_FETCH_LOGS_PERMISSIONS),
  async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const rawLimit = Number(req.query?.limit ?? ELDORADO_AUTOMATION_LOG_LIMIT)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), ELDORADO_AUTOMATION_LOG_LIMIT)
    : ELDORADO_AUTOMATION_LOG_LIMIT

  const logs = await prisma.eldoradoAutomationRunLog.findMany({
    where: { offerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  })

  res.json(logs)
  },
)

app.delete(
  "/api/eldorado/offers/:id/automation-logs",
  requireAnyPermission(PRODUCT_STOCK_FETCH_LOGS_CLEAR_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const removed = await prisma.eldoradoAutomationRunLog.deleteMany({
      where: { offerId },
    })

    res.json({ ok: true, offerId, deletedCount: removed.count })
  },
)

app.post(
  "/api/eldorado/offers/:id/automation-logs",
  requireAnyPermission(PRODUCT_STOCK_FETCH_RUN_PERMISSIONS),
  async (req, res) => {
  const offerId = String(req.params.id ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }

  const normalized = normalizeEldoradoAutomationRunLogEntry(req.body, offerId)
  if (!normalized) {
    res.status(400).json({ error: "id, time, status and message are required" })
    return
  }

  await prisma.eldoradoAutomationRunLog.upsert({
    where: { id: normalized.id },
    create: normalized,
    update: {
      time: normalized.time,
      status: normalized.status,
      message: normalized.message,
      offerId: normalized.offerId,
    },
  })

  const overflow = await prisma.eldoradoAutomationRunLog.findMany({
    where: { offerId },
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: ELDORADO_AUTOMATION_LOG_LIMIT,
  })
  if (overflow.length > 0) {
    await prisma.eldoradoAutomationRunLog.deleteMany({
      where: {
        id: { in: overflow.map((entry) => entry.id) },
      },
    })
  }

  res.status(201).json({ ok: true })
  },
)

app.get(
  "/api/eldorado/automation-runs",
  requireAnyPermission(PRODUCT_STOCK_FETCH_LOGS_PERMISSIONS),
  async (_req, res) => {
    pruneEldoradoAutomationRuns()
    const runs = Array.from(eldoradoAutomationRunsByOffer.values())
      .map(serializeEldoradoAutomationRun)
      .filter(Boolean)
      .sort(sortApplicationRunsDesc)
    res.json(runs)
  },
)

app.get(
  "/api/eldorado/offers/:id/automation-run",
  requireAnyPermission(PRODUCT_STOCK_FETCH_LOGS_PERMISSIONS),
  async (req, res) => {
    pruneEldoradoAutomationRuns()
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }
    const run = eldoradoAutomationRunsByOffer.get(offerId)
    if (!run) {
      res.status(404).json({ error: "automation_run_not_found" })
      return
    }
    res.json({
      run: serializeEldoradoAutomationRun(run),
      logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
    })
  },
)

app.post(
  "/api/eldorado/offers/:id/automation-run",
  requireAnyPermission(PRODUCT_STOCK_FETCH_RUN_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const backend = String(req.body?.backend ?? "").trim()
    const url = String(req.body?.url ?? "").trim()
    const label = String(req.body?.label ?? "").trim() || "Stok cek"
    const starredRaw = req.body?.starred
    const starred =
      typeof starredRaw === "boolean" ? starredRaw : String(starredRaw ?? "").toLowerCase() === "true"

    if (!backend || !url) {
      res.status(400).json({ error: "backend and url are required" })
      return
    }

    const automationConfig = await prisma.automationConfig.findUnique({
      where: { id: "default" },
      select: { wsUrl: true },
    })
    const wsUrl = String(automationConfig?.wsUrl ?? "").trim()
    if (!wsUrl) {
      res.status(409).json({ error: "automation_ws_url_missing" })
      return
    }

    const { run, conflict } = createEldoradoAutomationRun({
      offerId,
      backend,
      url,
      starred,
      label,
      username: req.user?.username,
      wsUrl,
    })

    if (conflict) {
      res.status(409).json({
        error: "automation_run_in_progress",
        run: serializeEldoradoAutomationRun(run),
        logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
      })
      return
    }

    res.status(201).json({
      run: serializeEldoradoAutomationRun(run),
      logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
    })
  },
)

app.post(
  "/api/eldorado/offers/:id/automation-run/two-factor",
  requireAnyPermission(PRODUCT_STOCK_FETCH_RUN_PERMISSIONS),
  async (req, res) => {
    pruneEldoradoAutomationRuns()
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const run = eldoradoAutomationRunsByOffer.get(offerId)
    if (!run) {
      res.status(404).json({ error: "automation_run_not_found" })
      return
    }
    if (!isApplicationRunLiveStatus(run.status)) {
      res.status(409).json({ error: "automation_run_not_live" })
      return
    }
    if (!run.pendingTwoFactorPrompt?.backend) {
      res.status(409).json({ error: "automation_two_factor_not_requested" })
      return
    }

    const code = String(req.body?.code ?? "").trim()
    if (!code) {
      res.status(400).json({ error: "code is required" })
      return
    }

    const backend = String(run.pendingTwoFactorPrompt.backend ?? "").trim()
    const sent = sendEldoradoAutomationSocketEvent(run, "iki-faktor-kodu", {
      backend,
      code,
    })
    if (!sent) {
      res.status(409).json({ error: "automation_run_socket_not_open" })
      return
    }

    appendEldoradoAutomationRunLog(
      run,
      "running",
      `${buildEldoradoAutomationBackendDisplay(run, backend)} => Iki faktor kodu gonderildi.`,
    )
    run.pendingTwoFactorPrompt = null

    res.json({
      run: serializeEldoradoAutomationRun(run),
      logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
    })
  },
)

app.get(
  "/api/eldorado/offers/:id/price-command-logs",
  requireAnyPermission(PRODUCT_PRICE_LOGS_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const rawLimit = Number(req.query?.limit ?? ELDORADO_PRICE_COMMAND_LOG_LIMIT)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), ELDORADO_PRICE_COMMAND_LOG_LIMIT)
      : ELDORADO_PRICE_COMMAND_LOG_LIMIT

    const logs = await prisma.eldoradoPriceCommandRunLog.findMany({
      where: { offerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    })

    res.json(logs)
  },
)

app.delete(
  "/api/eldorado/offers/:id/price-command-logs",
  requireAnyPermission(PRODUCT_PRICE_LOGS_CLEAR_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const removed = await prisma.eldoradoPriceCommandRunLog.deleteMany({
      where: { offerId },
    })

    res.json({ ok: true, offerId, deletedCount: removed.count })
  },
)

app.post(
  "/api/eldorado/offers/:id/price-command-logs",
  requireAnyPermission(PRODUCT_PRICE_RUN_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const normalized = normalizeEldoradoPriceCommandRunLogEntry(req.body, offerId)
    if (!normalized) {
      res.status(400).json({ error: "id, time, status and message are required" })
      return
    }

    await prisma.eldoradoPriceCommandRunLog.upsert({
      where: { id: normalized.id },
      create: normalized,
      update: {
        time: normalized.time,
        status: normalized.status,
        message: normalized.message,
        offerId: normalized.offerId,
      },
    })

    const overflow = await prisma.eldoradoPriceCommandRunLog.findMany({
      where: { offerId },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: ELDORADO_PRICE_COMMAND_LOG_LIMIT,
    })
    if (overflow.length > 0) {
      await prisma.eldoradoPriceCommandRunLog.deleteMany({
        where: {
          id: { in: overflow.map((entry) => entry.id) },
        },
      })
    }

    res.status(201).json({ ok: true })
  },
)

app.get(
  "/api/eldorado/price-command-runs",
  requireAnyPermission(PRODUCT_PRICE_LOGS_PERMISSIONS),
  async (_req, res) => {
    pruneEldoradoPriceCommandRuns()
    const runs = Array.from(eldoradoPriceCommandRunsByOffer.values())
      .map(serializeEldoradoPriceCommandRun)
      .filter(Boolean)
      .sort(sortApplicationRunsDesc)
    res.json(runs)
  },
)

app.get(
  "/api/eldorado/offers/:id/price-command-run",
  requireAnyPermission(PRODUCT_PRICE_LOGS_PERMISSIONS),
  async (req, res) => {
    pruneEldoradoPriceCommandRuns()
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }
    const run = eldoradoPriceCommandRunsByOffer.get(offerId)
    if (!run) {
      res.status(404).json({ error: "price_command_run_not_found" })
      return
    }
    res.json({
      run: serializeEldoradoPriceCommandRun(run),
      logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
    })
  },
)

app.post(
  "/api/eldorado/offers/:id/price-command-run",
  requireAnyPermission(PRODUCT_PRICE_RUN_PERMISSIONS),
  async (req, res) => {
    const offerId = String(req.params.id ?? "").trim()
    if (!offerId) {
      res.status(400).json({ error: "offerId is required" })
      return
    }

    const result = roundPriceNumber(req.body?.result)
    if (!Number.isFinite(result)) {
      res.status(400).json({ error: "result must be a finite number" })
      return
    }

    const automationConfig = await prisma.automationConfig.findUnique({
      where: { id: "default" },
      select: { wsUrl: true },
    })
    const wsUrl = String(automationConfig?.wsUrl ?? "").trim()
    if (!wsUrl) {
      res.status(409).json({ error: "automation_ws_url_missing" })
      return
    }

    const { run, conflict } = createEldoradoPriceCommandRun({
      offerId,
      category: String(req.body?.category ?? "").trim(),
      result,
      label: String(req.body?.label ?? "").trim() || "Sonucu Gonder",
      username: req.user?.username,
      backendKey: String(req.body?.backendKey ?? "").trim() || "eldorado",
      backendLabel: String(req.body?.backendLabel ?? "").trim() || "eldorado",
      wsUrl,
    })

    if (conflict) {
      res.status(409).json({
        error: "price_command_run_in_progress",
        run: serializeEldoradoPriceCommandRun(run),
        logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
      })
      return
    }

    res.status(201).json({
      run: serializeEldoradoPriceCommandRun(run),
      logs: Array.isArray(run.logs) ? run.logs.map(serializeManagedRunLogEntry).filter(Boolean) : [],
    })
  },
)

app.get(
  "/api/eldorado/price-command-bulk-logs",
  requireAnyPermission(PRODUCT_PRICE_LOGS_PERMISSIONS),
  async (req, res) => {
    const username = String(req.user?.username ?? "").trim()
    if (!username) {
      res.status(401).json({ error: "username is required" })
      return
    }

    const rawLimit = Number(req.query?.limit ?? ELDORADO_PRICE_COMMAND_LOG_LIMIT)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), ELDORADO_PRICE_COMMAND_LOG_LIMIT)
      : ELDORADO_PRICE_COMMAND_LOG_LIMIT

    const logs = await prisma.eldoradoPriceCommandBulkLog.findMany({
      where: { username },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    })

    res.json(logs)
  },
)

app.delete(
  "/api/eldorado/price-command-bulk-logs",
  requireAnyPermission(PRODUCT_PRICE_LOGS_CLEAR_PERMISSIONS),
  async (req, res) => {
    const username = String(req.user?.username ?? "").trim()
    if (!username) {
      res.status(401).json({ error: "username is required" })
      return
    }

    const removed = await prisma.eldoradoPriceCommandBulkLog.deleteMany({
      where: { username },
    })

    res.json({ ok: true, username, deletedCount: removed.count })
  },
)

app.post(
  "/api/eldorado/price-command-bulk-logs",
  requireAnyPermission(PRODUCT_PRICE_RUN_PERMISSIONS),
  async (req, res) => {
    const username = String(req.user?.username ?? "").trim()
    if (!username) {
      res.status(401).json({ error: "username is required" })
      return
    }

    const normalized = normalizeEldoradoPriceCommandBulkLogEntry(req.body, username)
    if (!normalized) {
      res.status(400).json({ error: "id, time, status and message are required" })
      return
    }

    await prisma.eldoradoPriceCommandBulkLog.upsert({
      where: { id: normalized.id },
      create: normalized,
      update: {
        time: normalized.time,
        status: normalized.status,
        message: normalized.message,
        username: normalized.username,
      },
    })

    const overflow = await prisma.eldoradoPriceCommandBulkLog.findMany({
      where: { username },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: ELDORADO_PRICE_COMMAND_LOG_LIMIT,
    })
    if (overflow.length > 0) {
      await prisma.eldoradoPriceCommandBulkLog.deleteMany({
        where: {
          id: { in: overflow.map((entry) => entry.id) },
        },
      })
    }

    res.status(201).json({ ok: true })
  },
)

app.put("/api/eldorado/stock-enabled", async (req, res) => {
  const offerId = String(req.body?.offerId ?? "").trim()
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" })
    return
  }
  const enabledRaw = req.body?.enabled
  const enabled =
    typeof enabledRaw === "boolean" ? enabledRaw : String(enabledRaw).toLowerCase() === "true"
  await prisma.eldoradoStockEnabled.upsert({
    where: { offerId },
    update: { enabled },
    create: { offerId, enabled },
  })
  res.json({ ok: true, offerId, enabled })
})

const normalizeListCellFormat = (format) => {
  if (!format || typeof format !== "object" || Array.isArray(format)) return null
  const next = {}
  if (format.bold) next.bold = true
  if (format.italic) next.italic = true
  if (format.underline) next.underline = true
  if (["center", "right"].includes(format.align)) next.align = format.align
  if (["amber", "sky", "emerald", "rose"].includes(format.tone)) next.tone = format.tone
  if (["number", "percent", "currency", "date"].includes(format.type)) next.type = format.type
  if (next.type === "currency") {
    const currency = String(format.currency ?? "").trim().toUpperCase()
    if (currency) next.currency = currency
  }
  return Object.keys(next).length > 0 ? next : null
}

const normalizeListCell = (cell) => {
  if (cell === null || cell === undefined) return ""
  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") {
    return String(cell)
  }
  if (typeof cell === "object" && !Array.isArray(cell)) {
    const value = cell.value === null || cell.value === undefined ? "" : String(cell.value)
    const format = normalizeListCellFormat(cell.format)
    if (format) return { value, format }
    return value
  }
  return String(cell)
}

const normalizeListRows = (rows) => {
  if (!Array.isArray(rows)) return null
  return rows.map((row) => {
    if (!Array.isArray(row)) return []
    return row.map((cell) => normalizeListCell(cell))
  })
}

app.get("/api/lists", async (_req, res) => {
  const lists = await prisma.list.findMany({ orderBy: { createdAt: "desc" } })
  res.json(lists)
})

app.post("/api/lists", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }
  const rowsRaw = req.body?.rows
  const rows = rowsRaw === undefined ? undefined : normalizeListRows(rowsRaw)
  if (rowsRaw !== undefined && rows === null) {
    res.status(400).json({ error: "rows must be an array of arrays" })
    return
  }

  const created = await prisma.list.create({
    data: { name, rows: rows ?? [] },
  })
  res.status(201).json(created)
})

app.put("/api/lists/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const nameRaw = req.body?.name
  const rowsRaw = req.body?.rows
  const name = nameRaw === undefined ? undefined : String(nameRaw).trim()
  const rows = rowsRaw === undefined ? undefined : normalizeListRows(rowsRaw)

  if (name !== undefined && !name) {
    res.status(400).json({ error: "name cannot be empty" })
    return
  }
  if (rowsRaw !== undefined && rows === null) {
    res.status(400).json({ error: "rows must be an array of arrays" })
    return
  }

  try {
    const updated = await prisma.list.update({
      where: { id },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(rows === undefined ? {} : { rows }),
      },
    })
    res.json(updated)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "List not found" })
      return
    }
    throw error
  }
})

app.delete("/api/lists/:id", async (req, res) => {
  const id = String(req.params.id ?? "").trim()
  if (!id) {
    res.status(400).json({ error: "invalid id" })
    return
  }
  try {
    await prisma.list.delete({ where: { id } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "List not found" })
      return
    }
    throw error
  }
})

app.use(
  express.static(distDir, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase()
      if (ext === ".js") res.setHeader("Content-Type", "application/javascript; charset=utf-8")
      if (ext === ".css") res.setHeader("Content-Type", "text/css; charset=utf-8")
      if (ext === ".html") res.setHeader("Content-Type", "text/html; charset=utf-8")
      if (ext === ".json" || ext === ".map") {
        res.setHeader("Content-Type", "application/json; charset=utf-8")
      }
      if (ext === ".svg") res.setHeader("Content-Type", "image/svg+xml; charset=utf-8")
      if (ext === ".txt") res.setHeader("Content-Type", "text/plain; charset=utf-8")
    },
  })
)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.sendFile(path.join(distDir, "index.html"))
})

await ensureDefaults()

app.listen(port, () => {
  console.log(`Server listening on :${port}`)
})




