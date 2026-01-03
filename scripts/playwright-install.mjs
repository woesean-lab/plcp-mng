import fs from "node:fs"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import os from "node:os"
import process from "node:process"
import path from "node:path"

const isLinux = os.platform() === "linux"
const shouldSkip =
  process.env.SKIP_PLAYWRIGHT_INSTALL === "1" ||
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1"

if (!isLinux || shouldSkip) {
  process.exit(0)
}

const require = createRequire(import.meta.url)
const resolvePlaywrightCli = () => {
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
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return ""
}

const cliPath = resolvePlaywrightCli()
if (!cliPath) {
  console.warn("Playwright CLI not found, skipping browser install.")
  process.exit(0)
}

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(process.cwd(), ".cache", "ms-playwright")
}

try {
  const { chromium } = require("playwright")
  const executablePath = chromium.executablePath()
  if (executablePath && fs.existsSync(executablePath)) {
    process.exit(0)
  }
} catch (error) {
  console.warn("Playwright not available for precheck, continuing with install.")
}

const args = [cliPath, "install", "chromium"]
if (process.env.PLAYWRIGHT_WITH_DEPS === "1") {
  args.push("--with-deps")
}

const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env })
child.on("error", (error) => {
  console.error("Playwright install failed", error)
  process.exitCode = 1
})
child.on("exit", (code) => {
  process.exitCode = code ?? 1
})
