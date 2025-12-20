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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

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

app.get("/api/products", async (_req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: { stocks: { orderBy: { createdAt: "asc" } } },
  })
  res.json(products)
})

app.post("/api/products", async (req, res) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) {
    res.status(400).json({ error: "name is required" })
    return
  }
  const deliveryTemplate = req.body?.deliveryTemplate === undefined ? undefined : String(req.body.deliveryTemplate).trim()
  const deliveryMessage = req.body?.deliveryMessage === undefined ? undefined : String(req.body.deliveryMessage).trim()
  const product = await prisma.product.create({
    data: {
      name,
      deliveryTemplate: deliveryTemplate || null,
      deliveryMessage: deliveryMessage || null,
      note: deliveryTemplate || null,
    },
  })
  res.status(201).json(product)
})

app.put("/api/products/:id", async (req, res) => {
  const productId = String(req.params.id ?? "").trim()
  if (!productId) {
    res.status(400).json({ error: "invalid product id" })
    return
  }
  const name =
    req.body?.name === undefined ? undefined : String(req.body.name ?? "").trim()
  if (name !== undefined && !name) {
    res.status(400).json({ error: "name cannot be empty" })
    return
  }
  const deliveryTemplate =
    req.body?.deliveryTemplate === undefined ? undefined : String(req.body.deliveryTemplate ?? "").trim()
  const deliveryMessage =
    req.body?.deliveryMessage === undefined ? undefined : String(req.body.deliveryMessage ?? "").trim()

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(deliveryTemplate === undefined ? {} : { deliveryTemplate: deliveryTemplate || null }),
        ...(deliveryMessage === undefined ? {} : { deliveryMessage: deliveryMessage || null }),
        ...(deliveryTemplate === undefined ? {} : { note: deliveryTemplate || null }),
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
  const productId = String(req.params.id ?? "").trim()
  if (!productId) {
    res.status(400).json({ error: "invalid product id" })
    return
  }
  try {
    await prisma.product.delete({ where: { id: productId } })
    res.status(204).end()
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Product not found" })
      return
    }
    throw error
  }
})

app.post("/api/products/:productId/stocks", async (req, res) => {
  const productId = String(req.params.productId ?? "").trim()
  if (!productId) {
    res.status(400).json({ error: "invalid product id" })
    return
  }
  const codes = Array.isArray(req.body?.codes) ? req.body.codes : []
  const normalized = codes
    .map((code) => String(code ?? "").trim())
    .filter((code) => code.length > 0)
  if (normalized.length === 0) {
    res.status(400).json({ error: "codes are required" })
    return
  }
  const existing = await prisma.product.findUnique({ where: { id: productId } })
  if (!existing) {
    res.status(404).json({ error: "Product not found" })
    return
  }
  const created = []
  for (const code of normalized) {
    created.push(await prisma.stock.create({ data: { code, productId } }))
  }
  res.status(201).json(created)
})

app.delete("/api/stocks/:id", async (req, res) => {
  const stockId = String(req.params.id ?? "").trim()
  if (!stockId) {
    res.status(400).json({ error: "invalid stock id" })
    return
  }
  try {
    const deleted = await prisma.stock.delete({ where: { id: stockId } })
    res.json(deleted)
  } catch (error) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Stock not found" })
      return
    }
    throw error
  }
})

app.post("/api/stocks/bulk-delete", async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
  const normalized = ids.map((id) => String(id ?? "").trim()).filter(Boolean)
  if (normalized.length === 0) {
    res.status(400).json({ error: "ids are required" })
    return
  }
  const stocks = await prisma.stock.findMany({
    where: { id: { in: normalized } },
  })
  await prisma.stock.deleteMany({
    where: { id: { in: normalized } },
  })
  res.json(stocks)
})

const allowedProblemStatus = new Set(["open", "resolved"])

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

app.use(express.static(distDir))
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"))
})

await ensureDefaults()

app.listen(port, () => {
  console.log(`Server listening on :${port}`)
})


