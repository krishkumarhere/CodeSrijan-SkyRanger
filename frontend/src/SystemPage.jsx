import { useState, useEffect } from "react"

const PI_IP = "10.132.78.80"
const API_PORT = 8000
const WS_URL = `ws://${PI_IP}:${API_PORT}/ws/system`
const API_URL = `http://${PI_IP}:${API_PORT}`

// Circular gauge for CPU temp
function TempGauge({ value, max = 85 }) {
  const pct    = Math.min(100, ((value ?? 0) / max) * 100)
  const radius = 30
  const circ   = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  const color  = value > 70 ? "var(--red)" : value > 60 ? "var(--amber)" : "#4ade80"

  return (
    <div className="temp-gauge">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="temp-gauge-label">
        <span style={{ fontSize: 14, fontWeight: 600, color }}>
          {value ?? "—"}
        </span>
        <span style={{ fontSize: 8, color: "var(--text-faint)" }}>°C</span>
      </div>
    </div>
  )
}

// Animated progress bar
function ProgressBar({ value, color = "var(--accent)" }) {
  const warn = value > 80
  return (
    <div>
      <div className="sys-progress">
        <div className="sys-progress-fill" style={{
          width: `${value ?? 0}%`,
          background: warn ? "var(--red)" : color,
        }} />
      </div>
      <div className="sys-progress-label">
        <span>0%</span>
        <span style={{ color: warn ? "var(--red)" : "var(--text-faint)" }}>
          {value ?? "—"}%
        </span>
        <span>100%</span>
      </div>
    </div>
  )
}

// Hardware spec card
function HardwareCard({ title, icon, specs }) {
  return (
    <div className="hw-card">
      <div className="hw-card-title">
        <span>{icon}</span>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {specs.map(([key, val, cls]) => (
          <div key={key} className="hw-row">
            <span className="hw-key">{key}</span>
            <span className={`hw-val ${cls ?? ""}`}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pages
const NAV_ITEMS = [
  { id: "overview",    label: "Overview",      icon: "◈" },
  { id: "pi",          label: "Raspberry Pi",  icon: "⬡" },
  { id: "pixhawk",     label: "Pixhawk FC",    icon: "✦" },
  { id: "gimbal",      label: "Gimbal",        icon: "◎" },
  { id: "power",       label: "Power System",  icon: "⚡" },
  { id: "sensors",     label: "Sensors",       icon: "◉" },
  { id: "comms",       label: "Comms",         icon: "◈" },
]

export default function SystemPage() {
  const [sys, setSys]     = useState({})
  const [connected, setConnected] = useState(false)
  const [active, setActive] = useState("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ws
    let retry

    function connect() {
      ws = new WebSocket(WS_URL)
      ws.onopen = () => {
        setConnected(true)
        setLoading(false)
      }
      ws.onmessage = (e) => {
        setSys(JSON.parse(e.data))
        setLoading(false)
      }
      ws.onerror = (err) => {
        console.error("[WS] System error", err)
        setConnected(false)
      }
      ws.onclose = () => {
        setConnected(false)
        retry = setTimeout(connect, 3000)
      }
    }

    async function fetchSnapshot() {
      try {
        const res = await fetch(`${API_URL}/system/status`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setSys(data)
        setLoading(false)
      } catch (err) {
        console.warn("[System HTTP] snapshot failed", err)
      }
    }

    fetchSnapshot()
    connect()
    return () => { clearTimeout(retry); ws?.close() }
  }, [])

  return (
    <div className="system-page">

      {/* Sidebar nav */}
      <div className="system-sidebar">
        <div className="system-sidebar-title">System</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`system-nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => setActive(item.id)}
          >
            <span className="system-nav-icon">{item.icon}</span>
            <span className="system-nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="system-main">

        {/* Status Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(59,130,246,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(90deg, rgba(30,40,60,0.5), rgba(15,25,40,0.5))"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              fontSize: 32,
              opacity: loading ? 0.5 : 1,
              animation: loading ? "pulse 2s infinite" : "none"
            }}>
              {active === "overview" ? "📊" : active === "pi" ? "⬡" : active === "pixhawk" ? "✦" : active === "gimbal" ? "◎" : active === "power" ? "⚡" : active === "sensors" ? "◉" : "◈"}
            </div>
            <div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                {active.toUpperCase()} STATUS
              </div>
              <div style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 4
              }}>
                {connected ? "✓ Real-time monitoring active" : "○ Connecting..."}
              </div>
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: 12,
            alignItems: "center"
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: connected ? "#10b981" : "#ef4444",
              boxShadow: `0 0 12px ${connected ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)"}`,
              animation: "pulse-green 2s infinite"
            }} />
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              fontWeight: 600,
              color: connected ? "#10b981" : "#ef4444",
              textTransform: "uppercase"
            }}>
              {connected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {sys.alerts?.length > 0 && (
          <div className="system-alert-bar" style={{ paddingTop: 12 }}>
            {sys.alerts.map((a, i) => (
              <div key={i} className="alarm-banner">
                <div className="alarm-dot" />
                <span className="alarm-text">{a}</span>
              </div>
            ))}
          </div>
        )}

        <div className="system-content">

          {/* OVERVIEW */}
          {active === "overview" && (
            <>
              {/* Top metrics */}
              <div className="sys-metric-row">
                <div className={`sys-metric-card ${sys.cpu_usage > 80 ? "warn" : ""}`}>
                  <div className="sys-metric-label">CPU Usage</div>
                  <div className="sys-metric-value">
                    {sys.cpu_usage ?? "—"}
                    <span className="sys-metric-unit">%</span>
                  </div>
                  <ProgressBar value={sys.cpu_usage} color="var(--accent)" />
                </div>

                <div className={`sys-metric-card ${sys.ram_percent > 80 ? "warn" : ""}`}>
                  <div className="sys-metric-label">RAM Usage</div>
                  <div className="sys-metric-value">
                    {sys.ram_percent ?? "—"}
                    <span className="sys-metric-unit">%</span>
                  </div>
                  <ProgressBar value={sys.ram_percent} color="#38bdf8" />
                  <div className="sys-progress-label" style={{ marginTop: -4 }}>
                    <span>{sys.ram_used ?? "—"} GB used</span>
                    <span>{sys.ram_total ?? "—"} GB total</span>
                  </div>
                </div>

                <div className={`sys-metric-card ${sys.cpu_temp > 70 ? "warn" : ""}`}>
                  <div className="sys-metric-label">CPU Temp</div>
                  <TempGauge value={sys.cpu_temp} />
                </div>

                <div className={`sys-metric-card ${sys.disk_percent > 80 ? "warn" : ""}`}>
                  <div className="sys-metric-label">Disk Usage</div>
                  <div className="sys-metric-value">
                    {sys.disk_percent ?? "—"}
                    <span className="sys-metric-unit">%</span>
                  </div>
                  <ProgressBar value={sys.disk_percent} color="var(--amber)" />
                  <div className="sys-progress-label" style={{ marginTop: -4 }}>
                    <span>{sys.disk_used ?? "—"} GB used</span>
                    <span>{sys.disk_total ?? "—"} GB total</span>
                  </div>
                </div>
              </div>

              {/* Secondary stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 8 }}>
                <div className="hw-card">
                  <div className="hw-card-title">⬡ Runtime</div>
                  {[
                    ["Uptime",    sys.uptime ?? "—",           "accent"],
                    ["CPU Freq",  sys.cpu_freq ? `${sys.cpu_freq} MHz` : "—", ""],
                    ["CPU Cores", sys.cpu_cores ?? "—",        "amber"],
                    ["Processes", sys.process_count ?? "—",    ""],
                  ].map(([k, v, c]) => (
                    <div key={k} className="hw-row">
                      <span className="hw-key">{k}</span>
                      <span className={`hw-val ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="hw-card">
                  <div className="hw-card-title">◈ Network</div>
                  {[
                    ["IP Address", PI_IP,                      "accent"],
                    ["Data Sent",  sys.net_sent ? `${sys.net_sent} MB` : "—", ""],
                    ["Data Recv",  sys.net_recv ? `${sys.net_recv} MB` : "—", ""],
                    ["WS Status",  connected ? "ACTIVE" : "OFFLINE", connected ? "green" : "red"],
                  ].map(([k, v, c]) => (
                    <div key={k} className="hw-row">
                      <span className="hw-key">{k}</span>
                      <span className={`hw-val ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="hw-card">
                  <div className="hw-card-title">◉ MLX Thermal</div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    flexDirection: "column",
                    gap: 6,
                    padding: "8px 0"
                  }}>
                    <TempGauge value={sys.cpu_temp} max={100} />
                    <span style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 8,
                      color: "var(--text-faint)",
                      letterSpacing: "0.1em"
                    }}>
                      HEATSINK TEMP
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* RASPBERRY PI */}
          {active === "pi" && (
            <HardwareCard title="Raspberry Pi 5" icon="⬡" specs={[
              ["Model",        "Raspberry Pi 5",    "accent"],
              ["RAM",          "8 GB LPDDR4X",      ""],
              ["CPU",          "Cortex-A76 4-core", ""],
              ["CPU Speed",    "2.4 GHz",           "amber"],
              ["Storage",      "32 GB SD Card",     ""],
              ["OS",           "Raspberry Pi OS",   ""],
              ["Python",       "3.13",              ""],
              ["IP Address",   PI_IP,               "accent"],
              ["Uptime",       sys.uptime ?? "—",   "green"],
              ["CPU Temp",     sys.cpu_temp ? `${sys.cpu_temp}°C` : "—",
                               sys.cpu_temp > 70 ? "red" : "green"],
              ["CPU Usage",    sys.cpu_usage ? `${sys.cpu_usage}%` : "—", ""],
              ["RAM Used",     sys.ram_used ? `${sys.ram_used} GB` : "—", ""],
              ["Disk Used",    sys.disk_used ? `${sys.disk_used} GB` : "—", ""],
              ["Role",         "Onboard Computer",  "accent"],
            ]} />
          )}

          {/* PIXHAWK */}
          {active === "pixhawk" && (
            <HardwareCard title="Pixhawk 2.4.8 FC" icon="✦" specs={[
              ["Model",         "Pixhawk 2.4.8",        "accent"],
              ["Processor",     "STM32F427",             ""],
              ["IMU",           "MPU6000 + LSM303D",     ""],
              ["Barometer",     "MS5611",                ""],
              ["Connection",    "USB / MAVLink",         "amber"],
              ["Baud Rate",     "57600",                 ""],
              ["Protocol",      "MAVLink v2",            "accent"],
              ["Firmware",      "ArduCopter",            ""],
              ["Frame Type",    "Hexacopter (+)",        ""],
              ["GPS",           "External M8N",          "green"],
              ["RC Input",      "PWM / SBUS",            ""],
              ["Telemetry",     "/dev/ttyACM0",          "accent"],
            ]} />
          )}

          {/* GIMBAL */}
          {active === "gimbal" && (
            <HardwareCard title="Custom 3-Axis Gimbal" icon="◎" specs={[
              ["Type",          "3-Axis Stabilized",     "accent"],
              ["Design",        "Custom Built",          "amber"],
              ["Axis 1",        "Roll — Servo",          ""],
              ["Axis 2",        "Pitch — Servo",         ""],
              ["Axis 3",        "Yaw — Servo",           ""],
              ["Controller",    "ESP32",                 "accent"],
              ["Camera Mount",  "Pi Cam 3 (IMX708)",     ""],
              ["Control",       "PWM via ESP32",         ""],
              ["Protocol",      "GPIO / PWM",            ""],
              ["Stabilization", "Active (3-axis)",       "green"],
            ]} />
          )}

          {/* POWER */}
          {active === "power" && (
            <HardwareCard title="Power System" icon="⚡" specs={[
              ["Battery",       "LiPo (Arranging)",      "amber"],
              ["Backup",        "Power Bank",            ""],
              ["Buck Conv.",    "5V / 3A Step-Down",     "accent"],
              ["Pi Supply",     "5V via Buck Conv.",     "green"],
              ["Pixhawk",       "5V via BEC",            "green"],
              ["Servo Power",   "5V Rail",               ""],
              ["ESC",           "30A × 6",               ""],
              ["Motor KV",      "TBD",                   ""],
              ["Prop Size",     "TBD",                   ""],
            ]} />
          )}

          {/* SENSORS */}
          {active === "sensors" && (
            <HardwareCard title="Sensor Suite" icon="◉" specs={[
              ["DHT11",         "Temp + Humidity",       "accent"],
              ["DHT11 Pin",     "GPIO 4",                ""],
              ["Vibration",     "SW-420",                "accent"],
              ["Vibration Pin", "GPIO 23",               ""],
              ["PIR",           "AM312 (Downward)",      "accent"],
              ["PIR Pin",       "GPIO 24",               ""],
              ["PIR Range",     "~7 meters",             "amber"],
              ["MLX Thermal",   "Heatsink Monitor",      "accent"],
              ["LiDAR",         "Planned",               ""],
              ["GPS",           "M8N via Pixhawk",       "green"],
              ["Barometer",     "MS5611 via Pixhawk",    "green"],
              ["IMU",           "MPU6000 via Pixhawk",   "green"],
            ]} />
          )}

          {/* COMMS */}
          {active === "comms" && (
            <HardwareCard title="Communications" icon="◈" specs={[
              ["GCS Protocol",  "WebSocket",             "accent"],
              ["Telemetry",     "MAVLink v2",            "accent"],
              ["MAVLink Port",  "/dev/ttyACM0",          ""],
              ["Baud Rate",     "57600",                 ""],
              ["Network",       "WiFi 802.11",           "green"],
              ["Pi IP",         PI_IP,                   "accent"],
              ["Backend Port",  "8000 (FastAPI)",        ""],
              ["Camera Port",   "8080 (Flask)",          ""],
              ["DB Port",       "5432 (PostgreSQL)",     ""],
              ["ESP32",         "Gimbal Control",        "amber"],
              ["RC Protocol",   "PWM / SBUS",            ""],
            ]} />
          )}

        </div>
      </div>
    </div>
  )
}