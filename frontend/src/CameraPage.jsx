import { useState, useEffect, useRef } from "react"

const PI_IP = "10.132.78.80"
const AI_SERVER = "localhost:8001"
const THERMAL_FEED_URL = `http://${PI_IP}:8080/thermal/stream`
const RESOLUTIONS = ["320x240", "640x480", "1280x720", "1920x1080"]

export default function CameraPage({ telemetry }) {
  const [time, setTime]           = useState(new Date())
  const [streamOk, setStreamOk]   = useState(true)
  const [streaming, setStreaming]  = useState(true)
  const [resolution, setResolution] = useState("640x480")
  const [loading, setLoading]     = useState(false)
  const [streamKey, setStreamKey]  = useState(0)

  // AI Detection state
  const [aiActive, setAiActive]         = useState(false)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiFrame, setAiFrame]           = useState(null)   // base64 annotated frame
  const [aiStatus, setAiStatus]         = useState(null)   // { action, mode, person_detected, animal_detected, detections }
  const [survivorAlert, setSurvivorAlert] = useState(false)

  // Thermal imaging state
  const [thermalActive, setThermalActive] = useState(false)
  const [thermalLoading, setThermalLoading] = useState(false)
  const [thermalStatus, setThermalStatus] = useState(null)
  const [thermalError, setThermalError] = useState(null)
  const [thermalKey, setThermalKey] = useState(0)

  const wsRef        = useRef(null)
  const localCapRef  = useRef(null)  // MediaStream from laptop webcam
  const intervalRef  = useRef(null)  // frame-sending interval
  const canvasRef    = useRef(null)  // hidden canvas for frame capture

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch Pi camera status on mount
  useEffect(() => {
    fetch(`http://${PI_IP}:8080/camera/status`)
      .then(r => r.json())
      .then(d => { setStreaming(d.streaming); setResolution(d.resolution) })
      .catch(() => setStreamOk(false))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAiDetection()
  }, [])

  // Flash survivor alert
  useEffect(() => {
    if (aiStatus?.person_detected) {
      setSurvivorAlert(true)
      const t = setTimeout(() => setSurvivorAlert(false), 800)
      return () => clearTimeout(t)
    }
  }, [aiStatus?.person_detected])

  // ── Stream controls ──────────────────────────────────────────────

  async function handleStart() {
    setLoading(true)
    try {
      await fetch(`http://${PI_IP}:8080/camera/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution })
      })
      await new Promise(r => setTimeout(r, 1000))
      setStreaming(true); setStreamOk(true)
      setStreamKey(k => k + 1)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleStop() {
    setLoading(true)
    try {
      await fetch(`http://${PI_IP}:8080/camera/stop`, { method: "POST" })
      setStreaming(false); setStreamOk(true)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleResolutionChange(res) {
    if (aiActive) stopAiDetection()  // Stop AI before changing resolution
    
    setLoading(true); setResolution(res)
    try {
      // Stop camera first
      await fetch(`http://${PI_IP}:8080/camera/stop`, { method: "POST" })
      await new Promise(r => setTimeout(r, 1000))  // Wait for full stop
      
      // Then change resolution
      await fetch(`http://${PI_IP}:8080/camera/resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: res })
      })
      
      // Wait for full restart
      await new Promise(r => setTimeout(r, 1500))
      
      // Force reload both streams
      setStreamKey(k => k + 1)
      setStreamOk(true)
      setStreaming(true)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleThermalToggle() {
    if (thermalLoading) return
    setThermalError(null)
    setThermalLoading(true)

    if (thermalActive) {
      try {
        await fetch(`http://${PI_IP}:8080/thermal/stop`, { method: "POST" })
      } catch (e) {
        console.error(e)
      } finally {
        setThermalActive(false)
        setThermalStatus(null)
      }
      setThermalLoading(false)
      return
    }

    try {
      const res = await fetch(`http://${PI_IP}:8080/thermal/start`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to start thermal mode")
      setThermalActive(true)
      setThermalStatus(data.status)
      setThermalKey(k => k + 1)
    } catch (e) {
      console.error(e)
      setThermalError(e.message)
      setThermalActive(false)
      setThermalStatus(null)
    }

    setThermalLoading(false)
  }

  // ── AI Detection ─────────────────────────────────────────────────

  async function startAiDetection() {
    setAiLoading(true)
    try {
      // 1. Tell detection server to load the model
      const res = await fetch(`http://${AI_SERVER}/detection/start`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to start detection server")

      // 2. Open WebSocket to detection server
      const ws = new WebSocket(`ws://${AI_SERVER}/ws/detection`)
      wsRef.current = ws

      ws.onopen = () => {
        setAiActive(true)
        setAiLoading(false)

        // 3. Every 200ms: grab frame from Pi stream → send to WS
        intervalRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return

          const canvas = canvasRef.current
          const img = document.getElementById("pi-stream")
          if (!canvas || !img) return

          const ctx = canvas.getContext("2d")
          canvas.width  = img.naturalWidth  || 640
          canvas.height = img.naturalHeight || 480
          ctx.drawImage(img, 0, 0)

          canvas.toBlob(blob => {
            if (!blob) return
            blob.arrayBuffer().then(buf => {
              if (ws.readyState === WebSocket.OPEN) {
                try {
                  ws.send(buf)
                } catch (err) {
                  console.error("WS send error:", err)
                }
              }
            })
          }, "image/jpeg", 0.8)
        }, 200)  // Slightly slower for Pi stream
      }

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          if (data.frame)  setAiFrame(data.frame)
          setAiStatus({
            action:          data.action,
            mode:            data.mode,
            person_detected: data.person_detected,
            animal_detected: data.animal_detected,
            detections:      data.detections ?? [],
          })
          // Trigger survivor alert if person detected
          if (data.person_detected && !survivorAlert) {
            setSurvivorAlert(true)
            // Auto-reset after 5 seconds
            setTimeout(() => setSurvivorAlert(false), 5000)
          }
        } catch (e) { console.error("WS parse error", e) }
      }

      ws.onerror = (e) => { console.error("WS error", e); stopAiDetection() }
      ws.onclose = ()  => { stopAiDetection() }

    } catch (e) {
      console.error("AI Detection start error:", e)
      setAiLoading(false)
      stopAiDetection()
    }
  }

  function stopAiDetection() {
    // Clear frame sender
    if (intervalRef.current)  { clearInterval(intervalRef.current);  intervalRef.current = null }
    // Close WebSocket
    if (wsRef.current)        { wsRef.current.close();               wsRef.current = null }
    // No webcam to stop since we use Pi stream
    setAiActive(false)
    setAiLoading(false)
    setAiFrame(null)
    setAiStatus(null)
    setSurvivorAlert(false)
  }

  function handleAiToggle() {
    if (aiActive || aiLoading) stopAiDetection()
    else startAiDetection()
  }

  // ── Render ────────────────────────────────────────────────────────

  const showThermalStream = thermalActive
  const showPiStream  = streamOk && streaming && !aiActive && !thermalActive
  const showAiStream  = aiActive && !thermalActive
  const showError     = !aiActive && !thermalActive && (!streamOk || !streaming)

  return (
    <div className="camera-page">

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Hidden Pi stream for AI capture - stays loaded but invisible */}
      <img
        id="pi-stream"
        crossOrigin="anonymous"
        src={`http://${PI_IP}:8080/stream`}
        alt="Pi Cam Feed Hidden"
        style={{
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <div className="camera-main">

        {/* ── Feed area ── */}
        <div className="camera-feed-wrapper" style={{
          outline: survivorAlert ? "2px solid rgba(248,113,113,0.8)" : "none",
          transition: "outline 0.1s",
        }}>

          <div className="camera-toolbar">
            <button
              className={`camera-action-btn ${!thermalActive && !aiActive ? "active" : ""}`}
              disabled={loading || aiActive || thermalLoading || thermalActive}
              onClick={() => { if (!streaming && !loading) handleStart(); }}
            >
              LIVE VIEW
            </button>
            <button
              className={`camera-action-btn ${thermalActive ? "active" : ""}`}
              disabled={thermalLoading || aiLoading}
              onClick={handleThermalToggle}
            >
              {thermalActive ? "EXIT THERMAL" : "ENTER THERMAL"}
            </button>
            <button
              className={`camera-action-btn ${aiActive ? "active" : ""}`}
              disabled={aiLoading || thermalActive}
              onClick={handleAiToggle}
            >
              {aiActive ? "STOP AI" : "START AI"}
            </button>
          </div>

          {/* Pi MJPEG stream */}
          {showPiStream && (
            <img
              key={streamKey}
              className="camera-feed"
              crossOrigin="anonymous"
              src={`http://${PI_IP}:8080/stream`}
              alt="Pi Cam Feed"
              onError={() => { if (streaming) setStreamOk(false) }}
            />
          )}

          {/* AI annotated feed */}
          {showAiStream && (
            aiFrame ? (
              <img
                className="camera-feed"
                src={`data:image/jpeg;base64,${aiFrame}`}
                alt="AI Detection Feed"
              />
            ) : (
              <img
                key={streamKey}
                className="camera-feed"
                crossOrigin="anonymous"
                src={`http://${PI_IP}:8080/stream`}
                alt="Pi Cam Feed"
                onError={() => { if (streaming) setStreamOk(false) }}
              />
            )
          )}

          {showThermalStream && (
            <video
              key={thermalKey}
              className="camera-feed"
              src={`${THERMAL_FEED_URL}?t=${Date.now()}`}
              autoPlay
              muted
              onError={() => setThermalError("Unable to load thermal stream")}
            />
          )}

          {/* AI loading spinner */}
          {aiLoading && !aiActive && (
            <div style={{ textAlign: "center", fontFamily: "JetBrains Mono", fontSize: 12, color: "var(--accent)" }}>
              <div style={{ fontSize: 24, marginBottom: 12, animation: "spin 1s linear infinite" }}>◌</div>
              <div>LOADING YOLO MODEL...</div>
              <div style={{ fontSize: 9, marginTop: 8, color: "var(--text-faint)" }}>yolov8n.pt initializing</div>
            </div>
          )}

          {/* Error / stopped state */}
          {showError && !aiLoading && (
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⬡</div>
              <div>{streaming ? "STREAM ERROR" : "CAMERA STOPPED"}</div>
              <div style={{ fontSize: 9, marginTop: 8, color: "var(--text-faint)" }}>
                {streaming ? "Check camera on Pi" : "Press START to begin streaming"}
              </div>
            </div>
          )}

          {/* HUD overlay — show on Pi stream OR AI stream */}
          {(showPiStream || showAiStream) && (
            <>
              <div className="scanline" />
              <div className="camera-hud" />

              <div className="camera-overlay-tl">
                <span className="hud-label">SKYRANGER CAM</span>
                <span className="hud-text">ALT {telemetry?.alt ?? "—"} m</span>
                <span className="hud-text">SPD {telemetry?.vx ?? "—"} m/s</span>
                <span className="hud-text">BAT {telemetry?.battery_remaining ?? "—"}%</span>
              </div>

              <div className="camera-overlay-tr">
                <span className="hud-text">{time.toLocaleTimeString()}</span>
                <span className="hud-text">{telemetry?.flight_mode ?? "—"}</span>
                <span className="hud-text">{resolution}</span>
              </div>

              <div className="camera-overlay-bl">
                <div className="camera-rec">
                  <div className="camera-rec-dot" />
                  {thermalActive ? "THERMAL" : aiActive ? "AI LIVE" : "LIVE"}
                </div>
              </div>

              <div className="camera-feed-footer">
                <span>{thermalActive ? "Sensor: MLX90640" : "Sensor: IMX708"}</span>
                <span>{thermalActive ? `Refresh: ${thermalStatus?.refresh_rate ?? "4Hz"}` : resolution}</span>
                <span>{time.toLocaleTimeString()}</span>
              </div>

              {/* AI status overlay — bottom right */}
              {aiActive && aiStatus && (
                <div style={{
                  position: "absolute", bottom: 16, right: 16,
                  fontFamily: "JetBrains Mono", fontSize: 10,
                  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
                }}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 4,
                    background: aiStatus.person_detected ? "rgba(248,113,113,0.2)" : "rgba(125,211,252,0.1)",
                    border: `1px solid ${aiStatus.person_detected ? "rgba(248,113,113,0.5)" : "rgba(125,211,252,0.2)"}`,
                    color: aiStatus.person_detected ? "var(--red)" : "var(--accent)",
                    letterSpacing: "0.1em",
                  }}>
                    {aiStatus.person_detected ? "⚠ SURVIVOR DETECTED" : aiStatus.animal_detected ? "◈ ANIMAL" : "◎ SEARCHING"}
                  </span>
                  <span style={{ color: "var(--text-faint)", fontSize: 9 }}>
                    ACTION: {aiStatus.action?.toUpperCase()} &nbsp;|&nbsp; MODE: {aiStatus.mode}
                  </span>
                  <span style={{ color: "var(--text-faint)", fontSize: 9 }}>
                    DETECTIONS: {aiStatus.detections?.length ?? 0}
                  </span>
                </div>
              )}

              {thermalActive && thermalError && (
                <div className="camera-error-card" style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                  <div className="camera-error-title">Thermal mode error</div>
                  <div>{thermalError}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="camera-sidebar">
          <div className="camera-sidebar-title">Stream Control</div>

          {/* Start / Stop Pi stream */}
          <button
            onClick={streaming ? handleStop : handleStart}
            disabled={loading || aiActive || thermalActive}
            className="camera-primary-btn"
          >
            {loading ? "..." : streaming ? "⏹ STOP STREAM" : "▶ START STREAM"}
          </button>

          {/* ── AI DETECTION BUTTON ── */}
          <div style={{ marginTop: 8 }}>
            <div className="camera-sidebar-title">AI Detection</div>
            <button
              onClick={handleAiToggle}
              disabled={aiLoading || thermalActive}
              className={`camera-secondary-btn ${aiActive ? "active" : ""}`}
            >
              {aiLoading ? "⏳ LOADING MODEL..." : aiActive ? "⏹ STOP DETECTION" : "🤖 START AI DETECTION"}
            </button>

            {/* AI status indicators */}
            {aiActive && aiStatus && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="camera-stat">
                  <span className="camera-stat-label">Mode</span>
                  <span className="camera-stat-value" style={{ color: "var(--accent)" }}>
                    {aiStatus.mode}
                  </span>
                </div>
                <div className="camera-stat">
                  <span className="camera-stat-label">Action</span>
                  <span className="camera-stat-value" style={{ color: "#4ade80" }}>
                    {aiStatus.action?.toUpperCase()}
                  </span>
                </div>
                <div className="camera-stat">
                  <span className="camera-stat-label">Survivors</span>
                  <span className="camera-stat-value" style={{
                    color: aiStatus.person_detected ? "var(--red)" : "var(--text-faint)"
                  }}>
                    {aiStatus.person_detected ? "⚠ YES" : "NONE"}
                  </span>
                </div>
                <div className="camera-stat">
                  <span className="camera-stat-label">Objects</span>
                  <span className="camera-stat-value">{aiStatus.detections?.length ?? 0}</span>
                </div>
              </div>
            )}

            {/* Model info */}
            <div style={{
              marginTop: 6, padding: "6px 8px",
              background: "var(--bg-card)", borderRadius: 6,
              border: "1px solid var(--border)",
            }}>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                MODEL: YOLOv8n
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: "var(--text-faint)", letterSpacing: "0.1em", marginTop: 2 }}>
                SOURCE: LAPTOP CAM
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: "var(--text-faint)", letterSpacing: "0.1em", marginTop: 2 }}>
                SERVER: :{AI_SERVER.split(":")[1]}
              </div>
            </div>
          </div>

          {/* Thermal imaging */}
          <div style={{ marginTop: 8 }}>
            <div className="camera-sidebar-title">Thermal Imaging</div>
            <button
              onClick={handleThermalToggle}
              disabled={thermalLoading || aiActive}
              className={`camera-secondary-btn ${thermalActive ? "active" : ""}`}
            >
              {thermalLoading ? "⏳ LOADING..." : thermalActive ? "⏹ STOP THERMAL" : "🔥 START THERMAL"}
            </button>
            {thermalStatus && (
              <div className="camera-stat" style={{ marginTop: 8 }}>
                <span className="camera-stat-label">Refresh</span>
                <span className="camera-stat-value">{thermalStatus.refresh_rate ?? "4Hz"}</span>
              </div>
            )}
            {thermalError && (
              <div className="camera-stat" style={{ marginTop: 8, borderColor: "rgba(248,113,113,0.25)" }}>
                <span className="camera-stat-label">Error</span>
                <span className="camera-stat-value" style={{ color: "var(--red)" }}>{thermalError}</span>
              </div>
            )}
          </div>

          {/* Resolution selector */}
          <div style={{ marginTop: 8 }}>
            <div className="camera-sidebar-title">Resolution</div>
            <div className="camera-resolutions">
              {RESOLUTIONS.map(res => (
                <button
                  key={res}
                  onClick={() => handleResolutionChange(res)}
                  disabled={loading || !streaming || aiActive || thermalActive}
                  className={`camera-res-btn ${resolution === res ? "active" : ""}`}
                >
                  {res}
                  {resolution === res && <span className="res-label">ACTIVE</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Camera info */}
          <div style={{ marginTop: 8 }}>
            <div className="camera-sidebar-title">Camera Info</div>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Sensor</span>
            <span className="camera-stat-value">{thermalActive ? "MLX90640" : "IMX708"}</span>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Status</span>
            <span className="camera-stat-value" style={{ color: streaming ? "#4ade80" : "var(--red)" }}>
              {aiActive ? "AI MODE" : streaming ? "STREAMING" : "STOPPED"}
            </span>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Port</span>
            <span className="camera-stat-value">{aiActive ? "8001" : "8080"}</span>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Drone State</span>
            <span className="camera-stat-value" style={{ color: "var(--accent)" }}>
              {telemetry?.flight_mode ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}