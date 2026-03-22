import { useCallback, useEffect, useRef, useState } from "react"
import { buildSocketIoWsUrl, splitEnginePackets } from "../utils/socketIoClient"

export default function useSocketIoProbe(wsUrl = "", options = {}) {
  const auto = options?.auto !== false
  const reconnectDelayMs = Math.max(1500, Number(options?.reconnectDelayMs) || 3000)
  const handshakeTimeoutMs = Math.max(2000, Number(options?.handshakeTimeoutMs) || 4500)
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")
  const isMountedRef = useRef(true)
  const statusRef = useRef("idle")
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const handshakeTimeoutRef = useRef(null)
  const attemptRef = useRef(0)
  const connectRef = useRef(() => {})

  const updateStatus = useCallback((nextStatus, nextMessage) => {
    statusRef.current = nextStatus
    if (!isMountedRef.current) return
    setStatus(nextStatus)
    setMessage(nextMessage)
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const clearHandshakeTimer = useCallback(() => {
    if (handshakeTimeoutRef.current) {
      window.clearTimeout(handshakeTimeoutRef.current)
      handshakeTimeoutRef.current = null
    }
  }, [])

  const closeSocket = useCallback(() => {
    const socket = socketRef.current
    socketRef.current = null
    clearHandshakeTimer()
    if (!socket) return
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    try {
      socket.close()
    } catch {
      // Ignore close errors.
    }
  }, [clearHandshakeTimer])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearReconnectTimer()
      closeSocket()
    }
  }, [clearReconnectTimer, closeSocket])

  const connect = useCallback((options = {}) => {
    const background = Boolean(options?.background)
    const normalizedWsUrl = String(wsUrl ?? "").trim()
    clearReconnectTimer()
    closeSocket()

    if (!normalizedWsUrl) {
      updateStatus("idle", "Websocket adresi kayitli degil.")
      return
    }

    const socketIoUrl = buildSocketIoWsUrl(normalizedWsUrl)
    if (!socketIoUrl) {
      updateStatus("error", "Websocket adresi gecersiz.")
      return
    }

    const attemptId = attemptRef.current + 1
    attemptRef.current = attemptId
    let hasHandshake = false
    let disconnectHandled = false

    if (!background || statusRef.current === "idle") {
      updateStatus("connecting", "Websocket baglantisi deneniyor...")
    }

    const scheduleReconnect = () => {
      if (!auto || !isMountedRef.current || attemptRef.current !== attemptId) return
      clearReconnectTimer()
      reconnectTimerRef.current = window.setTimeout(() => {
        if (!isMountedRef.current || attemptRef.current !== attemptId) return
        connectRef.current({ background: true })
      }, reconnectDelayMs)
    }

    const handleDisconnect = (nextMessage) => {
      if (disconnectHandled || attemptRef.current !== attemptId) return
      disconnectHandled = true
      socketRef.current = null
      clearHandshakeTimer()
      updateStatus("error", nextMessage)
      scheduleReconnect()
    }

    let socket = null
    try {
      socket = new WebSocket(socketIoUrl)
    } catch {
      updateStatus("error", "Websocket baglantisi kurulamadi.")
      scheduleReconnect()
      return
    }

    socketRef.current = socket

    socket.onopen = () => {
      if (attemptRef.current !== attemptId) return
      clearHandshakeTimer()
      handshakeTimeoutRef.current = window.setTimeout(() => {
        handleDisconnect("Websocket baglantisi kurulamadi.")
      }, handshakeTimeoutMs)
    }

    socket.onmessage = (event) => {
      if (attemptRef.current !== attemptId) return
      const payload = typeof event.data === "string" ? event.data : ""
      splitEnginePackets(payload).forEach((packet) => {
        if (!packet) return
        if (packet === "2") {
          try {
            socket?.send("3")
          } catch {
            // Ignore pong send errors.
          }
          return
        }
        if (packet.startsWith("0{") || packet.includes("\"sid\"")) {
          hasHandshake = true
          disconnectHandled = false
          clearHandshakeTimer()
          updateStatus("connected", "Websocket sunucusuna baglandi.")
        }
      })
    }

    socket.onerror = () => {
      handleDisconnect(
        hasHandshake ? "Websocket baglantisi kesildi." : "Websocket baglantisi kurulamadi.",
      )
    }

    socket.onclose = () => {
      handleDisconnect(
        hasHandshake ? "Websocket baglantisi kesildi." : "Websocket baglantisi kurulamadi.",
      )
    }
  }, [
    auto,
    clearHandshakeTimer,
    clearReconnectTimer,
    closeSocket,
    handshakeTimeoutMs,
    reconnectDelayMs,
    updateStatus,
    wsUrl,
  ])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const probe = useCallback(() => {
    connectRef.current({ background: false })
  }, [])

  useEffect(() => {
    if (!auto) return
    const timerId = window.setTimeout(() => {
      connectRef.current({ background: false })
    }, 0)
    return () => {
      window.clearTimeout(timerId)
      clearReconnectTimer()
      closeSocket()
    }
  }, [auto, clearReconnectTimer, closeSocket, connect])

  return {
    status,
    message,
    probe,
  }
}
