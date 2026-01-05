import crypto from "node:crypto"
import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import "dotenv/config"
import express from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, "..")
const distDir = path.resolve(appRoot, "dist")
const eldoradoItemsUrl =
  process.env.ELDORADO_ITEMS_URL ??
  "https://www.eldorado.gg/users/PulcipStore?tab=Offers&category=CustomItem&pageIndex=1"
const eldoradoTopupsUrl =
  process.env.ELDORADO_TOPUPS_URL ??
  "https://www.eldorado.gg/users/PulcipStore?tab=Offers&category=TopUp&pageIndex=1"
const eldoradoItemsPagesRaw = Number(process.env.ELDORADO_ITEMS_PAGES ?? 15)
const eldoradoTopupsPagesRaw = Number(process.env.ELDORADO_TOPUPS_PAGES ?? 1)
const eldoradoItemsPages =
  Number.isFinite(eldoradoItemsPagesRaw) && eldoradoItemsPagesRaw > 0 ? eldoradoItemsPagesRaw : 15
const eldoradoTopupsPages =
  Number.isFinite(eldoradoTopupsPagesRaw) && eldoradoTopupsPagesRaw > 0 ? eldoradoTopupsPagesRaw : 1
const eldoradoTitleSelector = process.env.ELDORADO_TITLE_SELECTOR ?? ".offer-title"
const eldoradoDataDir = path.resolve(appRoot, "src", "data")
const eldoradoItemsPath = path.join(eldoradoDataDir, "eldorado-products.json")
const eldoradoTopupsPath = path.join(eldoradoDataDir, "eldorado-topups.json")
const eldoradoScriptPath = path.resolve(appRoot, "scripts", "eldorado-scrape.mjs")
const playwrightBrowsersPath =
  process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.resolve(appRoot, ".cache", "ms-playwright")
let eldoradoRefreshInFlight = false

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
  "stock.view",
  "stock.product.create",
  "stock.product.edit",
  "stock.product.delete",
  "stock.product.reorder",
  "stock.stock.add",
  "stock.stock.edit",
  "stock.stock.delete",
  "stock.stock.status",
  "stock.stock.copy",
  "stock.stock.bulk",
  "admin.roles.manage",
  "admin.users.manage",
]
const LEGACY_PERMISSIONS = [
  "messages.edit",
  "tasks.edit",
  "problems.manage",
  "lists.edit",
  "stock.manage",
  "admin.manage",
]
const allowedPermissions = new Set([...DEFAULT_ADMIN_PERMISSIONS, ...LEGACY_PERMISSIONS])

const normalizePermissions = (value) => {
  const rawList = Array.isArray(value) ? value : []
  return rawList
    .map((perm) => String(perm ?? "").trim())
    .filter((perm) => perm && allowedPermissions.has(perm))
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

const normalizeEldoradoOffer = (item) => {
  const id = String(item?.id ?? "").trim()
  const name = String(item?.name ?? "").trim()
  if (!id || !name) return null
  const priceRaw = item?.price
  const price = priceRaw === undefined || priceRaw === null ? "" : String(priceRaw).trim()
  const hrefRaw = item?.href
  const href = hrefRaw === undefined || hrefRaw === null ? "" : String(hrefRaw).trim()
  const categoryRaw = item?.category
  const category = categoryRaw === undefined || categoryRaw === null ? "" : String(categoryRaw).trim()
  const missing = Boolean(item?.missing)
  return {
    id,
    name,
    price,
    href,
    category,
    missing,
  }
}

const normalizeEldoradoList = (value) => {
  if (!Array.isArray(value)) return []
  return value.map(normalizeEldoradoOffer).filter(Boolean)
}

const normalizeEldoradoCatalog = (value) => ({
  items: Array.isArray(value?.items) ? value.items : [],
  topups: Array.isArray(value?.topups) ? value.topups : [],
  currency: Array.isArray(value?.currency) ? value.currency : [],
  accounts: Array.isArray(value?.accounts) ? value.accounts : [],
  giftCards: Array.isArray(value?.giftCards) ? value.giftCards : [],
})

const mapEldoradoOffersToCatalog = (offers, syncByKind) => {
  const items = []
  const topups = []

  offers.forEach((offer) => {
    const normalized = normalizeEldoradoOffer(offer)
    if (!normalized) return
    const kind = String(offer.kind ?? "items")
    const lastSyncAt = syncByKind?.get(kind)
    const seenAt = offer.lastSeenAt instanceof Date ? offer.lastSeenAt : null
    if (!normalized.missing) {
      normalized.missing = Boolean(lastSyncAt && (!seenAt || seenAt < lastSyncAt))
    }
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

const loadEldoradoCatalog = async () => {
  try {
    const [offers, syncs] = await Promise.all([
      prisma.eldoradoOffer.findMany({ orderBy: { name: "asc" } }),
      prisma.eldoradoSync.findMany(),
    ])
    if (offers.length > 0) {
      const syncByKind = new Map()
      syncs.forEach((entry) => {
        if (entry?.kind && entry?.lastSyncAt instanceof Date) {
          syncByKind.set(entry.kind, entry.lastSyncAt)
        }
      })
      const catalog = mapEldoradoOffersToCatalog(offers, syncByKind)
      return catalog
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

const syncEldoradoOffers = async (kind, offers, seenAtOverride) => {
  const normalized = normalizeEldoradoList(offers)
  if (normalized.length === 0) return 0
  const seenAt = seenAtOverride instanceof Date ? seenAtOverride : new Date()
  const operations = normalized.map((offer) => {
    const update = { name: offer.name, kind, lastSeenAt: seenAt, missing: offer.missing === true }
    if (offer.href) update.href = offer.href
    if (offer.category) update.category = offer.category
    if (offer.price) update.price = offer.price
    return prisma.eldoradoOffer.upsert({
      where: { id: offer.id },
      update,
      create: {
        id: offer.id,
        name: offer.name,
        price: offer.price || null,
        category: offer.category || null,
        href: offer.href || null,
        kind,
        missing: offer.missing === true,
        lastSeenAt: seenAt,
      },
    })
  })
  await prisma.$transaction(operations)
  return normalized.length
}

const markEldoradoSync = async (kind, syncedAt) => {
  await prisma.eldoradoSync.upsert({
    where: { kind },
    update: { lastSyncAt: syncedAt },
    create: { kind, lastSyncAt: syncedAt },
  })
}

const runEldoradoScrape = ({ url, pages, outputPath }) => {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ELDORADO_URL: url,
      ELDORADO_PAGES: String(pages),
      ELDORADO_OUTPUT: outputPath,
      ELDORADO_TITLE_SELECTOR: eldoradoTitleSelector,
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
        permissions: user.role.permissions || [],
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
  { label: "Hoş geldin", value: "Hoş geldin! Burada herkese yer var.", category: "Karşılama" },
  { label: "Bilgilendirme", value: "Son durum: Görev planlandığı gibi ilerliyor.", category: "Bilgilendirme" },
  { label: "Hatırlatma", value: "Unutma: Akşam 18:00 toplantısına hazır ol.", category: "Hatırlatma" },
]


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

  const adminRole =
    (await prisma.role.findUnique({ where: { name: "Admin" } })) ||
    (await prisma.role.create({
      data: { name: "Admin", permissions: DEFAULT_ADMIN_PERMISSIONS },
    }))

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

app.get("/api/templates", async (req, res) => {
  const templates = await prisma.template.findMany({ orderBy: { id: "asc" } })
  const stars = await prisma.templateStar.findMany({
    where: { userId: req.user.id },
    select: { templateId: true },
  })
  const starredIds = new Set(stars.map((entry) => entry.templateId))
  res.json(
    templates.map((tpl) => ({
      ...tpl,
      starred: starredIds.has(tpl.id),
    })),
  )
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

app.post("/api/templates/:id/star", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
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

  const template = await prisma.template.findUnique({ where: { id } })
  if (!template) {
    res.status(404).json({ error: "Template not found" })
    return
  }

  if (starred) {
    await prisma.templateStar.upsert({
      where: { templateId_userId: { templateId: id, userId: req.user.id } },
      update: {},
      create: { templateId: id, userId: req.user.id },
    })
  } else {
    await prisma.templateStar.deleteMany({
      where: { templateId: id, userId: req.user.id },
    })
  }

  res.json({ templateId: id, starred })
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

const allowedProblemStatus = new Set(["open", "resolved"])
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

app.get("/api/problems", async (_req, res) => {
  const problems = await prisma.problem.findMany({ orderBy: { createdAt: "desc" } })
  res.json(problems)
})

app.post("/api/problems", async (req, res) => {
  const username = String(req.body?.username ?? "").trim()
  const issue = String(req.body?.issue ?? "").trim()
  if (!username || !issue) {
    res.status(400).json({ error: "username and issue are required" })
    return
  }
  const created = await prisma.problem.create({ data: { username, issue, status: "open" } })
  res.status(201).json(created)
})

app.put("/api/problems/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" })
    return
  }

  const username = req.body?.username === undefined ? undefined : String(req.body.username).trim()
  const issue = req.body?.issue === undefined ? undefined : String(req.body.issue).trim()
  const statusRaw = req.body?.status === undefined ? undefined : String(req.body.status).trim()
  const status = statusRaw === undefined ? undefined : statusRaw || "open"

  if (status !== undefined && !allowedProblemStatus.has(status)) {
    res.status(400).json({ error: "invalid status" })
    return
  }
  if (username !== undefined && !username) {
    res.status(400).json({ error: "username cannot be empty" })
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
        ...(username === undefined ? {} : { username }),
        ...(issue === undefined ? {} : { issue }),
        ...(status === undefined ? {} : { status }),
      },
    })
    res.json(updated)
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

app.post("/api/eldorado/refresh", async (_req, res, next) => {
  if (eldoradoRefreshInFlight) {
    res.status(409).json({ error: "refresh_in_progress" })
    return
  }
  eldoradoRefreshInFlight = true
  try {
    await runEldoradoScrape({
      url: eldoradoItemsUrl,
      pages: eldoradoItemsPages,
      outputPath: eldoradoItemsPath,
    })
    await runEldoradoScrape({
      url: eldoradoTopupsUrl,
      pages: eldoradoTopupsPages,
      outputPath: eldoradoTopupsPath,
    })
    try {
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
    } catch (error) {
      console.warn("Failed to persist Eldorado offers to database.", error)
    }
    const catalog = await loadEldoradoCatalog()
    res.json({ ok: true, catalog })
  } catch (error) {
    const message = String(error?.message || "refresh_failed").trim()
    console.error("Eldorado refresh failed", error)
    res.status(500).json({ error: "refresh_failed", message })
  } finally {
    eldoradoRefreshInFlight = false
  }
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



