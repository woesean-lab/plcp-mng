import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import pkg from "pg"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

dotenv.config()

const { Pool } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, "..", "dist")

const app = express()
const PORT = process.env.PORT || 4000
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://pulcipmessage:pulcipmessage@pulcipmessage_pulcipmessagedb:5432/pulcipmessage?sslmode=disable"

const pool = new Pool({
  connectionString: DATABASE_URL,
})

app.use(cors())
app.use(express.json())

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT '',
      category_name TEXT NOT NULL DEFAULT 'Genel',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(
    "INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
    ["Genel"],
  )
}

const getCategories = async () => {
  const { rows } = await pool.query("SELECT id, name FROM categories ORDER BY name ASC")
  return rows
}

const getTemplates = async () => {
  const { rows } = await pool.query(
    "SELECT id, label, value, category_name AS category FROM templates ORDER BY created_at DESC",
  )
  return rows
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/categories", async (req, res) => {
  try {
    const data = await getCategories()
    res.json({ data })
  } catch (error) {
    console.error("Categories error", error)
    res.status(500).json({ error: "Categories fetch failed" })
  }
})

app.post("/api/categories", async (req, res) => {
  const name = (req.body?.name || "").trim()
  if (!name) {
    return res.status(400).json({ error: "Kategori adı gerekli" })
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id, name",
      [name],
    )
    const created = rows[0]
    const data = created ? created : (await pool.query("SELECT id, name FROM categories WHERE name=$1", [name])).rows[0]
    res.status(created ? 201 : 200).json({ data })
  } catch (error) {
    console.error("Category insert error", error)
    res.status(500).json({ error: "Kategori eklenemedi" })
  }
})

app.delete("/api/categories/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: "Geçersiz id" })
  try {
    const { rows } = await pool.query("SELECT name FROM categories WHERE id=$1", [id])
    const target = rows[0]
    if (!target) return res.status(404).json({ error: "Kategori bulunamadı" })
    if (target.name === "Genel") return res.status(400).json({ error: "Genel kategorisi silinemez" })

    await pool.query("UPDATE templates SET category_name='Genel' WHERE category_name=$1", [target.name])
    await pool.query("DELETE FROM categories WHERE id=$1", [id])

    res.json({ ok: true })
  } catch (error) {
    console.error("Category delete error", error)
    res.status(500).json({ error: "Kategori silinemedi" })
  }
})

app.get("/api/templates", async (req, res) => {
  try {
    const data = await getTemplates()
    res.json({ data })
  } catch (error) {
    console.error("Templates error", error)
    res.status(500).json({ error: "Şablonlar alınamadı" })
  }
})

app.post("/api/templates", async (req, res) => {
  const label = (req.body?.label || "").trim()
  const value = (req.body?.value || "").trim()
  const category = (req.body?.category || "Genel").trim() || "Genel"

  if (!label && !value) return res.status(400).json({ error: "Başlık veya mesaj gerekli" })

  try {
    await pool.query("INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [category])
    const { rows } = await pool.query(
      `
        INSERT INTO templates (label, value, category_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (label) DO UPDATE
        SET value = EXCLUDED.value,
            category_name = EXCLUDED.category_name,
            updated_at = NOW()
        RETURNING id, label, value, category_name AS category;
      `,
      [label || `Mesaj ${Date.now()}`, value, category],
    )
    res.status(201).json({ data: rows[0] })
  } catch (error) {
    console.error("Template insert error", error)
    res.status(500).json({ error: "Şablon eklenemedi" })
  }
})

app.delete("/api/templates/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: "Geçersiz id" })
  try {
    await pool.query("DELETE FROM templates WHERE id=$1", [id])
    res.json({ ok: true })
  } catch (error) {
    console.error("Template delete error", error)
    res.status(500).json({ error: "Şablon silinemedi" })
  }
})

// Serve static frontend if built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
} else {
  console.warn("dist/ not found; API-only mode")
}

const start = async () => {
  try {
    await ensureSchema()
    app.listen(PORT, () => {
      console.log(`API ready on :${PORT}`)
    })
  } catch (error) {
    console.error("Startup error", error)
    process.exit(1)
  }
}

start()
