import { useState, useEffect } from "react"

const PI_IP = "10.132.78.80"
const RESOLUTIONS = ["320x240", "640x480", "1280x720", "1920x1080"]

export default function CameraPage({ telemetry }) {
  const [time, setTime]         = useState(new Date())
  const [streamOk, setStreamOk] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [resolution, setResolution] = useState("640x480")
  const [loading, setLoading]   = useState(false)
  const [streamKey, setStreamKey] = useState(0) // forces img reload

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch current camera status on mount
  useEffect(() => {
    fetch(`http://${PI_IP}:8080/camera/status`)
      .then(r => r.json())
      .then(d => {
        setStreaming(d.streaming)
        setResolution(d.resolution)
      })
      .catch(() => setStreamOk(false))
  }, [])

  async function handleStart() {
    setLoading(true)
    try {
      await fetch(`http://${PI_IP}:8080/camera/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution })
      })
      await new Promise(r => setTimeout(r, 1000))
      setStreaming(true)
      setStreamOk(true)
      setStreamKey(k => k + 1) // reload img
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleStop() {
    setLoading(true)
    try {
      await fetch(`http://${PI_IP}:8080/camera/stop`, {
        method: "POST"
      })
      setStreaming(false)
      setStreamOk(true)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleResolutionChange(res) {
    setLoading(true)
    setResolution(res)
    try {
      await fetch(`http://${PI_IP}:8080/camera/resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: res })
      })
      setStreamKey(k => k + 1) // reload stream
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="camera-page">
      <div className="camera-main">

        {/* Feed */}
        <div className="camera-feed-wrapper">
          {streamOk && streaming ? (
            <img
              key={streamKey}
              className="camera-feed"
              src={`http://${PI_IP}:8080/stream`}
              alt="Pi Cam Feed"
             onError={() => {
  // Only show error if we expect stream to be running
             if (streaming) setStreamOk(false)
            }}
            />
          ) : (
            <div style={{
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              color: "var(--text-faint)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⬡</div>
              <div>{streaming ? "STREAM ERROR" : "CAMERA STOPPED"}</div>
              <div style={{ fontSize: 9, marginTop: 8, color: "var(--text-faint)" }}>
                {streaming ? "Check camera on Pi" : "Press START to begin streaming"}
              </div>
            </div>
          )}

          {/* HUD overlay */}
          {streamOk && streaming && (
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
                  LIVE
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="camera-sidebar">
          <div className="camera-sidebar-title">Stream Control</div>

          {/* Start / Stop */}
          <button
            onClick={streaming ? handleStop : handleStart}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              fontFamily: "JetBrains Mono",
              fontSize: 10,
              letterSpacing: "0.14em",
              borderRadius: 8,
              border: "1px solid",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              background: streaming
                ? "rgba(248,113,113,0.1)"
                : "rgba(74,222,128,0.1)",
              borderColor: streaming
                ? "rgba(248,113,113,0.3)"
                : "rgba(74,222,128,0.3)",
              color: streaming ? "var(--red)" : "#4ade80",
            }}
          >
            {loading ? "..." : streaming ? "⏹ STOP STREAM" : "▶ START STREAM"}
          </button>

          {/* Resolution selector */}
          <div style={{ marginTop: 8 }}>
            <div className="camera-sidebar-title">Resolution</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {RESOLUTIONS.map(res => (
                <button
                  key={res}
                  onClick={() => handleResolutionChange(res)}
                  disabled={loading || !streaming}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontFamily: "JetBrains Mono",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    borderRadius: 6,
                    border: "1px solid",
                    cursor: loading || !streaming ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                    background: resolution === res
                      ? "var(--accent-dim)"
                      : "var(--bg-card)",
                    borderColor: resolution === res
                      ? "rgba(125,211,252,0.3)"
                      : "var(--border)",
                    color: resolution === res
                      ? "var(--accent)"
                      : "var(--text-muted)",
                    opacity: !streaming ? 0.4 : 1,
                  }}
                >
                  {res}
                  {resolution === res && (
                    <span style={{ float: "right", fontSize: 8, color: "var(--accent)" }}>
                      ACTIVE
                    </span>
                  )}
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
            <span className="camera-stat-value">IMX708</span>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Status</span>
            <span className="camera-stat-value" style={{
              color: streaming ? "#4ade80" : "var(--red)"
            }}>
              {streaming ? "STREAMING" : "STOPPED"}
            </span>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Port</span>
            <span className="camera-stat-value">8080</span>
          </div>
          <div className="camera-stat">
            <span className="camera-stat-label">Drone State</span>
            <span className="camera-stat-value" style={{ color: "var(--accent)" }}>
              {telemetry?.flight_mode ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}