import crypto from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"

import "dotenv/config"
import express from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, "..", "dist")

const port = Number(process.env.PORT ?? 3000)
const authPassword = String(process.env.APP_PASSWORD ?? "").trim()
const authEnabled = authPassword.length > 0
const authTokenTtlMsRaw = Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 12)
const authTokenTtlMs =
  Number.isFinite(authTokenTtlMsRaw) && authTokenTtlMsRaw > 0
    ? authTokenTtlMsRaw
    : 1000 * 60 * 60 * 12
const authTokens = new Map()

const issueAuthToken = () => {
  const token = crypto.randomBytes(32).toString("hex")
  authTokens.set(token, Date.now() + authTokenTtlMs)
  return token
}

const isAuthTokenValid = (token) => {
  if (!token) return false
  const expiresAt = authTokens.get(token)
  if (!expiresAt) return false
  if (Date.now() > expiresAt) {
    authTokens.delete(token)
    return false
  }
  return true
}

const readAuthToken = (req) => {
  const header = req.get("authorization") || ""
  const [type, token] = header.split(" ")
  if (type !== "Bearer") return ""
  return token?.trim() || ""
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
  if (templateCount > 0) return

  const uniqueCategories = Array.from(new Set(initialTemplates.map((tpl) => tpl.category))).filter(Boolean)
  await prisma.category.createMany({
    data: uniqueCategories.map((name) => ({ name })),
    skipDuplicates: true,
  })
  await prisma.template.createMany({ data: initialTemplates })
}

const app = express()
app.disable("x-powered-by")

app.use(express.json({ limit: "64kb" }))

const requireAuth = (req, res, next) => {
  if (!authEnabled) return next()
  const token = readAuthToken(req)
  if (!isAuthTokenValid(token)) {
    res.status(401).json({ error: "unauthorized" })
    return
  }
  next()
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

app.post("/api/auth/login", (req, res) => {
  if (!authEnabled) {
    res.json({ ok: true, enabled: false })
    return
  }

  const password = String(req.body?.password ?? "")
  if (!password || password !== authPassword) {
    res.status(401).json({ ok: false, enabled: true })
    return
  }

  const token = issueAuthToken()
  res.json({ ok: true, enabled: true, token, expiresInMs: authTokenTtlMs })
})

app.get("/api/auth/verify", (req, res) => {
  if (!authEnabled) {
    res.json({ ok: true, enabled: false })
    return
  }

  const token = readAuthToken(req)
  if (!isAuthTokenValid(token)) {
    res.status(401).json({ ok: false, enabled: true })
    return
  }

  res.json({ ok: true, enabled: true })
})

app.use("/api", requireAuth)

app.get("/api/templates", async (_req, res) => {
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
    const created = await prisma.template.create({ data: { label, value, category } })
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
      data: { ...(label === undefined ? {} : { label }), ...(value === undefined ? {} : { value }), ...(category === undefined ? {} : { category }) },
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

const allowedProblemStatus = new Set(["open", "resolved"])
const allowedTaskStatus = new Set(["todo", "doing", "done"])
const allowedTaskDueTypes = new Set(["today", "repeat", "date"])
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

app.get("/api/tasks", async (_req, res) => {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } })
  res.json(tasks)
})

app.post("/api/tasks", async (req, res) => {
  const title = String(req.body?.title ?? "").trim()
  const noteRaw = req.body?.note
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
  const owner =
    ownerRaw === undefined ? undefined : ownerRaw === null ? null : String(ownerRaw).trim() || null

  const created = await prisma.task.create({
    data: {
      title,
      status: "todo",
      dueType,
      ...(note === undefined ? {} : { note }),
      ...(owner === undefined ? {} : { owner }),
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

  if (ownerRaw !== undefined) {
    if (ownerRaw === null) {
      data.owner = null
    } else {
      const owner = String(ownerRaw).trim()
      data.owner = owner ? owner : null
    }
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
    if (dueType === "today") {
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

app.use(express.static(distDir))
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"))
})

await ensureDefaults()

app.listen(port, () => {
  console.log(`Server listening on :${port}`)
})



