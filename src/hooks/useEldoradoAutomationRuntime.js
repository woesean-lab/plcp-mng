import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../constants/appConstants"

const normalizeAutomationLogEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!id || !time || !status || !message) return null
  return { id, time, status, message }
}

const formatAutomationLogTimestamp = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

const normalizeMaskFunction = (maskSensitiveText) =>
  typeof maskSensitiveText === "function"
    ? maskSensitiveText
    : (value, minLength = 8) => {
        const raw = String(value ?? "").trim()
        const safeLength = Math.max(minLength, Math.min(raw.length || minLength, 48))
        return "*".repeat(safeLength)
      }

const normalizeAutomationPrompt = (value) => {
  const backend = String(value?.backend ?? "").trim()
  const message = String(value?.message ?? "").trim()
  if (!backend) return null
  return { backend, message }
}

const normalizeAutomationResultPopup = (value) => {
  if (!value || typeof value !== "object") return null
  return {
    title: String(value?.title ?? "").trim(),
    backend: String(value?.backend ?? "").trim(),
    value: String(value?.value ?? "").trim(),
  }
}

const normalizeAutomationRunEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const offerId = String(entry?.offerId ?? "").trim()
  if (!id || !offerId) return null
  return {
    id,
    offerId,
    label: String(entry?.label ?? "").trim() || "Stok cek",
    status: String(entry?.status ?? "").trim() || "error",
    connectionState: String(entry?.connectionState ?? "").trim() || "idle",
    startedAtMs: Number(entry?.startedAtMs ?? 0) || 0,
    endedAtMs: Number(entry?.endedAtMs ?? 0) || 0,
    lastMessage: String(entry?.lastMessage ?? "").trim(),
    pendingTwoFactorPrompt: normalizeAutomationPrompt(entry?.pendingTwoFactorPrompt),
    resultPopup: normalizeAutomationResultPopup(entry?.resultPopup),
  }
}

const isLiveAutomationRun = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase()
  return normalized === "running" || normalized === "connecting"
}

const sortAutomationRunsDesc = (a, b) => {
  const startedDiff = Number(b?.startedAtMs ?? 0) - Number(a?.startedAtMs ?? 0)
  if (startedDiff !== 0) return startedDiff
  return String(b?.id ?? "").localeCompare(String(a?.id ?? ""))
}

export default function useEldoradoAutomationRuntime({
  automationWsUrl = "",
  canRunAutomation = false,
  canViewAutomationLogs = false,
  canClearAutomationLogs = false,
  canViewAutomationTargetDetails = true,
  maskSensitiveText,
  setAutomationResultPopup,
  maxAutomationRunLogEntries = 300,
}) {
  const maskSensitive = normalizeMaskFunction(maskSensitiveText)
  const canAccessAutomationRuns = canRunAutomation || canViewAutomationLogs
  const [automationRunLogByOffer, setAutomationRunLogByOffer] = useState({})
  const [automationIsRunningByOffer, setAutomationIsRunningByOffer] = useState({})
  const [automationConnectionStateByOffer, setAutomationConnectionStateByOffer] = useState({})
  const [automationTwoFactorPromptByOffer, setAutomationTwoFactorPromptByOffer] = useState({})
  const [automationTwoFactorCodeByOffer, setAutomationTwoFactorCodeByOffer] = useState({})
  const [automationLogsLoadedByOffer, setAutomationLogsLoadedByOffer] = useState({})
  const [automationLogsLoadingByOffer, setAutomationLogsLoadingByOffer] = useState({})
  const [automationLogsClearingByOffer, setAutomationLogsClearingByOffer] = useState({})
  const automationRunByOfferRef = useRef({})
  const seenAutomationLiveRunIdsRef = useRef(new Set())
  const completedAutomationToastRunIdsRef = useRef(new Set())
  const shownAutomationResultRunIdsRef = useRef(new Set())

  const apiFetchAutomation = useCallback(async (input, init = {}) => {
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

  const persistAutomationRunLogEntry = useCallback(
    async (offerId, entry) => {
      const normalizedId = String(offerId ?? "").trim()
      if (!normalizedId || !entry) return
      try {
        const res = await apiFetchAutomation(`/api/eldorado/offers/${normalizedId}/automation-logs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(entry),
        })
        if (!res.ok) {
          // Ignore API-level errors; keep UI responsive.
        }
      } catch {
        // Ignore persistence errors; keep UI responsive.
      }
    },
    [apiFetchAutomation],
  )

  const appendAutomationRunLog = useCallback(
    (offerId, status, message, options = {}) => {
      const normalizedId = String(offerId ?? "").trim()
      const normalizedMessage = String(message ?? "").trim()
      if (!normalizedId || !normalizedMessage) return
      const entry = {
        id: `auto-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: formatAutomationLogTimestamp(),
        status: String(status ?? "").trim() || "running",
        message: normalizedMessage,
      }
      setAutomationRunLogByOffer((prev) => {
        const current = Array.isArray(prev?.[normalizedId]) ? prev[normalizedId] : []
        return {
          ...prev,
          [normalizedId]: [entry, ...current].slice(0, maxAutomationRunLogEntries),
        }
      })
      if (options?.persist !== false) {
        void persistAutomationRunLogEntry(normalizedId, entry)
      }
    },
    [maxAutomationRunLogEntries, persistAutomationRunLogEntry],
  )

  const commitAutomationRunMap = useCallback(
    (nextMap) => {
      const normalizedMap = { ...nextMap }
      automationRunByOfferRef.current = normalizedMap
      const runs = Object.values(normalizedMap).sort(sortAutomationRunsDesc)

      runs.forEach((run) => {
        if (isLiveAutomationRun(run.status)) {
          seenAutomationLiveRunIdsRef.current.add(run.id)
          return
        }

        if (
          seenAutomationLiveRunIdsRef.current.has(run.id) &&
          !completedAutomationToastRunIdsRef.current.has(run.id)
        ) {
          completedAutomationToastRunIdsRef.current.add(run.id)
          if (run.status === "success") {
            toast.success(run.lastMessage || `${run.label} tamamlandi.`, { position: "top-right" })
          } else if (run.status === "error") {
            toast.error(run.lastMessage || `${run.label} tamamlanamadi.`, { position: "top-right" })
          }
        }

        if (
          run.status === "success" &&
          run.resultPopup &&
          seenAutomationLiveRunIdsRef.current.has(run.id) &&
          !shownAutomationResultRunIdsRef.current.has(run.id) &&
          typeof setAutomationResultPopup === "function"
        ) {
          shownAutomationResultRunIdsRef.current.add(run.id)
          const popupBackend = canViewAutomationTargetDetails
            ? run.resultPopup.backend
            : maskSensitive(run.resultPopup.backend, 8)
          setAutomationResultPopup({
            isOpen: true,
            offerId: run.offerId,
            title: run.resultPopup.title || run.label || "Stok cek",
            backend: popupBackend || "-",
            value: run.resultPopup.value || "-",
          })
        }
      })

      setAutomationIsRunningByOffer(() => {
        const next = {}
        runs.forEach((run) => {
          next[run.offerId] = isLiveAutomationRun(run.status)
        })
        return next
      })

      setAutomationConnectionStateByOffer(() => {
        const next = {}
        runs.forEach((run) => {
          next[run.offerId] = run.connectionState || "idle"
        })
        return next
      })

      setAutomationTwoFactorPromptByOffer(() => {
        const next = {}
        runs.forEach((run) => {
          if (run.pendingTwoFactorPrompt) {
            next[run.offerId] = run.pendingTwoFactorPrompt
          }
        })
        return next
      })

      setAutomationTwoFactorCodeByOffer((prev) => {
        let next = prev
        const promptOfferIds = new Set(
          runs.filter((run) => run.pendingTwoFactorPrompt).map((run) => run.offerId),
        )
        Object.keys(prev).forEach((offerId) => {
          if (promptOfferIds.has(offerId)) return
          if (next === prev) next = { ...prev }
          delete next[offerId]
        })
        return next
      })
    },
    [canViewAutomationTargetDetails, maskSensitive, setAutomationResultPopup],
  )

  const applyAutomationRunSnapshot = useCallback(
    (payload) => {
      const run = normalizeAutomationRunEntry(payload?.run ?? payload)
      if (!run) return null
      commitAutomationRunMap({
        ...automationRunByOfferRef.current,
        [run.offerId]: run,
      })
      if (Array.isArray(payload?.logs)) {
        const normalizedLogs = payload.logs.map(normalizeAutomationLogEntry).filter(Boolean)
        setAutomationRunLogByOffer((prev) => ({
          ...prev,
          [run.offerId]: normalizedLogs.slice(0, maxAutomationRunLogEntries),
        }))
      }
      return run
    },
    [commitAutomationRunMap, maxAutomationRunLogEntries],
  )

  const fetchAutomationRuns = useCallback(
    async ({ silent = true } = {}) => {
      if (!canAccessAutomationRuns) return
      try {
        const res = await apiFetchAutomation("/api/eldorado/automation-runs")
        if (!res.ok) {
          throw new Error("automation_runs_load_failed")
        }
        const payload = await res.json()
        const nextMap = {}
        if (Array.isArray(payload)) {
          payload.map(normalizeAutomationRunEntry).filter(Boolean).forEach((run) => {
            nextMap[run.offerId] = run
          })
        }
        commitAutomationRunMap(nextMap)
      } catch {
        if (!silent) {
          toast.error("Stok cek oturumlari alinamadi.")
        }
      }
    },
    [apiFetchAutomation, canAccessAutomationRuns, commitAutomationRunMap],
  )

  const loadAutomationRunLogs = useCallback(
    async (offerId, options = {}) => {
      const normalizedId = String(offerId ?? "").trim()
      if (!normalizedId) return false
      const force = Boolean(options?.force)
      const silent = Boolean(options?.silent)
      if (!force && automationLogsLoadedByOffer?.[normalizedId]) return true

      setAutomationLogsLoadingByOffer((prev) => ({ ...prev, [normalizedId]: true }))
      try {
        const res = await apiFetchAutomation(
          `/api/eldorado/offers/${normalizedId}/automation-logs?limit=${maxAutomationRunLogEntries}`,
        )
        if (!res.ok) {
          throw new Error("automation_logs_load_failed")
        }
        const payload = await res.json()
        const normalized = Array.isArray(payload)
          ? payload.map(normalizeAutomationLogEntry).filter(Boolean)
          : []
        setAutomationRunLogByOffer((prev) => ({
          ...prev,
          [normalizedId]: normalized.slice(0, maxAutomationRunLogEntries),
        }))
        setAutomationLogsLoadedByOffer((prev) => ({ ...prev, [normalizedId]: true }))
        return true
      } catch {
        if (!silent) {
          toast.error("CMD loglari alinamadi.")
        }
        return false
      } finally {
        setAutomationLogsLoadingByOffer((prev) => {
          const next = { ...prev }
          delete next[normalizedId]
          return next
        })
      }
    },
    [apiFetchAutomation, automationLogsLoadedByOffer, maxAutomationRunLogEntries],
  )

  const clearAutomationRunLogs = useCallback(
    async (offerId) => {
      const normalizedId = String(offerId ?? "").trim()
      if (!normalizedId || !canClearAutomationLogs) return false
      setAutomationLogsClearingByOffer((prev) => ({ ...prev, [normalizedId]: true }))
      try {
        const res = await apiFetchAutomation(`/api/eldorado/offers/${normalizedId}/automation-logs`, {
          method: "DELETE",
        })
        if (!res.ok) {
          throw new Error("automation_logs_clear_failed")
        }
        setAutomationRunLogByOffer((prev) => ({
          ...prev,
          [normalizedId]: [],
        }))
        setAutomationLogsLoadedByOffer((prev) => ({ ...prev, [normalizedId]: true }))
        toast.success("CMD loglari temizlendi.")
        return true
      } catch {
        toast.error("CMD loglari temizlenemedi.")
        return false
      } finally {
        setAutomationLogsClearingByOffer((prev) => {
          const next = { ...prev }
          delete next[normalizedId]
          return next
        })
      }
    },
    [apiFetchAutomation, canClearAutomationLogs],
  )

  const handleAutomationTwoFactorCodeSubmit = useCallback(
    async (offerId) => {
      const normalizedId = String(offerId ?? "").trim()
      if (!normalizedId || !canRunAutomation) return

      const prompt =
        automationRunByOfferRef.current?.[normalizedId]?.pendingTwoFactorPrompt ??
        automationTwoFactorPromptByOffer?.[normalizedId] ??
        null
      const backend = String(prompt?.backend ?? "").trim()
      if (!backend) {
        toast.error("Iki faktor istegi bulunamadi.")
        return
      }

      const code = String(automationTwoFactorCodeByOffer?.[normalizedId] ?? "").trim()
      if (!code) {
        toast.error("Iki faktor kodunu girin.")
        return
      }

      try {
        const res = await apiFetchAutomation(
          `/api/eldorado/offers/${normalizedId}/automation-run/two-factor`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code }),
          },
        )
        if (!res.ok) {
          const errorPayload = await res.json().catch(() => null)
          const apiError = String(errorPayload?.error ?? "").trim()
          const message =
            apiError === "automation_run_socket_not_open"
              ? "Iki faktor kodu gonderilemedi: baglanti kapali."
              : apiError === "automation_two_factor_not_requested"
                ? "Iki faktor istegi bulunamadi."
                : "Iki faktor kodu gonderilemedi."
          throw new Error(message)
        }
        applyAutomationRunSnapshot(await res.json())
        setAutomationTwoFactorCodeByOffer((prev) => ({ ...prev, [normalizedId]: "" }))
      } catch (error) {
        const backendDisplay = canViewAutomationTargetDetails ? backend : maskSensitive(backend, 8)
        appendAutomationRunLog(
          normalizedId,
          "error",
          `${backendDisplay} => ${error?.message || "Iki faktor kodu gonderilemedi."}`,
        )
        toast.error(error?.message || "Iki faktor kodu gonderilemedi.")
      }
    },
    [
      apiFetchAutomation,
      appendAutomationRunLog,
      applyAutomationRunSnapshot,
      automationTwoFactorCodeByOffer,
      automationTwoFactorPromptByOffer,
      canRunAutomation,
      canViewAutomationTargetDetails,
      maskSensitive,
    ],
  )

  const handleAutomationRun = useCallback(
    async (offerId, target, automationName) => {
      const normalizedId = String(offerId ?? "").trim()
      if (!normalizedId || !canRunAutomation) return

      const backend = String(target?.backend ?? "").trim()
      const runUrl = String(target?.url ?? "").trim()
      const starred = Boolean(target?.starred)
      if (!backend) {
        toast.error("Calistirmak icin backend map secin.")
        return
      }
      if (!runUrl) {
        toast.error("Calistirmak icin URL secin.")
        return
      }
      if (!String(automationWsUrl ?? "").trim()) {
        toast.error("Websocket adresi bulunamadi. Stok cek sekmesinden kaydedin.")
        return
      }

      if (typeof setAutomationResultPopup === "function") {
        setAutomationResultPopup((prev) => ({ ...prev, isOpen: false }))
      }

      try {
        const res = await apiFetchAutomation(`/api/eldorado/offers/${normalizedId}/automation-run`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            backend,
            url: runUrl,
            starred,
            label: String(automationName ?? "").trim() || "Stok cek",
          }),
        })
        if (!res.ok) {
          const errorPayload = await res.json().catch(() => null)
          const apiError = String(errorPayload?.error ?? "").trim()
          if (apiError === "automation_run_in_progress") {
            applyAutomationRunSnapshot(errorPayload)
            throw new Error("Bu urun icin stok cek zaten calisiyor.")
          }
          const message =
            apiError === "automation_ws_url_missing"
              ? "Websocket adresi bulunamadi. Stok cek sekmesinden kaydedin."
              : apiError || "Stok cek baslatilamadi."
          throw new Error(message)
        }

        const run = applyAutomationRunSnapshot(await res.json())
        if (run) {
          seenAutomationLiveRunIdsRef.current.add(run.id)
          completedAutomationToastRunIdsRef.current.delete(run.id)
          shownAutomationResultRunIdsRef.current.delete(run.id)
        }
      } catch (error) {
        toast.error(error?.message || "Stok cek baslatilamadi.")
      }
    },
    [
      apiFetchAutomation,
      applyAutomationRunSnapshot,
      automationWsUrl,
      canRunAutomation,
      setAutomationResultPopup,
    ],
  )

  useEffect(() => {
    if (!canAccessAutomationRuns) {
      commitAutomationRunMap({})
      return
    }

    const sync = () => {
      void fetchAutomationRuns({ silent: true })
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
  }, [canAccessAutomationRuns, commitAutomationRunMap, fetchAutomationRuns])

  useEffect(() => {
    if (!canAccessAutomationRuns) return

    const trackedOfferIds = Array.from(
      new Set([
        ...Object.keys(automationLogsLoadedByOffer || {}).filter((offerId) => automationLogsLoadedByOffer?.[offerId]),
        ...Object.keys(automationIsRunningByOffer || {}).filter((offerId) => automationIsRunningByOffer?.[offerId]),
      ]),
    )
    if (trackedOfferIds.length === 0) return

    const syncLogs = () => {
      trackedOfferIds.forEach((offerId) => {
        void loadAutomationRunLogs(offerId, { force: true, silent: true })
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
    automationIsRunningByOffer,
    automationLogsLoadedByOffer,
    canAccessAutomationRuns,
    loadAutomationRunLogs,
  ])

  return {
    automationRunLogByOffer,
    automationIsRunningByOffer,
    automationConnectionStateByOffer,
    automationTwoFactorPromptByOffer,
    automationTwoFactorCodeByOffer,
    setAutomationTwoFactorCodeByOffer,
    automationLogsLoadingByOffer,
    automationLogsClearingByOffer,
    loadAutomationRunLogs,
    clearAutomationRunLogs,
    appendAutomationRunLog,
    handleAutomationRun,
    handleAutomationTwoFactorCodeSubmit,
  }
}
