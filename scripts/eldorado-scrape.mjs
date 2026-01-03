import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"
import { chromium } from "playwright"

const START_URL =
  process.env.ELDORADO_URL ??
  "https://www.eldorado.gg/users/PulcipStore?tab=Offers&category=CustomItem&pageIndex=1"
const TOTAL_PAGES = Number(process.env.ELDORADO_PAGES ?? 15)
const OUTPUT_PATH = process.env.ELDORADO_OUTPUT ?? "src/data/eldorado-products.json"
const TITLE_SELECTOR = process.env.ELDORADO_TITLE_SELECTOR ?? ".offer-title"
const DEFAULT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.resolve(process.cwd(), ".cache", "ms-playwright")
const SKIP_BROWSER_DOWNLOAD = process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1"
const SKIP_PLAYWRIGHT_INSTALL = process.env.SKIP_PLAYWRIGHT_INSTALL === "1"

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = DEFAULT_BROWSERS_PATH
}

const normalizeHref = (href) => {
  if (!href) return ""
  const raw = String(href).trim()
  if (!raw) return ""
  const cleaned = raw.split("#")[0].split("?")[0]
  if (!cleaned) return ""
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      return new URL(cleaned).pathname
    } catch (error) {
      return cleaned
    }
  }
  return cleaned
}

const extractIdFromHref = (href) => {
  const path = normalizeHref(href)
  const parts = path.split("/").filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : ""
}

const extractCategoryFromHref = (href) => {
  const path = normalizeHref(href)
  const parts = path.split("/").filter(Boolean)
  return parts.length > 0 ? parts[0] : ""
}

const slugifyName = (value) => {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug ? `name-${slug}` : ""
}

const readExistingProducts = async () => {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("[eldorado] failed to read existing data:", error)
    }
    return []
  }
}

const installPlaywrightChromium = () =>
  new Promise((resolve, reject) => {
    const require = createRequire(import.meta.url)
    let cliPath = ""
    try {
      cliPath = require.resolve("playwright/cli")
    } catch (error) {
      reject(new Error("Playwright CLI not found."))
      return
    }
    const args = [cliPath, "install", "chromium"]
    if (process.env.PLAYWRIGHT_WITH_DEPS === "1") {
      args.push("--with-deps")
    }
    const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env })
    child.on("error", (error) => reject(error))
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Playwright install failed with code ${code}`))
      }
    })
  })

const ensurePlaywrightChromium = async () => {
  const executablePath = chromium.executablePath()
  try {
    await fs.access(executablePath)
    return
  } catch (error) {
    if (SKIP_PLAYWRIGHT_INSTALL || SKIP_BROWSER_DOWNLOAD) {
      throw new Error(`Playwright browser missing at ${executablePath}`)
    }
  }
  console.log("[eldorado] Playwright browser missing, installing chromium...")
  await installPlaywrightChromium()
}

const buildPageUrl = (url, pageIndex) => {
  const nextUrl = new URL(url)
  nextUrl.searchParams.set("pageIndex", String(pageIndex))
  return nextUrl.toString()
}

const run = async () => {
  if (!Number.isFinite(TOTAL_PAGES) || TOTAL_PAGES <= 0) {
    throw new Error("ELDORADO_PAGES must be a positive number")
  }

  await ensurePlaywrightChromium()

  const existing = (await readExistingProducts())
    .map((item) => ({
      id: String(item?.id ?? "").trim(),
      name: String(item?.name ?? "").trim(),
      href: normalizeHref(item?.href ?? ""),
      category: String(item?.category ?? "").trim(),
    }))
    .filter((item) => item.id || item.name)
  const existingById = new Map()
  const legacyByName = new Map()
  existing.forEach((item) => {
    if (item.id) existingById.set(item.id, item)
    if (!item.href && item.name) {
      legacyByName.set(item.name.toLowerCase(), item)
    }
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const scraped = []

  for (let pageIndex = 1; pageIndex <= TOTAL_PAGES; pageIndex += 1) {
    const pageUrl = buildPageUrl(START_URL, pageIndex)
    console.log(`[eldorado] page ${pageIndex}/${TOTAL_PAGES}: ${pageUrl}`)
    await page.goto(pageUrl, { waitUntil: "domcontentloaded" })
    await page.waitForSelector(TITLE_SELECTOR, { timeout: 30000 })
    await page.waitForTimeout(300)

    const pageItems = await page.$$eval(TITLE_SELECTOR, (nodes) =>
      nodes
        .map((node) => {
          const name = node.textContent?.trim() ?? ""
          const direct = node.closest("a[href]")
          const parent = node.parentElement
          const parentLink = parent ? parent.querySelector("a[href]") : null
          const grandLink = parent?.parentElement ? parent.parentElement.querySelector("a[href]") : null
          const link = direct || parentLink || grandLink
          const href = link?.getAttribute("href") ?? ""
          return { name, href }
        })
        .filter((item) => item.name),
    )
    console.log(`[eldorado] found ${pageItems.length} items`)
    scraped.push(...pageItems)
  }

  await browser.close()

  const merged = []
  const usedExisting = new Set()
  const seenIds = new Set()

  scraped.forEach((item) => {
    const name = String(item?.name ?? "").trim()
    const href = normalizeHref(item?.href ?? "")
    const derivedId = extractIdFromHref(href) || slugifyName(name)
    if (!derivedId) return
    if (seenIds.has(derivedId)) return
    const category = extractCategoryFromHref(href)
    let existingItem = existingById.get(derivedId)
    if (!existingItem && name) {
      existingItem = legacyByName.get(name.toLowerCase())
    }
    if (existingItem) {
      existingItem.id = derivedId
      existingItem.name = name
      existingItem.href = href
      existingItem.category = category
      usedExisting.add(existingItem)
      merged.push(existingItem)
    } else {
      merged.push({ id: derivedId, name, href, category })
    }
    seenIds.add(derivedId)
  })

  existing.forEach((item) => {
    if (usedExisting.has(item)) return
    if (item.id && seenIds.has(item.id)) return
    const isLegacy = !item.href && String(item.id ?? "").startsWith("eld-")
    if (isLegacy) return
    merged.push(item)
  })

  const outputDir = path.dirname(OUTPUT_PATH)
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8")
  console.log(`[eldorado] saved ${merged.length} items to ${OUTPUT_PATH}`)
}

run().catch((error) => {
  console.error("[eldorado] failed:", error)
  process.exitCode = 1
})
