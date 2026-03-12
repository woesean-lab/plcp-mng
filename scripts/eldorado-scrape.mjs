import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"
import { chromium } from "playwright"

const DEFAULT_URLS = [
  "https://www.eldorado.gg/users/PulcipStore/shop/CustomItem?page=1",
  "https://www.eldorado.gg/users/PulcipStore/shop/Account?page=1",
  "https://www.eldorado.gg/users/PulcipStore/shop/GiftCard?page=1",
  "https://www.eldorado.gg/users/PulcipStore/shop/TopUp?page=1",
  "https://www.eldorado.gg/users/PulcipStore/shop/Currency?page=1",
]
const START_URLS = (process.env.ELDORADO_URLS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
const START_URL =
  process.env.ELDORADO_URL ??
  "https://www.eldorado.gg/users/PulcipStore/shop/CustomItem?page=1"
const SCRAPE_URLS =
  START_URLS.length > 0
    ? START_URLS
    : process.env.ELDORADO_URL
      ? [START_URL]
      : DEFAULT_URLS
const TOTAL_PAGES = Number(process.env.ELDORADO_PAGES ?? 0)
const MAX_PAGES = Number(process.env.ELDORADO_MAX_PAGES ?? 20)
const USE_TOTAL_PAGES = Number.isFinite(TOTAL_PAGES) && TOTAL_PAGES > 0
const OUTPUT_PATH = process.env.ELDORADO_OUTPUT ?? "src/data/eldorado-products.json"
const TITLE_SELECTOR = process.env.ELDORADO_TITLE_SELECTOR ?? ".offer-title"
const LOG_PATH = process.env.ELDORADO_LOG_PATH ?? ""
const DEFAULT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.resolve(process.cwd(), ".cache", "ms-playwright")
const SKIP_BROWSER_DOWNLOAD = process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1"
const SKIP_PLAYWRIGHT_INSTALL = process.env.SKIP_PLAYWRIGHT_INSTALL === "1"
// Intentionally fixed: scrape each category only once (no retry pass).
const MAX_SCRAPE_RETRIES = 0
const MIN_EXISTING_RATIO = Number(process.env.ELDORADO_MIN_EXISTING_RATIO ?? 0.95)
const MIN_EXISTING_DELTA = Number(process.env.ELDORADO_MIN_EXISTING_DELTA ?? 5)
const MISSING_STREAK_THRESHOLD_RAW = Number(process.env.ELDORADO_MISSING_STREAK_THRESHOLD ?? 2)
const KEEP_LEGACY_MIN_RATIO = 0.5
const MISSING_STREAK_THRESHOLD =
  Number.isFinite(MISSING_STREAK_THRESHOLD_RAW) && MISSING_STREAK_THRESHOLD_RAW > 0
    ? Math.floor(MISSING_STREAK_THRESHOLD_RAW)
    : 2

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = DEFAULT_BROWSERS_PATH
}

const writeLogLine = async (message) => {
  console.log(message)
  if (!LOG_PATH) return
  try {
    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true })
    await fs.appendFile(LOG_PATH, `${message}\n`, "utf8")
  } catch (error) {
    console.warn("[eldorado] failed to write log:", error)
  }
}

const logScrapePlan = async () => {
  const pagesHint = USE_TOTAL_PAGES ? `total_pages=${TOTAL_PAGES}` : `max_pages=${MAX_PAGES}`
  await writeLogLine(
    `[eldorado] plan urls=${SCRAPE_URLS.length} selector="${TITLE_SELECTOR}" ${pagesHint}`,
  )
  for (const [index, url] of SCRAPE_URLS.entries()) {
    await writeLogLine(`[eldorado] plan[${index + 1}/${SCRAPE_URLS.length}] ${url}`)
  }
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

const extractCategoryFromUrl = (url) => {
  if (!url) return ""
  try {
    const parsed = new URL(url)
    const queryCategory = String(parsed.searchParams.get("category") ?? "").trim()
    if (queryCategory) return queryCategory

    const parts = parsed.pathname.split("/").filter(Boolean)
    const lowered = parts.map((part) => part.toLowerCase())
    const shopIndex = lowered.indexOf("shop")
    if (lowered[0] === "users" && shopIndex >= 0) {
      return String(parts[shopIndex + 1] ?? "").trim()
    }
    return ""
  } catch (error) {
    return ""
  }
}

const slugifyName = (value) => {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug ? `name-${slug}` : ""
}

const buildDerivedId = (name, href) => extractIdFromHref(href) || slugifyName(name)

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

const resolvePlaywrightCli = async () => {
  const require = createRequire(import.meta.url)
  const candidates = []
  try {
    candidates.push(require.resolve("playwright/cli"))
  } catch (error) {
    // noop
  }
  try {
    candidates.push(require.resolve("playwright/cli.js"))
  } catch (error) {
    // noop
  }
  try {
    const pkgPath = require.resolve("playwright/package.json")
    const pkgDir = path.dirname(pkgPath)
    candidates.push(path.join(pkgDir, "cli.js"))
    candidates.push(path.join(pkgDir, "lib", "cli", "cli.js"))
  } catch (error) {
    // noop
  }
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      await fs.access(candidate)
      return candidate
    } catch (error) {
      // try next
    }
  }
  throw new Error("Playwright CLI not found.")
}

const installPlaywrightChromium = async () => {
  const cliPath = await resolvePlaywrightCli()
  const args = [cliPath, "install", "chromium"]
  if (process.env.PLAYWRIGHT_WITH_DEPS === "1") {
    args.push("--with-deps")
  }
  await new Promise((resolve, reject) => {
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
}

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
  const parts = nextUrl.pathname.split("/").filter(Boolean)
  const lowered = parts.map((part) => part.toLowerCase())
  const shopIndex = lowered.indexOf("shop")

  if (lowered[0] === "users" && shopIndex >= 0) {
    nextUrl.searchParams.set("page", String(pageIndex))
    nextUrl.searchParams.delete("pageIndex")
  } else {
    nextUrl.searchParams.set("pageIndex", String(pageIndex))
    nextUrl.searchParams.delete("page")
  }
  return nextUrl.toString()
}

const countUniqueScraped = (scraped) => {
  const seen = new Set()
  scraped.forEach((item) => {
    const name = String(item?.name ?? "").trim()
    const href = normalizeHref(item?.href ?? "")
    const derivedId = buildDerivedId(name, href)
    if (!derivedId) return
    seen.add(derivedId)
  })
  return seen.size
}

const waitForStableSelectorCount = async (page, selector, options = {}) => {
  const timeoutMs = Number(options.timeoutMs ?? 12000)
  const idleMs = Number(options.idleMs ?? 700)
  const pollMs = Number(options.pollMs ?? 250)
  const start = Date.now()
  let lastCount = -1
  let stableFor = 0

  while (Date.now() - start < timeoutMs) {
    const count = await page.locator(selector).count()
    if (count > 0 && count === lastCount) {
      stableFor += pollMs
      if (stableFor >= idleMs) {
        return
      }
    } else {
      stableFor = 0
      lastCount = count
    }
    await page.waitForTimeout(pollMs)
  }
}

const scrapeCategory = async (startUrl) => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const scraped = []
  const categoryHint = extractCategoryFromUrl(startUrl)
  const startTime = Date.now()

  let pageIndex = 1
  let emptyPages = 0
  const maxPages = USE_TOTAL_PAGES ? TOTAL_PAGES : Math.max(1, Math.floor(MAX_PAGES))

  while (pageIndex <= maxPages) {
    const pageUrl = buildPageUrl(startUrl, pageIndex)
    await writeLogLine(
      `[eldorado] page ${pageIndex}${USE_TOTAL_PAGES ? `/${TOTAL_PAGES}` : ""}: ${pageUrl}`,
    )
    await page.goto(pageUrl, { waitUntil: "domcontentloaded" })
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})
    const found = await page
      .waitForSelector(TITLE_SELECTOR, { timeout: 12000 })
      .then(() => true)
      .catch(() => false)
    if (!found) {
      emptyPages += 1
      if (!USE_TOTAL_PAGES && emptyPages >= 2) break
      pageIndex += 1
      continue
    }
    await waitForStableSelectorCount(page, TITLE_SELECTOR)

    const pageItems = await page.$$eval(TITLE_SELECTOR, (nodes) => {
      const findHref = (node) => {
        const direct = node.closest?.("a[href]")
        if (direct) {
          return direct.getAttribute("href") ?? ""
        }
        let current = node.parentElement
        for (let depth = 0; depth < 6 && current; depth += 1) {
          const link = current.querySelector?.("a[href]")
          if (link) {
            return link.getAttribute("href") ?? ""
          }
          current = current.parentElement
        }
        return ""
      }

      return nodes
        .map((node) => {
          const name = node.textContent?.trim() ?? ""
          const href = findHref(node)
          return { name, href }
        })
        .filter((item) => item.name)
    })
    const normalizedPageItems = pageItems
      .map((item) => ({
        name: String(item?.name ?? "").trim(),
        href: String(item?.href ?? "").trim(),
      }))
      .filter((item) => item.name)
    const hrefItems = normalizedPageItems.filter((item) => item.href)
    const missingHrefCount = normalizedPageItems.length - hrefItems.length

    await writeLogLine(`[eldorado] found ${normalizedPageItems.length} items`)
    if (missingHrefCount > 0) {
      await writeLogLine(`[eldorado] skipped ${missingHrefCount} items without href`)
    }
    if (normalizedPageItems.length === 0) {
      emptyPages += 1
      if (!USE_TOTAL_PAGES && emptyPages >= 2) break
    } else {
      emptyPages = 0
    }
    scraped.push(...hrefItems.map((item) => ({ ...item, category: categoryHint })))
    pageIndex += 1
  }

  await browser.close()
  const elapsed = Math.round((Date.now() - startTime) / 1000)
  await writeLogLine(
    `[eldorado] done category=${categoryHint || "unknown"} items=${scraped.length} time=${elapsed}s`,
  )
  return scraped
}

const scrapeAllPages = async () => {
  await logScrapePlan()
  const all = []
  for (const url of SCRAPE_URLS) {
    const items = await scrapeCategory(url)
    all.push(...items)
  }
  return all
}

const normalizeMinRatio = (value) => {
  if (!Number.isFinite(value)) return 0.95
  if (value <= 0) return 0
  if (value > 1) return 1
  return value
}

const run = async () => {
  if (!USE_TOTAL_PAGES && (!Number.isFinite(MAX_PAGES) || MAX_PAGES <= 0)) {
    throw new Error("ELDORADO_MAX_PAGES must be a positive number")
  }

  await ensurePlaywrightChromium()

  const minExistingRatio = normalizeMinRatio(MIN_EXISTING_RATIO)
  const maxRetries =
    Number.isFinite(MAX_SCRAPE_RETRIES) && MAX_SCRAPE_RETRIES > 0
      ? Math.floor(MAX_SCRAPE_RETRIES)
      : 0
  const minExistingDelta =
    Number.isFinite(MIN_EXISTING_DELTA) && MIN_EXISTING_DELTA > 0
      ? Math.floor(MIN_EXISTING_DELTA)
      : 0

  const existing = (await readExistingProducts())
    .map((item) => {
      const rawMissingStreak = Number(item?.missingStreak)
      const missingStreak =
        Number.isFinite(rawMissingStreak) && rawMissingStreak > 0
          ? Math.floor(rawMissingStreak)
          : Boolean(item?.missing)
            ? MISSING_STREAK_THRESHOLD
            : 0
      return {
        id: String(item?.id ?? "").trim(),
        name: String(item?.name ?? "").trim(),
        href: normalizeHref(item?.href ?? ""),
        category: String(item?.category ?? "").trim(),
        missing: Boolean(item?.missing) && missingStreak >= MISSING_STREAK_THRESHOLD,
        missingStreak,
        seenInRun: false,
      }
    })
    .filter((item) => item.id || item.name)
  const existingById = new Map()
  const legacyByName = new Map()
  existing.forEach((item) => {
    if (item.id) existingById.set(item.id, item)
    if (!item.href && item.name) {
      legacyByName.set(item.name.toLowerCase(), item)
    }
  })

  const minExpected =
    existing.length > 0
      ? Math.max(10, Math.floor(existing.length * minExistingRatio), existing.length - minExistingDelta)
      : 0
  let scraped = []
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    scraped = await scrapeAllPages()
    const scrapedUniqueCount = countUniqueScraped(scraped)
    if (minExpected === 0 || scrapedUniqueCount >= minExpected || attempt === maxRetries) {
      break
    }
    console.warn(
      `[eldorado] scraped ${scrapedUniqueCount} items; expected at least ${minExpected}. Retrying (${attempt + 1}/${maxRetries})`,
    )
  }

  const merged = []
  const usedExisting = new Set()
  const seenIds = new Set()

  scraped.forEach((item) => {
    const name = String(item?.name ?? "").trim()
    const href = normalizeHref(item?.href ?? "")
    const derivedId = buildDerivedId(name, href)
    if (!derivedId) return
    if (seenIds.has(derivedId)) return
    const category = extractCategoryFromHref(href) || item.category || extractCategoryFromUrl(href)
    let existingItem = existingById.get(derivedId)
    if (!existingItem && name) {
      existingItem = legacyByName.get(name.toLowerCase())
    }
    if (existingItem) {
      existingItem.id = derivedId
      existingItem.name = name
      existingItem.href = href
      existingItem.category = category
      existingItem.missing = false
      existingItem.missingStreak = 0
      existingItem.seenInRun = true
      usedExisting.add(existingItem)
      merged.push(existingItem)
    } else {
      merged.push({
        id: derivedId,
        name,
        href,
        category,
        missing: false,
        missingStreak: 0,
        seenInRun: true,
      })
    }
    seenIds.add(derivedId)
  })

  const scrapedUniqueCount = seenIds.size
  const shouldKeepLegacy =
    existing.length > 0 &&
    scrapedUniqueCount < Math.max(10, Math.floor(existing.length * KEEP_LEGACY_MIN_RATIO))
  if (shouldKeepLegacy) {
    console.warn(
      `[eldorado] scrape appears incomplete (${scrapedUniqueCount}/${existing.length}), keeping legacy items`,
    )
  }

  existing.forEach((item) => {
    if (usedExisting.has(item)) return
    if (item.id && seenIds.has(item.id)) return
    // Drop stale items without a link to avoid "other" category pollution.
    if (!item.href) return
    if (shouldKeepLegacy) {
      // Keep previous missing state when scrape is likely incomplete.
      // This avoids resetting a valid streak on transient partial runs.
    } else {
      const nextMissingStreak = Math.max(0, Number(item?.missingStreak ?? 0)) + 1
      item.missingStreak = nextMissingStreak
      item.missing = nextMissingStreak >= MISSING_STREAK_THRESHOLD
    }
    item.seenInRun = false
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
