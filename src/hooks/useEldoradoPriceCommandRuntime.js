import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../constants/appConstants"
import { roundPriceNumber } from "../utils/priceMath"

const TRANSIENT_NETWORK_ERROR_MESSAGES = new Set([
  "failed to fetch",
  "load failed",
  "network request failed",
])
const START_RECOVERY_WINDOW_MS = 15000
const START_RECOVERY_DELAYS_MS = [0, 700, 1500]

const isTransientNetworkError = (error) => {
  const name = String(error?.name ?? "").trim().toLowerCase()
  const message = String(error?.message ?? "").trim().toLowerCase()
  return (
    name === "aborterror" ||
    message.includes("networkerror") ||
    TRANSIENT_NETWORK_ERROR_MESSAGES.has(message)
  )
}

const getRequestErrorMessage = (error, fallback) => {
  const normalizedFallback = String(fallback ?? "").trim() || "Islem tamamlanamadi."
  const message = String(error?.message ?? "").trim()
  if (!message || isTransientNetworkError(error)) return normalizedFallback
  return message
}

const waitForRetry = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })

const formatPriceCommandLogTime = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

const normalizePriceCommandPayload = (value = {}) => {
  const offerId = String(value?.offerId ?? value?.productId ?? value?.id ?? "").trim()
  const category = String(value?.category ?? "").trim()
  const result = roundPriceNumber(value?.result)

  return {
    offerId,
    category,
    result,
  }
}

const normalizePriceCommandLogEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!id || !time || !status || !message) return null
  return { id, time, status, message }
}

const normalizePriceCommandRunEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const offerId = String(entry?.offerId ?? "").trim()
  if (!id || !offerId) return null
  const result = Number(entry?.result)
  return {
    id,
    offerId,
    label: String(entry?.label ?? "").trim() || "Sonucu Gonder",
    status: String(entry?.status ?? "").trim() || "error",
    connectionState: String(entry?.connectionState ?? "").trim() || "idle",
    startedAtMs: Number(entry?.startedAtMs ?? 0) || 0,
    endedAtMs: Number(entry?.endedAtMs ?? 0) || 0,
    category: String(entry?.category ?? "").trim(),
    result: Number.isFinite(result) ? roundPriceNumber(result) : Number.NaN,
    lastMessage: String(entry?.lastMessage ?? "").trim(),
  }
}

const createPriceCommandError = (message, extra = {}) =>
  Object.assign(new Error(String(message ?? "").trim() || "Fiyat komutu hatasi"), {
    ...extra,
    message: String(message ?? "").trim() || "Fiyat komutu hatasi",
  })

const isLivePriceCommandRun = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase()
  return normalized === "running" || normalized === "connecting"
}

const sortPriceCommandRunsDesc = (a, b) => {
  const startedDiff = Number(b?.startedAtMs ?? 0) - Number(a?.startedAtMs ?? 0)
  if (startedDiff !== 0) return startedDiff
  return String(b?.id ?? "").localeCompare(String(a?.id ?? ""))
}

export default function useEldoradoPriceCommandRuntime({
  wsUrl = "",
  canRunPriceCommand = false,
  canViewPriceCommandLogs = false,
  defaultBackendKey = "eldorado",
  defaultBackendLabel = "eldorado",
  maxLogEntries = 120,
  isActive = false,
  trackedLogOfferIds = [],
}) {
  const canAccessPriceCommandRuns = canRunPriceCommand || canViewPriceCommandLogs
  const [priceCommandRunLogByOffer, setPriceCommandRunLogByOffer] = useState({})
  const [priceCommandIsRunningByOffer, setPriceCommandIsRunningByOffer] = useState({})
  const [priceCommandConnectionStateByOffer, setPriceCommandConnectionStateByOffer] = useState({})
  const [priceCommandLogsLoadedByOffer, setPriceCommandLogsLoadedByOffer] = useState({})
  const [priceCommandLogsLoadingByOffer, setPriceCommandLogsLoadingByOffer] = useState({})
  const [priceCommandLogsClearingByOffer, setPriceCommandLogsClearingByOffer] = useState({})
  const priceCommandRunByOfferRef = useRef({})
  const priceCommandRunningRef = useRef({})
  const pendingPriceCommandByOfferRef = useRef({})
  const priceCommandRunsRequestInFlightRef = useRef(false)
  const priceCommandLogsRequestByOfferRef = useRef({})

  const apiFetchPriceCommand = useCallback(async (input, init = {}) => {
    const headers = new Headers(init.headers || {})
    if (typeof window !== "undefined") {
      try {
        const token = String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "").trim()
        if (token) {
          headers.set("Authorization", `Bearer ${token}`)
        }
      } catch {
        // Ignore localStorage read errors.
      }
    }
    return fetch(input, { ...init, headers })
  }, [])

  const persistPriceCommandLogEntry = useCallback(
    async (offerId, entry) => {
      const normalizedOfferId = String(offerId ?? "").trim()
      if (!normalizedOfferId || !entry) return
      try {
        const res = await apiFetchPriceCommand(
          `/api/eldorado/offers/${encodeURIComponent(normalizedOfferId)}/price-command-logs`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(entry),
          },
        )
        if (!res.ok) {
          // Ignore API-level errors; keep UI responsive.
        }
      } catch {
        // Ignore persistence errors; keep UI responsive.
      }
    },
    [apiFetchPriceCommand],
  )

  const appendPriceCommandLog = useCallback(
    (offerId, status, message, options = {}) => {
      const normalizedOfferId = String(offerId ?? "").trim()
      const normalizedMessage = String(message ?? "").trim()
      if (!normalizedOfferId || !normalizedMessage) return
      const entry = {
        id: `price-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: formatPriceCommandLogTime(),
        status: String(status ?? "").trim() || "running",
        message: normalizedMessage,
      }
      setPriceCommandRunLogByOffer((prev) => {
        const current = Array.isArray(prev?.[normalizedOfferId]) ? prev[normalizedOfferId] : []
        return {
          ...prev,
          [normalizedOfferId]: [entry, ...current].slice(0, maxLogEntries),
        }
      })
      if (options?.persist !== false) {
        void persistPriceCommandLogEntry(normalizedOfferId, entry)
      }
    },
    [maxLogEntries, persistPriceCommandLogEntry],
  )

  const settlePendingPriceCommand = useCallback((run) => {
    if (!run || isLivePriceCommandRun(run.status)) return
    const pending = pendingPriceCommandByOfferRef.current?.[run.offerId]
    if (!pending || pending.runId !== run.id) return

    delete pendingPriceCommandByOfferRef.current[run.offerId]

    const message =
      run.lastMessage ||
      (run.status === "success" ? `${run.label} tamamlandi.` : `${run.label} tamamlanamadi.`)
    const outcome = {
      offerId: run.offerId,
      category: run.category || pending.category,
      result: Number.isFinite(run.result) ? run.result : pending.result,
      status: run.status,
      message,
      connected: String(run.connectionState ?? "").trim().toLowerCase() === "connected",
      hasResult: run.status === "success",
    }

    if (pending.showToast) {
      if (run.status === "success") {
        toast.success(message, { position: "top-right" })
      } else {
        toast.error(message, { position: "top-right" })
      }
    }

    if (run.status === "success") {
      pending.resolve(outcome)
    } else {
      pending.reject(createPriceCommandError(message, outcome))
    }
  }, [])

  const commitPriceCommandRunMap = useCallback(
    (nextMap) => {
      const normalizedMap = { ...nextMap }
      priceCommandRunByOfferRef.current = normalizedMap
      const runs = Object.values(normalizedMap).sort(sortPriceCommandRunsDesc)

      const runningMap = {}
      const connectionMap = {}
      runs.forEach((run) => {
        runningMap[run.offerId] = isLivePriceCommandRun(run.status)
        connectionMap[run.offerId] = run.connectionState || "idle"
        settlePendingPriceCommand(run)
      })

      priceCommandRunningRef.current = runningMap
      setPriceCommandIsRunningByOffer(runningMap)
      setPriceCommandConnectionStateByOffer(connectionMap)
    },
    [settlePendingPriceCommand],
  )

  const applyPriceCommandRunSnapshot = useCallback(
    (payload) => {
      const run = normalizePriceCommandRunEntry(payload?.run ?? payload)
      if (!run) return null
      commitPriceCommandRunMap({
        ...priceCommandRunByOfferRef.current,
        [run.offerId]: run,
      })
      if (Array.isArray(payload?.logs)) {
        const normalizedLogs = payload.logs.map(normalizePriceCommandLogEntry).filter(Boolean)
        setPriceCommandRunLogByOffer((prev) => ({
          ...prev,
          [run.offerId]: normalizedLogs.slice(0, maxLogEntries),
        }))
      }
      return run
    },
    [commitPriceCommandRunMap, maxLogEntries],
  )

  const recoverPriceCommandRunAfterTransientStartError = useCallback(
    async (offerId, startedAtMs) => {
      const normalizedOfferId = String(offerId ?? "").trim()
      if (!normalizedOfferId) return null

      for (const delayMs of START_RECOVERY_DELAYS_MS) {
        if (delayMs > 0) {
          await waitForRetry(delayMs)
        }

        try {
          const res = await apiFetchPriceCommand(
            `/api/eldorado/offers/${encodeURIComponent(normalizedOfferId)}/price-command-run`,
          )
          if (res.status === 404) {
            continue
          }
          if (!res.ok) {
            continue
          }

          const run = applyPriceCommandRunSnapshot(await res.json())
          if (run && Number(run.startedAtMs ?? 0) >= startedAtMs - START_RECOVERY_WINDOW_MS) {
            return run
          }
        } catch {
          // Ignore transient recovery failures and keep retrying.
        }
      }

      return null
    },
    [apiFetchPriceCommand, applyPriceCommandRunSnapshot],
  )

  const fetchPriceCommandRuns = useCallback(
    async ({ silent = true } = {}) => {
      if (!canAccessPriceCommandRuns) return
      if (priceCommandRunsRequestInFlightRef.current) return
      priceCommandRunsRequestInFlightRef.current = true
      try {
        const res = await apiFetchPriceCommand("/api/eldorado/price-command-runs")
        if (!res.ok) {
          throw new Error("price_command_runs_load_failed")
        }
        const payload = await res.json()
        const nextMap = {}
        if (Array.isArray(payload)) {
          payload.map(normalizePriceCommandRunEntry).filter(Boolean).forEach((run) => {
            nextMap[run.offerId] = run
          })
        }
        commitPriceCommandRunMap(nextMap)
      } catch {
        if (!silent) {
          toast.error("Fiyat komut oturumlari alinamadi.")
        }
      } finally {
        priceCommandRunsRequestInFlightRef.current = false
      }
    },
    [apiFetchPriceCommand, canAccessPriceCommandRuns, commitPriceCommandRunMap],
  )

  const loadPriceCommandLogs = useCallback(
    async (offerId, options = {}) => {
      const normalizedOfferId = String(offerId ?? "").trim()
      if (!normalizedOfferId) return false
      const force = Boolean(options?.force)
      const silent = Boolean(options?.silent)
      if (!force && priceCommandLogsLoadedByOffer?.[normalizedOfferId]) return true
      if (priceCommandLogsRequestByOfferRef.current?.[normalizedOfferId]) return false

      priceCommandLogsRequestByOfferRef.current[normalizedOfferId] = true

      setPriceCommandLogsLoadingByOffer((prev) => ({ ...prev, [normalizedOfferId]: true }))
      try {
        const res = await apiFetchPriceCommand(
          `/api/eldorado/offers/${encodeURIComponent(normalizedOfferId)}/price-command-logs?limit=${maxLogEntries}`,
        )
        if (!res.ok) {
          throw new Error("price_command_logs_load_failed")
        }
        const payload = await res.json()
        const normalized = Array.isArray(payload)
          ? payload.map(normalizePriceCommandLogEntry).filter(Boolean)
          : []
        setPriceCommandRunLogByOffer((prev) => ({
          ...prev,
          [normalizedOfferId]: normalized.slice(0, maxLogEntries),
        }))
        setPriceCommandLogsLoadedByOffer((prev) => ({ ...prev, [normalizedOfferId]: true }))
        return true
      } catch {
        if (!silent) {
          toast.error("Fiyat komut loglari alinamadi.")
        }
        return false
      } finally {
        setPriceCommandLogsLoadingByOffer((prev) => {
          const next = { ...prev }
          delete next[normalizedOfferId]
          return next
        })
        delete priceCommandLogsRequestByOfferRef.current[normalizedOfferId]
      }
    },
    [apiFetchPriceCommand, maxLogEntries, priceCommandLogsLoadedByOffer],
  )

  const clearPriceCommandLogs = useCallback(
    async (offerId) => {
      const normalizedOfferId = String(offerId ?? "").trim()
      if (!normalizedOfferId || !canRunPriceCommand) return false
      setPriceCommandLogsClearingByOffer((prev) => ({ ...prev, [normalizedOfferId]: true }))
      try {
        const res = await apiFetchPriceCommand(
          `/api/eldorado/offers/${encodeURIComponent(normalizedOfferId)}/price-command-logs`,
          {
            method: "DELETE",
          },
        )
        if (!res.ok) {
          throw new Error("price_command_logs_clear_failed")
        }
        setPriceCommandRunLogByOffer((prev) => ({
          ...prev,
          [normalizedOfferId]: [],
        }))
        setPriceCommandLogsLoadedByOffer((prev) => ({ ...prev, [normalizedOfferId]: true }))
        toast.success("Fiyat komut loglari temizlendi.")
        return true
      } catch {
        toast.error("Fiyat komut loglari temizlenemedi.")
        return false
      } finally {
        setPriceCommandLogsClearingByOffer((prev) => {
          const next = { ...prev }
          delete next[normalizedOfferId]
          return next
        })
      }
    },
    [apiFetchPriceCommand, canRunPriceCommand],
  )

  const runPriceCommandAsync = useCallback(
    (payload = {}, options = {}) =>
      new Promise((resolve, reject) => {
        const showToast = options?.showToast !== false
        const fail = (message, extra = {}) => {
          if (showToast) {
            toast.error(message)
          }
          reject(createPriceCommandError(message, extra))
        }

        if (!canRunPriceCommand) {
          fail("Sonuc gonderme yetkiniz yok.")
          return
        }

        const normalized = normalizePriceCommandPayload(payload)
        if (!normalized.offerId) {
          fail("Urun ID bulunamadi.")
          return
        }
        if (!Number.isFinite(normalized.result)) {
          fail("Gecerli fiyat verisi girin.")
          return
        }
        if (priceCommandRunningRef.current?.[normalized.offerId]) {
          fail("Bu urun icin komut zaten calisiyor.")
          return
        }

        const backendKey = String(options?.backendKey ?? defaultBackendKey ?? "").trim() || "eldorado"
        const backendLabel = String(options?.backendLabel ?? defaultBackendLabel ?? backendKey).trim() || backendKey
        if (!String(wsUrl ?? "").trim()) {
          fail("Websocket adresi bulunamadi. Admin panelinden kaydedin.")
          return
        }

        const requestStartedAtMs = Date.now()

        void (async () => {
          try {
            const res = await apiFetchPriceCommand(
              `/api/eldorado/offers/${encodeURIComponent(normalized.offerId)}/price-command-run`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  category: normalized.category,
                  result: normalized.result,
                  label: String(options?.label ?? "").trim() || "Sonucu Gonder",
                  backendKey,
                  backendLabel,
                }),
              },
            )

            if (!res.ok) {
              const errorPayload = await res.json().catch(() => null)
              const apiError = String(errorPayload?.error ?? "").trim()
              if (apiError === "price_command_run_in_progress") {
                applyPriceCommandRunSnapshot(errorPayload)
                fail("Bu urun icin komut zaten calisiyor.")
                return
              }
              const message =
                apiError === "automation_ws_url_missing"
                  ? "Websocket adresi bulunamadi. Admin panelinden kaydedin."
                  : apiError || "Fiyat komutu baslatilamadi."
              fail(message)
              return
            }

            const payloadResult = await res.json()
            const run = applyPriceCommandRunSnapshot(payloadResult)
            if (!run) {
              fail("Fiyat komutu baslatilamadi.")
              return
            }

            pendingPriceCommandByOfferRef.current[normalized.offerId] = {
              runId: run.id,
              showToast,
              category: normalized.category,
              result: normalized.result,
              resolve,
              reject,
            }

            if (!isLivePriceCommandRun(run.status)) {
              settlePendingPriceCommand(run)
            }
          } catch (error) {
            if (isTransientNetworkError(error)) {
              const recoveredRun = await recoverPriceCommandRunAfterTransientStartError(
                normalized.offerId,
                requestStartedAtMs,
              )
              if (recoveredRun) {
                pendingPriceCommandByOfferRef.current[normalized.offerId] = {
                  runId: recoveredRun.id,
                  showToast,
                  category: normalized.category,
                  result: normalized.result,
                  resolve,
                  reject,
                }

                if (!isLivePriceCommandRun(recoveredRun.status)) {
                  settlePendingPriceCommand(recoveredRun)
                }
                return
              }
            }

            fail(getRequestErrorMessage(error, "Fiyat komutu baslatilamadi."))
          }
        })()
      }),
    [
      apiFetchPriceCommand,
      applyPriceCommandRunSnapshot,
      canRunPriceCommand,
      defaultBackendKey,
      defaultBackendLabel,
      recoverPriceCommandRunAfterTransientStartError,
      settlePendingPriceCommand,
      wsUrl,
    ],
  )

  const handlePriceCommandRun = useCallback(
    (payload = {}, options = {}) => {
      runPriceCommandAsync(payload, options).catch(() => {})
    },
    [runPriceCommandAsync],
  )

  useEffect(() => {
    if (!canAccessPriceCommandRuns) {
      commitPriceCommandRunMap({})
      return
    }
    if (!isActive) return

    const sync = () => {
      void fetchPriceCommandRuns({ silent: true })
    }

    sync()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      sync()
    }, 2500)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      sync()
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [canAccessPriceCommandRuns, commitPriceCommandRunMap, fetchPriceCommandRuns, isActive])

  useEffect(() => {
    if (!canAccessPriceCommandRuns || !isActive) return

    const trackedOfferIds = Array.from(
      new Set([
        ...(Array.isArray(trackedLogOfferIds) ? trackedLogOfferIds : []).map((offerId) =>
          String(offerId ?? "").trim(),
        ),
        ...Object.keys(priceCommandIsRunningByOffer || {}).filter((offerId) => priceCommandIsRunningByOffer?.[offerId]),
      ]),
    ).filter(Boolean)
    if (trackedOfferIds.length === 0) return

    const syncLogs = () => {
      trackedOfferIds.forEach((offerId) => {
        void loadPriceCommandLogs(offerId, { force: true, silent: true })
      })
    }

    syncLogs()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      syncLogs()
    }, 3000)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      syncLogs()
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [
    canAccessPriceCommandRuns,
    isActive,
    loadPriceCommandLogs,
    priceCommandIsRunningByOffer,
    trackedLogOfferIds,
  ])

  return {
    priceCommandRunLogByOffer,
    priceCommandIsRunningByOffer,
    priceCommandConnectionStateByOffer,
    priceCommandLogsLoadingByOffer,
    priceCommandLogsClearingByOffer,
    appendPriceCommandLog,
    loadPriceCommandLogs,
    clearPriceCommandLogs,
    runPriceCommandAsync,
    handlePriceCommandRun,
  }
}
