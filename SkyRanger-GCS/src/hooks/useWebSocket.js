// src/hooks/useWebSocket.js
// Drop-in replacement for raw new WebSocket() calls.
// Adds: auto-reconnect, exponential backoff, connection state, heartbeat.
//
// Usage:
//   const { lastMessage, connected } = useWebSocket(WS_TELEMETRY, {
//     onMessage: (data) => setTelemetry(data),
//   })

import { useEffect, useRef, useState, useCallback } from "react"

const DEFAULT_OPTIONS = {
    reconnectBaseMs: 1000,    // first retry after 1s
    reconnectMaxMs: 15000,   // cap at 15s
    reconnectFactor: 1.5,     // exponential backoff multiplier
    maxRetries: null,    // null = retry forever
    heartbeatMs: null,    // null = no heartbeat ping
    onMessage: null,    // (parsedData) => void
    onOpen: null,    // () => void
    onClose: null,    // () => void
    onError: null,    // (event) => void
    parseJson: true,    // auto JSON.parse incoming messages
}

export function useWebSocket(url, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const wsRef = useRef(null)
    const retryCount = useRef(0)
    const retryTimer = useRef(null)
    const heartbeat = useRef(null)
    const isMounted = useRef(true)

    const [connected, setConnected] = useState(false)
    const [lastMessage, setLastMessage] = useState(null)
    const [retries, setRetries] = useState(0)

    const clearTimers = () => {
        clearTimeout(retryTimer.current)
        clearInterval(heartbeat.current)
    }

    const connect = useCallback(() => {
        if (!isMounted.current) return
        if (!url) return

        try {
            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onopen = () => {
                if (!isMounted.current) return
                setConnected(true)
                retryCount.current = 0
                setRetries(0)
                opts.onOpen?.()

                // Heartbeat ping
                if (opts.heartbeatMs) {
                    heartbeat.current = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            try { ws.send(JSON.stringify({ type: "ping" })) }
                            catch (e) { /* ignore */ }
                        }
                    }, opts.heartbeatMs)
                }
            }

            ws.onmessage = (event) => {
                if (!isMounted.current) return
                let data = event.data
                if (opts.parseJson) {
                    try { data = JSON.parse(event.data) }
                    catch (e) { /* keep raw if not JSON */ }
                }
                setLastMessage(data)
                opts.onMessage?.(data)
            }

            ws.onerror = (event) => {
                opts.onError?.(event)
            }

            ws.onclose = () => {
                if (!isMounted.current) return
                clearInterval(heartbeat.current)
                setConnected(false)
                opts.onClose?.()

                // Exponential backoff reconnect
                if (opts.maxRetries !== null && retryCount.current >= opts.maxRetries) return

                const delay = Math.min(
                    opts.reconnectBaseMs * Math.pow(opts.reconnectFactor, retryCount.current),
                    opts.reconnectMaxMs
                )
                retryCount.current++
                setRetries(retryCount.current)

                retryTimer.current = setTimeout(connect, delay)
            }
        } catch (e) {
            console.error("[useWebSocket] Failed to connect:", url, e)
        }
    }, [url])

    useEffect(() => {
        isMounted.current = true
        connect()
        return () => {
            isMounted.current = false
            clearTimers()
            wsRef.current?.close()
        }
    }, [connect])

    // Expose send for bidirectional WS (e.g. AI detection)
    const send = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                typeof data === "string" || data instanceof ArrayBuffer || data instanceof Blob
                    ? data
                    : JSON.stringify(data)
            )
        }
    }, [])

    const disconnect = useCallback(() => {
        isMounted.current = false
        clearTimers()
        wsRef.current?.close()
        setConnected(false)
    }, [])

    return { connected, lastMessage, send, disconnect, retries }
}