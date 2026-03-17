import { useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../constants/appConstants"
import {
  buildSocketIoWsUrl,
  parseSocketIoEventPacket,
  splitEnginePackets,
  testSocketIoConnection,
} from "../utils/socketIoClient"

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

const normalizeEventMessage = (value) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
const STAR_PREFIX = "\u2605 "

export default function useEldoradoAutomationRuntime({
  activeUsername = "",
  automationWsUrl = "",
  canRunAutomation = false,
  canClearAutomationLogs = false,
  canViewAutomationTargetDetails = true,
  maskSensitiveText,
  setAutomationResultPopup,
  maxAutomationRunLogEntries = 300,
}) {
  const maskSensitive = normalizeMaskFunction(maskSensitiveText)
  const [automationRunLogByOffer, setAutomationRunLogByOffer] = useState({})
  const [automationIsRunningByOffer, setAutomationIsRunningByOffer] = useState({})
  const [automationConnectionStateByOffer, setAutomationConnectionStateByOffer] = useState({})
  const [automationTwoFactorPromptByOffer, setAutomationTwoFactorPromptByOffer] = useState({})
  const [automationTwoFactorCodeByOffer, setAutomationTwoFactorCodeByOffer] = useState({})
  const [automationWsProbeStatus, setAutomationWsProbeStatus] = useState("idle")
  const [, setAutomationWsProbeMessage] = useState("")
  const [automationLogsLoadedByOffer, setAutomationLogsLoadedByOffer] = useState({})
  const [automationLogsLoadingByOffer, setAutomationLogsLoadingByOffer] = useState({})
  const [automationLogsClearingByOffer, setAutomationLogsClearingByOffer] = useState({})
  const automationWsProbeAttemptRef = useRef(0)
  const automationSocketByOfferRef = useRef({})

  const apiFetchAutomationLog = async (input, init = {}) => {
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
  }

  const persistAutomationRunLogEntry = async (offerId, entry) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId || !entry) return
    try {
      const res = await apiFetchAutomationLog(`/api/eldorado/offers/${normalizedId}/automation-logs`, {
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
  }

  const appendAutomationRunLog = (offerId, status, message, options = {}) => {
    const normalizedId = String(offerId ?? "").trim()
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedId || !normalizedMessage) return
    const entryTime = formatAutomationLogTimestamp()
    const entry = {
      id: `auto-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: entryTime,
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
  }

  const closeAutomationSocket = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const socket = automationSocketByOfferRef.current[normalizedId]
    if (socket) {
      try {
        socket.close()
      } catch {
        // Ignore close errors.
      }
      delete automationSocketByOfferRef.current[normalizedId]
    }
    setAutomationTwoFactorPromptByOffer((prev) => {
      if (!prev?.[normalizedId]) return prev
      const next = { ...prev }
      delete next[normalizedId]
      return next
    })
    setAutomationTwoFactorCodeByOffer((prev) => {
      if (!prev?.[normalizedId]) return prev
      const next = { ...prev }
      delete next[normalizedId]
      return next
    })
  }

  const loadAutomationRunLogs = async (offerId, options = {}) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return false
    const force = Boolean(options?.force)
    if (!force && automationLogsLoadedByOffer?.[normalizedId]) return true

    setAutomationLogsLoadingByOffer((prev) => ({ ...prev, [normalizedId]: true }))
    try {
      const res = await apiFetchAutomationLog(
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
      toast.error("CMD loglari alinamadi.")
      return false
    } finally {
      setAutomationLogsLoadingByOffer((prev) => {
        const next = { ...prev }
        delete next[normalizedId]
        return next
      })
    }
  }

  const clearAutomationRunLogs = async (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId || !canClearAutomationLogs) return false
    setAutomationLogsClearingByOffer((prev) => ({ ...prev, [normalizedId]: true }))
    try {
      const res = await apiFetchAutomationLog(`/api/eldorado/offers/${normalizedId}/automation-logs`, {
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
  }

  const handleAutomationTwoFactorCodeSubmit = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId || !canRunAutomation) return

    const prompt = automationTwoFactorPromptByOffer?.[normalizedId]
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

    const socket = automationSocketByOfferRef.current[normalizedId]
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      appendAutomationRunLog(normalizedId, "error", "Iki faktor kodu gonderilemedi: baglanti kapali.")
      toast.error("Websocket baglantisi acik degil.")
      return
    }

    const backendDisplay = canViewAutomationTargetDetails ? backend : maskSensitive(backend, 8)

    try {
      socket.send(
        `42${JSON.stringify([
          "iki-faktor-kodu",
          {
            backend,
            code,
          },
        ])}`,
      )
      appendAutomationRunLog(normalizedId, "running", `${backendDisplay} => Iki faktor kodu gonderildi.`)
      setAutomationTwoFactorCodeByOffer((prev) => ({ ...prev, [normalizedId]: "" }))
      setAutomationTwoFactorPromptByOffer((prev) => {
        const next = { ...prev }
        delete next[normalizedId]
        return next
      })
    } catch {
      appendAutomationRunLog(normalizedId, "error", `${backendDisplay} => Iki faktor kodu gonderilemedi.`)
      toast.error("Iki faktor kodu gonderilemedi.")
    }
  }

  const handleAutomationRun = (offerId, target, automationName) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    if (!canRunAutomation) return

    const backend = String(target?.backend ?? "").trim()
    const runUrl = String(target?.url ?? "").trim()
    const isStarredBackend = Boolean(target?.starred)
    const backendMasked = maskSensitive(backend, 8)
    const backendDisplayRaw = isStarredBackend ? `${STAR_PREFIX}${backend}` : backend
    const backendDisplay = canViewAutomationTargetDetails
      ? backendDisplayRaw
      : isStarredBackend
        ? `${STAR_PREFIX}${backendMasked}`
        : backendMasked
    const runUrlDisplay = canViewAutomationTargetDetails ? runUrl : maskSensitive(runUrl, 16)
    if (!backend) {
      toast.error("Calistirmak icin backend map secin.")
      return
    }
    if (!runUrl) {
      toast.error("Calistirmak icin URL secin.")
      return
    }

    const wsBaseUrl = String(automationWsUrl ?? "").trim()
    if (!wsBaseUrl) {
      toast.error("Websocket adresi bulunamadi. Stok cek sekmesinden kaydedin.")
      return
    }

    const triggerUrl = buildSocketIoWsUrl(wsBaseUrl, { backend, url: runUrl })
    if (!triggerUrl) {
      toast.error("Socket.IO adresi olusturulamadi.")
      return
    }

    const label = String(automationName ?? "").trim() || "Stok cek"
    const starterUsername = String(activeUsername ?? "").trim() || "bilinmeyen-kullanici"
    closeAutomationSocket(normalizedId)
    setAutomationIsRunningByOffer((prev) => ({ ...prev, [normalizedId]: true }))
    setAutomationConnectionStateByOffer((prev) => ({ ...prev, [normalizedId]: "connecting" }))
    if (typeof setAutomationResultPopup === "function") {
      setAutomationResultPopup((prev) => ({ ...prev, isOpen: false }))
    }
    const runToastId = toast.loading(`${label} calistiriliyor...`, { position: "top-right" })
    appendAutomationRunLog(normalizedId, "running", `Calistiran: ${starterUsername}`)
    appendAutomationRunLog(
      normalizedId,
      "running",
      `${label} tetikleniyor... backend=${backendDisplay}, url=${runUrlDisplay}`,
    )

    let settled = false
    let hasConnected = false
    let hasResult = false
    let copyValueFromScriptLog = ""
    let copyValueCaptureActive = false
    let copyValueLines = []
    let timeoutId = null

    const clearRunTimeout = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const complete = (status, message) => {
      if (settled) return
      settled = true
      clearRunTimeout()
      if (status === "success") {
        toast.success(message, { id: runToastId, position: "top-right" })
      } else if (status === "error") {
        toast.error(message, { id: runToastId, position: "top-right" })
      } else {
        toast.dismiss(runToastId)
      }
      setAutomationConnectionStateByOffer((prev) => {
        const next = { ...prev }
        if (hasConnected) {
          next[normalizedId] = "connected"
        } else if (status === "error") {
          next[normalizedId] = "error"
        } else {
          next[normalizedId] = "idle"
        }
        return next
      })
      appendAutomationRunLog(normalizedId, status, message)
      setAutomationIsRunningByOffer((prev) => ({ ...prev, [normalizedId]: false }))
      closeAutomationSocket(normalizedId)
    }

    const resetRunTimeout = (ms = 20000) => {
      clearRunTimeout()
      timeoutId = window.setTimeout(() => {
        if (hasResult) {
          complete("success", `${label} tamamlandi.`)
          return
        }
        complete("error", `${label} icin sonuc yaniti alinmadi (zaman asimi).`)
      }, ms)
    }

    const captureCopyValueFromScriptLog = (rawMessage) => {
      const text = String(rawMessage ?? "").replace(/\r/g, "")
      if (!text) return
      const marker = "COPY_VALUE:"
      const markerIndex = text.indexOf(marker)
      if (markerIndex >= 0) {
        copyValueCaptureActive = true
        copyValueLines = []
        const seededLines = text
          .slice(markerIndex + marker.length)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
        if (seededLines.length > 0) {
          copyValueLines.push(...seededLines)
          copyValueFromScriptLog = copyValueLines.join("\n")
        }
        return
      }
      if (!copyValueCaptureActive) return
      const appendedLines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^\[[^\]]+\]/.test(line) && !line.startsWith("Script "))
      if (appendedLines.length === 0) return
      copyValueLines.push(...appendedLines)
      copyValueFromScriptLog = copyValueLines.join("\n").trim()
    }

    let socket
    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      complete("error", `${label} icin websocket baglantisi baslatilamadi.`)
      return
    }

    automationSocketByOfferRef.current[normalizedId] = socket
    resetRunTimeout(15000)

    socket.addEventListener("message", (event) => {
      if (settled) return
      const payload = typeof event.data === "string" ? event.data : ""
      if (!payload) return
      const packets = splitEnginePackets(payload)

      for (const packet of packets) {
        if (settled) return

        if (packet === "2") {
          try {
            socket.send("3")
          } catch {
            // Ignore pong send errors.
          }
          continue
        }

        if (packet.startsWith("0{")) {
          try {
            socket.send("40")
          } catch {
            complete("error", `${label} icin Socket.IO connect paketi gonderilemedi.`)
          }
          continue
        }

        if (packet.startsWith("40")) {
          if (!hasConnected) {
            appendAutomationRunLog(normalizedId, "running", "Baglandi.")
          }
          hasConnected = true
          setAutomationConnectionStateByOffer((prev) => ({ ...prev, [normalizedId]: "connected" }))
          resetRunTimeout(300000)
          continue
        }

        if (packet.startsWith("41")) {
          if (hasResult) {
            complete("success", `${label} tamamlandi.`)
          } else {
            complete("error", `${label} tamamlanmadan baglanti kapandi (sonuc yok).`)
          }
          return
        }

        if (packet.startsWith("44")) {
          complete("error", `${label} tetiklenemedi. backend=${backendDisplay}`)
          return
        }

        const eventPacket = parseSocketIoEventPacket(packet)
        if (!eventPacket) continue
        const eventName = eventPacket.event.toLowerCase()
        const firstArg = eventPacket.args[0]

        if (eventName === "script-triggered" || eventName === "script-started") {
          appendAutomationRunLog(normalizedId, "running", `${backendDisplay} script baslatildi.`)
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "script-log") {
          const stream = String(firstArg?.stream ?? "").trim().toLowerCase()
          const rawMessage = String(firstArg?.message ?? "")
          if (rawMessage) {
            captureCopyValueFromScriptLog(rawMessage)
            const lines = rawMessage
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
            lines.forEach((line) => {
              appendAutomationRunLog(
                normalizedId,
                stream === "stderr" ? "error" : "running",
                line,
              )
            })
          }
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "iki-faktor-gerekli") {
          const rawTwoFactorBackend = String(firstArg?.backend ?? backend).trim() || backend
          const twoFactorBackendRaw =
            rawTwoFactorBackend === backend && isStarredBackend
              ? `${STAR_PREFIX}${rawTwoFactorBackend}`
              : rawTwoFactorBackend
          const twoFactorBackendMaskedBase = maskSensitive(rawTwoFactorBackend, 8)
          const twoFactorBackend = canViewAutomationTargetDetails
            ? twoFactorBackendRaw
            : rawTwoFactorBackend === backend && isStarredBackend
              ? `${STAR_PREFIX}${twoFactorBackendMaskedBase}`
              : twoFactorBackendMaskedBase
          const normalizedTwoFactorMessage =
            normalizeEventMessage(firstArg?.message ?? firstArg).replace(/\s+/g, " ").trim() ||
            "Iki faktor kodu gerekli."
          setAutomationTwoFactorPromptByOffer((prev) => ({
            ...prev,
            [normalizedId]: {
              backend: rawTwoFactorBackend,
              message: normalizedTwoFactorMessage,
            },
          }))
          setAutomationTwoFactorCodeByOffer((prev) => ({ ...prev, [normalizedId]: "" }))
          appendAutomationRunLog(
            normalizedId,
            "running",
            `${twoFactorBackend} => ${normalizedTwoFactorMessage}`,
          )
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "durum") {
          const rawDurumBackend = String(firstArg?.backend ?? backend).trim() || backend
          const durumBackendRaw =
            rawDurumBackend === backend && isStarredBackend
              ? `${STAR_PREFIX}${rawDurumBackend}`
              : rawDurumBackend
          const durumBackendMaskedBase = maskSensitive(rawDurumBackend, 8)
          const durumBackend = canViewAutomationTargetDetails
            ? durumBackendRaw
            : rawDurumBackend === backend && isStarredBackend
              ? `${STAR_PREFIX}${durumBackendMaskedBase}`
              : durumBackendMaskedBase
          const durumLines = normalizeEventMessage(firstArg?.message ?? firstArg)
            .replace(/\r/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)

          if (durumLines.length === 0) {
            appendAutomationRunLog(normalizedId, "running", `${durumBackend} => -`)
          } else {
            durumLines.forEach((line) => {
              appendAutomationRunLog(normalizedId, "running", `${durumBackend} => ${line}`)
            })
          }
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "script-exit") {
          copyValueCaptureActive = false
          const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
          if (Number.isFinite(exitCode)) {
            appendAutomationRunLog(
              normalizedId,
              exitCode === 0 ? "success" : "error",
              `Script cikti. Kod: ${exitCode}`,
            )
          } else {
            appendAutomationRunLog(normalizedId, "running", "Script cikis olayi alindi.")
          }
          if (!hasResult) {
            complete("error", `${label} cikti ancak sonuc alinmadi.`)
            return
          }
          resetRunTimeout(5000)
          continue
        }

        if (eventName === "sonuc") {
          const rawResultBackend = String(firstArg?.backend ?? backend).trim() || backend
          const resultBackendRaw =
            rawResultBackend === backend && isStarredBackend
              ? `${STAR_PREFIX}${rawResultBackend}`
              : rawResultBackend
          const resultBackendMaskedBase = maskSensitive(rawResultBackend, 8)
          const resultBackend = canViewAutomationTargetDetails
            ? resultBackendRaw
            : rawResultBackend === backend && isStarredBackend
              ? `${STAR_PREFIX}${resultBackendMaskedBase}`
              : resultBackendMaskedBase

          const normalizedRawValue = normalizeEventMessage(firstArg?.value)
          const normalizedLogValue = String(copyValueFromScriptLog ?? "")
          const trimmedRawValue = normalizedRawValue.trim()
          const trimmedLogValue = normalizedLogValue.trim()
          const hasMultilineLogValue = copyValueLines.length > 1 || normalizedLogValue.includes("\n")
          const useLogValueAsFallback =
            Boolean(trimmedLogValue) &&
            (hasMultilineLogValue ||
              !trimmedRawValue ||
              (!normalizedRawValue.includes("\n") && trimmedLogValue.length > trimmedRawValue.length))
          const finalRawValue = useLogValueAsFallback ? trimmedLogValue : normalizedRawValue
          const valueText = String(finalRawValue ?? "").trim()
          appendAutomationRunLog(normalizedId, "success", `${resultBackend} => ${valueText || "-"}`)
          if (typeof setAutomationResultPopup === "function") {
            setAutomationResultPopup({
              isOpen: true,
              offerId: normalizedId,
              title: label,
              backend: resultBackend,
              value: finalRawValue || "-",
            })
          }
          copyValueCaptureActive = false
          hasResult = true
          complete("success", `${label} tamamlandi.`)
          return
        }

        resetRunTimeout(300000)
      }
    })

    socket.addEventListener("error", () => {
      setAutomationConnectionStateByOffer((prev) => ({ ...prev, [normalizedId]: "error" }))
      complete("error", `${label} icin websocket baglanti hatasi olustu.`)
    })

    socket.addEventListener("close", () => {
      if (settled) return
      if (hasResult) {
        complete("success", `${label} tamamlandi.`)
        return
      }
      if (hasConnected) {
        complete("error", `${label} baglantisi acildi ancak sonuc gelmedi.`)
        return
      }
      complete("error", `${label} icin websocket baglantisi kapandi.`)
    })
  }

  useEffect(() => {
    return () => {
      Object.values(automationSocketByOfferRef.current).forEach((socket) => {
        try {
          socket?.close()
        } catch {
          // Ignore close errors.
        }
      })
      automationSocketByOfferRef.current = {}
    }
  }, [])

  useEffect(() => {
    const normalizedWsUrl = String(automationWsUrl ?? "").trim()
    if (!normalizedWsUrl) {
      setAutomationWsProbeStatus("idle")
      setAutomationWsProbeMessage("Websocket adresi kayitli degil.")
      return
    }

    const socketIoUrl = buildSocketIoWsUrl(normalizedWsUrl)
    if (!socketIoUrl) {
      setAutomationWsProbeStatus("error")
      setAutomationWsProbeMessage("Websocket adresi gecersiz.")
      return
    }

    const attemptId = automationWsProbeAttemptRef.current + 1
    automationWsProbeAttemptRef.current = attemptId
    setAutomationWsProbeStatus("connecting")
    setAutomationWsProbeMessage("Websocket baglantisi deneniyor...")

    let cancelled = false
    void testSocketIoConnection(socketIoUrl).then((result) => {
      if (cancelled || automationWsProbeAttemptRef.current !== attemptId) return
      if (result?.ok) {
        setAutomationWsProbeStatus("connected")
        setAutomationWsProbeMessage("Websocket sunucusuna baglandi.")
        return
      }
      setAutomationWsProbeStatus("error")
      setAutomationWsProbeMessage("Websocket baglantisi kurulamadi.")
    })

    return () => {
      cancelled = true
    }
  }, [automationWsUrl])

  return {
    automationRunLogByOffer,
    automationIsRunningByOffer,
    automationConnectionStateByOffer,
    automationTwoFactorPromptByOffer,
    automationTwoFactorCodeByOffer,
    setAutomationTwoFactorCodeByOffer,
    automationWsProbeStatus,
    automationLogsLoadingByOffer,
    automationLogsClearingByOffer,
    loadAutomationRunLogs,
    clearAutomationRunLogs,
    appendAutomationRunLog,
    handleAutomationRun,
    handleAutomationTwoFactorCodeSubmit,
  }
}
