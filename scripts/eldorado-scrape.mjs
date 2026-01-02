import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"

const START_URL =
  process.env.ELDORADO_URL ??
  "https://www.eldorado.gg/users/PulcipStore?tab=Offers&category=CustomItem&pageIndex=1"
const TOTAL_PAGES = Number(process.env.ELDORADO_PAGES ?? 15)
const OUTPUT_PATH = process.env.ELDORADO_OUTPUT ?? "src/data/eldorado-products.json"
const TITLE_SELECTOR = process.env.ELDORADO_TITLE_SELECTOR ?? ".offer-title"

const buildPageUrl = (url, pageIndex) => {
  const nextUrl = new URL(url)
  nextUrl.searchParams.set("pageIndex", String(pageIndex))
  return nextUrl.toString()
}

const run = async () => {
  if (!Number.isFinite(TOTAL_PAGES) || TOTAL_PAGES <= 0) {
    throw new Error("ELDORADO_PAGES must be a positive number")
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const names = []

  for (let pageIndex = 1; pageIndex <= TOTAL_PAGES; pageIndex += 1) {
    const pageUrl = buildPageUrl(START_URL, pageIndex)
    console.log(`[eldorado] page ${pageIndex}/${TOTAL_PAGES}: ${pageUrl}`)
    await page.goto(pageUrl, { waitUntil: "domcontentloaded" })
    await page.waitForSelector(TITLE_SELECTOR, { timeout: 30000 })
    await page.waitForTimeout(300)

    const pageNames = await page.$$eval(TITLE_SELECTOR, (nodes) =>
      nodes
        .map((node) => node.textContent?.trim())
        .filter((value) => Boolean(value)),
    )
    console.log(`[eldorado] found ${pageNames.length} items`)
    names.push(...pageNames)
  }

  await browser.close()

  const outputDir = path.dirname(OUTPUT_PATH)
  await fs.mkdir(outputDir, { recursive: true })
  const payload = names.map((name, index) => ({ id: `eld-${index + 1}`, name }))
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`[eldorado] saved ${payload.length} items to ${OUTPUT_PATH}`)
}

run().catch((error) => {
  console.error("[eldorado] failed:", error)
  process.exitCode = 1
})
