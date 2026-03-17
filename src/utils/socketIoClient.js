export const splitEnginePackets = (payload) => {
  if (!payload) return []
  return payload.includes("\u001e") ? payload.split("\u001e").filter(Boolean) : [payload]
}

export const parseSocketIoEventPacket = (packet) => {
  if (!packet.startsWith("42")) return null
  let dataPart = packet.slice(2)
  if (dataPart.startsWith("/")) {
    const namespaceSeparator = dataPart.indexOf(",")
    if (namespaceSeparator < 0) return null
    dataPart = dataPart.slice(namespaceSeparator + 1)
  }
  if (!dataPart) return null
  try {
    const parsed = JSON.parse(dataPart)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return {
      event: String(parsed[0] ?? "").trim() || "message",
      args: parsed.slice(1),
    }
  } catch {
    return null
  }
}

export const buildSocketIoWsUrl = (normalizedUrl, extraQuery = {}) => {
  try {
    const socketIoUrl = new URL(normalizedUrl)
    if (!/\/socket\.io\/?$/i.test(socketIoUrl.pathname)) {
      socketIoUrl.pathname = "/socket.io/"
    } else if (!socketIoUrl.pathname.endsWith("/")) {
      socketIoUrl.pathname = `${socketIoUrl.pathname}/`
    }
    Object.entries(extraQuery).forEach(([key, value]) => {
      const normalizedValue = String(value ?? "").trim()
      if (normalizedValue) {
        socketIoUrl.searchParams.set(key, normalizedValue)
      } else {
        socketIoUrl.searchParams.delete(key)
      }
    })
    socketIoUrl.searchParams.set("EIO", "4")
    socketIoUrl.searchParams.set("transport", "websocket")
    return socketIoUrl.toString()
  } catch {
    return ""
  }
}

export const testSocketIoConnection = (socketIoUrl) =>
  new Promise((resolve) => {
    let settled = false
    let socket = null
    let timeoutId = null
    let handshakeTimeoutId = null

    const finish = (ok, reason) => {
      if (settled) return
      settled = true
      if (timeoutId) window.clearTimeout(timeoutId)
      if (handshakeTimeoutId) window.clearTimeout(handshakeTimeoutId)
      try {
        socket?.close()
      } catch {
        // Ignore close errors.
      }
      resolve({ ok, reason })
    }

    try {
      socket = new WebSocket(socketIoUrl)
    } catch {
      finish(false, "invalid_url")
      return
    }

    timeoutId = window.setTimeout(() => {
      finish(false, "timeout")
    }, 6000)

    socket.addEventListener("open", () => {
      handshakeTimeoutId = window.setTimeout(() => {
        finish(false, "socketio_handshake_timeout")
      }, 1800)
    })

    socket.addEventListener("message", (event) => {
      if (settled) return
      const payload = typeof event.data === "string" ? event.data : ""
      if (payload.startsWith("0{") || payload.includes("\"sid\"")) {
        finish(true, "socketio_open")
      }
    })

    socket.addEventListener("error", () => {
      finish(false, "error")
    })

    socket.addEventListener("close", () => {
      if (settled) return
      finish(false, "closed")
    })
  })
