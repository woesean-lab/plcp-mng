import { useCallback, useEffect, useRef, useState } from "react"
import { buildSocketIoWsUrl, testSocketIoConnection } from "../utils/socketIoClient"

export default function useSocketIoProbe(wsUrl = "", options = {}) {
  const auto = options?.auto !== false
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")
  const attemptRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const probe = useCallback(async () => {
    const normalizedWsUrl = String(wsUrl ?? "").trim()
    if (!normalizedWsUrl) {
      if (isMountedRef.current) {
        setStatus("idle")
        setMessage("Websocket adresi kayitli degil.")
      }
      return { ok: false, reason: "missing_url" }
    }

    const socketIoUrl = buildSocketIoWsUrl(normalizedWsUrl)
    if (!socketIoUrl) {
      if (isMountedRef.current) {
        setStatus("error")
        setMessage("Websocket adresi gecersiz.")
      }
      return { ok: false, reason: "invalid_url" }
    }

    const attemptId = attemptRef.current + 1
    attemptRef.current = attemptId

    if (isMountedRef.current) {
      setStatus("connecting")
      setMessage("Websocket baglantisi deneniyor...")
    }

    const result = await testSocketIoConnection(socketIoUrl)
    if (!isMountedRef.current || attemptRef.current !== attemptId) return result

    if (result?.ok) {
      setStatus("connected")
      setMessage("Websocket sunucusuna baglandi.")
      return result
    }

    setStatus("error")
    setMessage("Websocket baglantisi kurulamadi.")
    return result
  }, [wsUrl])

  useEffect(() => {
    if (!auto) return
    const timerId = window.setTimeout(() => {
      void probe()
    }, 0)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [auto, probe])

  return {
    status,
    message,
    probe,
  }
}
