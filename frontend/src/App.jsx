import { useState, useEffect } from "react"
import { ArrowUpRight, Wind, BatteryCharging, Zap, Satellite, MapPin } from "lucide-react"
import MapPanel from "./MapPanel"
import SensorPage from "./SensorPage"
import CameraPage from "./CameraPage"
import SystemPage from "./SystemPage"
import MissionPage from "./MissionPage"

const emptyTelemetry = {
  armed: false, flight_mode: "STABILIZE",
  alt: 15.2, vx: 2.1,
  battery_remaining: 87, battery_voltage: 12.4,
  satellites: 8, gps_fix: 3,
  roll: 0.1, pitch: -0.3, yaw: 45.2,
  lat: 24.647600, lon: 77.319300, // Fake drone position
}

function MetricCard({ label, value, unit, warn = false, icon: Icon }) {
  return (
    <div className={`metric-card ${warn ? "warn" : ""}`}>
      <div className="metric-card-head">
        {Icon && <Icon size={16} className="metric-card-icon" />}
        <div className="metric-label">{label}</div>
      </div>
      <div className="metric-value">
        {value ?? "—"}
        {value != null && unit && <span className="metric-unit">{unit}</span>}
      </div>
    </div>
  )
}

function TelemetryPanel({ data, connected }) {
  const batteryLow = data.battery_remaining !== null && data.battery_remaining < 30
  return (
    <div className="telemetry-panel">
      <div className="telemetry-header">
        <div>
          <div className="section-label">Live telemetry</div>
          <div className="dashboard-title">Flight status overview</div>
        </div>
        <div className={`status-pill ${connected ? "online" : "offline"}`}>
          <span className="status-dot" />
          {connected ? "Live stream active" : "Offline"}
        </div>
      </div>

      {/* Arm + Mode */}
      <div className="arm-bar">
        <div className="arm-indicator">
          <div className={`arm-dot ${data.armed ? "armed" : "disarmed"}`} />
          <span>{data.armed === null ? "—" : data.armed ? "ARMED" : "DISARMED"}</span>
        </div>
        <span className="flight-mode">{data.flight_mode ?? "—"}</span>
      </div>

      {/* Metrics */}
      <div className="metric-grid">
        <MetricCard label="Alt" value={data.alt} unit="m" icon={ArrowUpRight} />
        <MetricCard label="Speed" value={data.vx} unit="m/s" icon={Wind} />
        <MetricCard label="Battery" value={data.battery_remaining} unit="%" warn={batteryLow} icon={BatteryCharging} />
        <MetricCard label="Voltage" value={data.battery_voltage} unit="V" warn={batteryLow} icon={Zap} />
        <MetricCard label="Sats" value={data.satellites} icon={Satellite} />
        <MetricCard label="GPS Fix" value={data.gps_fix} icon={MapPin} />
      </div>

      {/* Attitude */}
      <div className="panel-card">
        <div className="section-label">Attitude</div>
        {[["Roll", data.roll], ["Pitch", data.pitch], ["Yaw", data.yaw]].map(([label, val]) => (
          <div key={label} className="data-row">
            <span className="data-row-key">{label}</span>
            <span className="data-row-val">{val != null ? `${val} rad` : "—"}</span>
          </div>
        ))}
      </div>

      {/* Position */}
      <div className="panel-card">
        <div className="section-label">Position</div>
        <div className="data-row">
          <span className="data-row-key">Lat</span>
          <span className="data-row-val">{data.lat?.toFixed(5) ?? "—"}</span>
        </div>
        <div className="data-row">
          <span className="data-row-key">Lon</span>
          <span className="data-row-val">{data.lon?.toFixed(5) ?? "—"}</span>
        </div>
      </div>

    </div>
  )
}

function FlightLog({ logs }) {
  return (
    <div className="flight-log">
      <span className="log-tag">LOG</span>
      <div className="log-entries">
        {logs.slice(-6).map((log, i) => (
          <span key={i} className="log-entry">
            <span className="log-time">{log.time}</span>
            <span className="log-msg">{log.msg}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [telemetry, setTelemetry] = useState(emptyTelemetry)
  const [connected, setConnected] = useState(false)
  const [flightPath, setFlightPath] = useState([
    [24.647287, 77.319182],
    [24.647350, 77.319250],
    [24.647450, 77.319300],
    [24.647550, 77.319350],
    [24.647600, 77.319300],
  ])
  const [page, setPage] = useState("DASHBOARD")
  const [logs, setLogs] = useState([
    { time: "00:00:00", msg: "System initialized" },
  ])
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0)
  const [simulationActive, setSimulationActive] = useState(true)
  const [missionStatus, setMissionStatus] = useState("TAKEOFF")

  // Fake waypoints for demo
  const fakeWaypoints = [
    { id: 1, lat: 24.647287, lon: 77.319182, name: "Home Base", alt: 0 },
    { id: 2, lat: 24.647500, lon: 77.319400, name: "Waypoint 1", alt: 25 },
    { id: 3, lat: 24.647800, lon: 77.319600, name: "Waypoint 2", alt: 45 },
    { id: 4, lat: 24.648000, lon: 77.319300, name: "Waypoint 3", alt: 35 },
    { id: 5, lat: 24.647600, lon: 77.318900, name: "Waypoint 4", alt: 20 },
  ]

  // Fake drone position for demo (if no real telemetry)
  const fakeDronePos = { lat: 24.647600, lon: 77.319300 }

  // Simulation effect for demo
  useEffect(() => {
    if (!simulationActive) return

    const interval = setInterval(() => {
      setCurrentWaypointIndex(prev => {
        const nextIndex = (prev + 1) % fakeWaypoints.length
        const currentWp = fakeWaypoints[prev]
        const nextWp = fakeWaypoints[nextIndex]

        // Simulate movement towards next waypoint
        const progress = Math.random() * 0.1 + 0.05 // Random progress between waypoints
        const newLat = currentWp.lat + (nextWp.lat - currentWp.lat) * progress
        const newLon = currentWp.lon + (nextWp.lon - currentWp.lon) * progress
        const newAlt = currentWp.alt + (nextWp.alt - currentWp.alt) * progress

        // Update telemetry with simulated data
        setTelemetry(prev => ({
          ...prev,
          lat: newLat,
          lon: newLon,
          alt: newAlt + (Math.sin(Date.now() * 0.001) * 2), // Add some altitude variation
          vx: 3 + Math.random() * 2, // Speed variation
          battery_remaining: Math.max(10, prev.battery_remaining - 0.1), // Battery drain
          battery_voltage: 12.4 - ((100 - prev.battery_remaining) * 0.02), // Voltage drop with battery
          satellites: Math.max(6, 8 + Math.floor(Math.random() * 3)),
          roll: (Math.random() - 0.5) * 10,
          pitch: (Math.random() - 0.5) * 8,
          yaw: prev.yaw + (Math.random() - 0.5) * 5,
          flight_mode: nextIndex === 0 ? "RTL" : nextIndex === 1 ? "AUTO" : "GUIDED",
          armed: true,
          gps_fix: 3,
        }))

        // Update mission status
        setMissionStatus(prev => {
          if (nextIndex === 0) return "RTL"
          if (nextIndex === 1) return "WAYPOINT NAV"
          if (nextIndex === 2) return "ALTITUDE HOLD"
          if (nextIndex === 3) return "POSITION HOLD"
          return "MISSION EXEC"
        })

        // Add to flight path
        setFlightPath(prev => {
          const newPath = [...prev, [newLat, newLon]]
          return newPath.length > 100 ? newPath.slice(-100) : newPath
        })

        // Add log entry when reaching waypoint
        if (Math.random() < 0.1) { // 10% chance per update
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            msg: `Reached ${nextWp.name}`
          }])
        }

        return nextIndex
      })
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [simulationActive, fakeWaypoints])

  useEffect(() => {
    const ws = new WebSocket("ws://10.132.78.80:8000/ws/telemetry")
    ws.onopen = () => {
      setConnected(true)
      setLogs(p => [...p, { time: new Date().toLocaleTimeString(), msg: "MAVLink stream active" }])
    }
    ws.onmessage = (e) => setTelemetry(JSON.parse(e.data))
    ws.onclose = () => setConnected(false)
    ws.onerror = (e) => console.error("[WS]", e)
    return () => ws.close()
  }, [])

  useEffect(() => {
    if (telemetry.lat && telemetry.lon) {
      setFlightPath(prev => {
        const next = [...prev, [telemetry.lat, telemetry.lon]]
        return next.length > 500 ? next.slice(-500) : next
      })
    }
  }, [telemetry.lat, telemetry.lon])

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Navbar */}
      <nav className="navbar">
        <div className="brand">
          <span className="brand-name">SKYRANGER</span>
          <span className="brand-badge">GCS v2.0</span>
        </div>

        <div className="nav-links">
          {["DASHBOARD", "SENSORS", "CAMERA", "SYSTEM", "MISSION", "ABOUT"].map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`nav-btn ${page === p ? "active" : ""}`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className={`conn-status ${connected ? "text-green-400" : "text-red-400"}`}>
          <div className={`conn-dot ${connected ? "connected" : "disconnected"}`} />
          {connected ? "CONNECTED" : "DISCONNECTED"}
          <span style={{
            marginLeft: 16,
            padding: "4px 8px",
            background: "#3b82f6",
            color: "white",
            borderRadius: 4,
            fontSize: 10,
            fontFamily: "JetBrains Mono",
            fontWeight: 600
          }}>
            {missionStatus}
          </span>
          <button
            onClick={() => setSimulationActive(!simulationActive)}
            style={{
              marginLeft: 8,
              padding: "4px 12px",
              background: simulationActive ? "#10b981" : "#6b7280",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "JetBrains Mono"
            }}
          >
            {simulationActive ? "⏸️ PAUSE SIM" : "▶️ START SIM"}
          </button>
        </div>
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {page === "DASHBOARD" && (
          <div className="main-layout">
            <TelemetryPanel data={telemetry} connected={connected} />
            <div className="map-wrapper">
              <MapPanel
                lat={telemetry.lat || fakeDronePos.lat}
                lon={telemetry.lon || fakeDronePos.lon}
                flightPath={flightPath}
                waypoints={fakeWaypoints}
                currentWaypointIndex={currentWaypointIndex}
              />
            </div>
          </div>
        )}
        {page === "SENSORS" && <SensorPage />}
        {page === "CAMERA" && <CameraPage telemetry={telemetry} />}
        {page === "SYSTEM" && <SystemPage />}
        {page === "MISSION" && <MissionPage />}
      </div>

      <FlightLog logs={logs} />

      {/* Simulation Info Panel */}
      <div style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        background: "rgba(30,40,60,0.95)",
        border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: 12,
        padding: 16,
        fontSize: 11,
        fontFamily: "JetBrains Mono",
        color: "var(--text-secondary)",
        zIndex: 1000,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ fontWeight: 600, color: "#3b82f6", marginBottom: 8 }}>SIMULATION STATUS</div>
        <div>Waypoint: {currentWaypointIndex + 1}/{fakeWaypoints.length}</div>
        <div>Mode: {missionStatus}</div>
        <div>Signal: {85 + Math.floor(Math.random() * 15)}%</div>
        <div>CPU: {45 + Math.floor(Math.random() * 20)}°C</div>
        <div style={{ marginTop: 8, fontSize: 9, color: "var(--text-faint)" }}>
          Demo Mode Active
        </div>
      </div>
    </div>
  )
}