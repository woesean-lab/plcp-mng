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
let cliPath = ""

try {
  cliPath = require.resolve("playwright/cli")
} catch (error) {
  console.warn("Playwright CLI not found, skipping browser install.")
  process.exit(0)
}

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(process.cwd(), ".cache", "ms-playwright")
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
