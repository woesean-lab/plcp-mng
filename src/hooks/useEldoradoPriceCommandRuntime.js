import { useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import {
  buildSocketIoWsUrl,
  parseSocketIoEventPacket,
  splitEnginePackets,
} from "../utils/socketIoClient"

const formatPriceCommandLogTime = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

const normalizeEventMessage = (value) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const normalizePriceCommandPayload = (value = {}) => {
  const offerId = String(value?.offerId ?? value?.productId ?? value?.id ?? "").trim()
  const category = String(value?.category ?? "").trim()
  const result = Number(value?.result)

  return {
    offerId,
    category,
    result,
  }
}

export default function useEldoradoPriceCommandRuntime({
  activeUsername = "",
  wsUrl = "",
  canRunPriceCommand = false,
  defaultBackendKey = "eldorado",
  defaultBackendLabel = "eldorado",
  maxLogEntries = 120,
}) {
  const [priceCommandRunLogByOffer, setPriceCommandRunLogByOffer] = useState({})
  const [priceCommandIsRunningByOffer, setPriceCommandIsRunningByOffer] = useState({})
  const [priceCommandConnectionStateByOffer, setPriceCommandConnectionStateByOffer] = useState({})
  const priceCommandSocketByOfferRef = useRef({})
  const priceCommandRunningRef = useRef({})

  useEffect(() => {
    priceCommandRunningRef.current = priceCommandIsRunningByOffer
  }, [priceCommandIsRunningByOffer])

  const appendPriceCommandLog = (offerId, status, message) => {
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
  }

  const clearPriceCommandLogs = (offerId) => {
    const normalizedOfferId = String(offerId ?? "").trim()
    if (!normalizedOfferId) return
    setPriceCommandRunLogByOffer((prev) => ({
      ...prev,
      [normalizedOfferId]: [],
    }))
  }

  const closePriceCommandSocket = (offerId) => {
    const normalizedOfferId = String(offerId ?? "").trim()
    if (!normalizedOfferId) return
    const socket = priceCommandSocketByOfferRef.current[normalizedOfferId]
    if (socket) {
      try {
        socket.close()
      } catch {
        // Ignore close errors.
      }
      delete priceCommandSocketByOfferRef.current[normalizedOfferId]
    }
  }

  const handlePriceCommandRun = (payload = {}, options = {}) => {
    if (!canRunPriceCommand) {
      toast.error("Sonuc gonderme yetkiniz yok.")
      return
    }

    const normalized = normalizePriceCommandPayload(payload)
    if (!normalized.offerId) {
      toast.error("Urun ID bulunamadi.")
      return
    }
    if (!Number.isFinite(normalized.result)) {
      toast.error("Gecerli fiyat verisi girin.")
      return
    }
    if (priceCommandRunningRef.current?.[normalized.offerId]) {
      toast.error("Bu urun icin komut zaten calisiyor.")
      return
    }

    const backendKey = String(options?.backendKey ?? defaultBackendKey ?? "").trim() || "eldorado"
    const backendLabel = String(options?.backendLabel ?? defaultBackendLabel ?? backendKey).trim() || backendKey
    const wsBaseUrl = String(wsUrl ?? "").trim()
    if (!wsBaseUrl) {
      toast.error("Websocket adresi bulunamadi. Admin panelinden kaydedin.")
      return
    }

    const triggerUrl = buildSocketIoWsUrl(wsBaseUrl, {
      backend: backendKey,
      category: normalized.category,
      result: normalized.result,
    })
    if (!triggerUrl) {
      toast.error("Socket.IO adresi olusturulamadi.")
      return
    }

    closePriceCommandSocket(normalized.offerId)
    setPriceCommandIsRunningByOffer((prev) => ({ ...prev, [normalized.offerId]: true }))
    setPriceCommandConnectionStateByOffer((prev) => ({ ...prev, [normalized.offerId]: "connecting" }))

    const label = String(options?.label ?? "").trim() || "Sonucu Gonder"
    const starterUsername = String(activeUsername ?? "").trim() || "bilinmeyen-kullanici"
    const runToastId = toast.loading(`${label} calistiriliyor...`, { position: "top-right" })

    appendPriceCommandLog(normalized.offerId, "running", `Calistiran: ${starterUsername}`)
    appendPriceCommandLog(
      normalized.offerId,
      "running",
      `Gonderiliyor: backend=${backendLabel}, kategori=${normalized.category || "-"}`,
    )
    appendPriceCommandLog(
      normalized.offerId,
      "running",
      `Result: ${normalized.result}`,
    )

    let settled = false
    let hasConnected = false
    let hasResult = false
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

      setPriceCommandConnectionStateByOffer((prev) => {
        const next = { ...prev }
        if (hasConnected) {
          next[normalized.offerId] = "connected"
        } else if (status === "error") {
          next[normalized.offerId] = "error"
        } else {
          next[normalized.offerId] = "idle"
        }
        return next
      })
      appendPriceCommandLog(normalized.offerId, status, message)
      setPriceCommandIsRunningByOffer((prev) => ({ ...prev, [normalized.offerId]: false }))
      closePriceCommandSocket(normalized.offerId)
    }

    const resetRunTimeout = (ms = 120000) => {
      clearRunTimeout()
      timeoutId = window.setTimeout(() => {
        if (hasResult) {
          complete("success", `${label} tamamlandi.`)
          return
        }
        complete("error", `${label} icin sonuc yaniti alinmadi (zaman asimi).`)
      }, ms)
    }

    let socket = null
    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      complete("error", `${label} icin websocket baglantisi baslatilamadi.`)
      return
    }

    priceCommandSocketByOfferRef.current[normalized.offerId] = socket
    resetRunTimeout(15000)

    socket.addEventListener("message", (event) => {
      if (settled) return
      const rawPayload = typeof event.data === "string" ? event.data : ""
      if (!rawPayload) return
      const packets = splitEnginePackets(rawPayload)

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
            complete("error", `${label} icin Socket.IO baglantisi baslatilamadi.`)
          }
          continue
        }

        if (packet.startsWith("40")) {
          if (!hasConnected) {
            appendPriceCommandLog(normalized.offerId, "running", "Baglandi.")
          }
          hasConnected = true
          setPriceCommandConnectionStateByOffer((prev) => ({
            ...prev,
            [normalized.offerId]: "connected",
          }))
          resetRunTimeout(300000)
          continue
        }

        if (packet.startsWith("41")) {
          if (hasResult) {
            complete("success", `${label} tamamlandi.`)
          } else {
            complete("error", `${label} tamamlanmadan baglanti kapandi.`)
          }
          return
        }

        if (packet.startsWith("44")) {
          complete("error", `${label} tetiklenemedi. backend=${backendLabel}`)
          return
        }

        const eventPacket = parseSocketIoEventPacket(packet)
        if (!eventPacket) continue

        const eventName = String(eventPacket.event ?? "").trim().toLowerCase()
        const firstArg = eventPacket.args[0]

        if (eventName === "script-triggered" || eventName === "script-started") {
          appendPriceCommandLog(normalized.offerId, "running", `${backendLabel} script baslatildi.`)
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "durum") {
          const lines = normalizeEventMessage(firstArg?.message ?? firstArg)
            .replace(/\r/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)

          if (lines.length === 0) {
            appendPriceCommandLog(normalized.offerId, "running", `${backendLabel} => -`)
          } else {
            lines.forEach((line) => {
              appendPriceCommandLog(normalized.offerId, "running", `${backendLabel} => ${line}`)
            })
          }
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "script-log") {
          const stream = String(firstArg?.stream ?? "").trim().toLowerCase()
          const lines = String(firstArg?.message ?? "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
          lines.forEach((line) => {
            appendPriceCommandLog(
              normalized.offerId,
              stream === "stderr" ? "error" : "running",
              line,
            )
          })
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "kullanici-girdisi-gerekli") {
          appendPriceCommandLog(
            normalized.offerId,
            "error",
            `${backendLabel} => Kullanici girdisi istendi. Bu panel bu akisi desteklemiyor.`,
          )
          complete("error", `${label} kullanici girdisi bekliyor.`)
          return
        }

        if (eventName === "sonuc") {
          const valueText = normalizeEventMessage(firstArg?.value ?? firstArg).trim()
          appendPriceCommandLog(normalized.offerId, "success", `${backendLabel} => ${valueText || "-"}`)
          hasResult = true
          complete("success", `${label} tamamlandi.`)
          return
        }

        if (eventName === "script-exit") {
          const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
          if (Number.isFinite(exitCode)) {
            appendPriceCommandLog(
              normalized.offerId,
              exitCode === 0 ? "success" : "error",
              `Script cikti. Kod: ${exitCode}`,
            )
          }
          if (!hasResult) {
            complete("error", `${label} cikti ancak sonuc alinmadi.`)
            return
          }
          resetRunTimeout(5000)
          continue
        }

        resetRunTimeout(300000)
      }
    })

    socket.addEventListener("error", () => {
      setPriceCommandConnectionStateByOffer((prev) => ({
        ...prev,
        [normalized.offerId]: "error",
      }))
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
      Object.values(priceCommandSocketByOfferRef.current).forEach((socket) => {
        try {
          socket?.close()
        } catch {
          // Ignore close errors.
        }
      })
      priceCommandSocketByOfferRef.current = {}
    }
  }, [])

  return {
    priceCommandRunLogByOffer,
    priceCommandIsRunningByOffer,
    priceCommandConnectionStateByOffer,
    appendPriceCommandLog,
    clearPriceCommandLogs,
    handlePriceCommandRun,
  }
}
