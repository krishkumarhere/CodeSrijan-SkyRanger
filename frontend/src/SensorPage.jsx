import { useState, useEffect, useRef, useCallback } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from "recharts"
import { Thermometer, Droplets, Zap, Eye, Activity, Cpu } from "lucide-react"

const PI_IP = "10.132.78.80"

function playAlarm() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 880
  osc.type = "square"
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.4)
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "8px 12px",
      fontFamily: "JetBrains Mono",
      fontSize: 10,
      color: "var(--text-secondary)"
    }}>
      <div style={{ color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

// Full screen detail view
function SensorDetail({ sensor, history, onClose }) {
  const chartData = history.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    value: sensor === "temperature" ? r.temperature
         : sensor === "humidity"    ? r.humidity
         : sensor === "vibration"   ? (r.vibration ? 1 : 0)
         : sensor === "pir"         ? (r.motion ? 1 : 0)
         : 0,
    alarm: r.vib_alarm || r.pir_alarm ? 1 : 0,
  }))

  const isBinary = sensor === "vibration" || sensor === "pir"
  const color = sensor === "temperature" ? "var(--amber)"
              : sensor === "humidity"    ? "var(--cyan)"
              : "var(--red)"

  const label = {
    temperature: "Temperature (°C)",
    humidity:    "Humidity (%)",
    vibration:   "Vibration Events",
    pir:         "Proximity Events",
  }[sensor]

  return (
    <div className="sensor-detail-overlay">
      <div className="sensor-detail-header">
        <span className="sensor-detail-title">{label} — Last Hour</span>
        <button className="sensor-detail-close" onClick={onClose}>✕ CLOSE</button>
      </div>

      {/* Mini stats */}
      <div className="sensor-detail-stats">
        {!isBinary && (
          <>
            <div className="stat-chip">
              <span className="stat-chip-label">Average</span>
              <span className="stat-chip-value accent">
                {chartData.length
                  ? (chartData.reduce((s, d) => s + (d.value ?? 0), 0) / chartData.length).toFixed(1)
                  : "—"}
              </span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-label">Max</span>
              <span className="stat-chip-value">
                {chartData.length ? Math.max(...chartData.map(d => d.value ?? 0)).toFixed(1) : "—"}
              </span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-label">Min</span>
              <span className="stat-chip-value">
                {chartData.length ? Math.min(...chartData.map(d => d.value ?? 0)).toFixed(1) : "—"}
              </span>
            </div>
          </>
        )}
        {isBinary && (
          <div className="stat-chip">
            <span className="stat-chip-label">Total Events</span>
            <span className="stat-chip-value warn">
              {chartData.filter(d => d.value === 1).length}
            </span>
          </div>
        )}
        <div className="stat-chip">
          <span className="stat-chip-label">Data Points</span>
          <span className="stat-chip-value">{chartData.length}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="sensor-detail-chart">
        <ResponsiveContainer width="100%" height="100%">
          {isBinary ? (
            <BarChart data={chartData} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "var(--text-faint)" }} interval={Math.floor(chartData.length / 10)} />
              <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "var(--text-faint)" }} domain={[0, 1]} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name={label} fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="50%" stopColor={color} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "var(--text-faint)" }} interval={Math.floor(chartData.length / 10)} />
              <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "var(--text-faint)" }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2} fill="url(#chartGrad)" dot={false} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Small sparkline inside card
function Sparkline({ data, color }) {
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Sensor bus left strip
function BusSidebar({ sensors, connected }) {
  const items = [
    {
      name: "DHT11",
      pin: "GPIO 4",
      val: sensors.temperature != null ? `${sensors.temperature}°C` : "—",
      bar: Math.min(100, ((sensors.temperature ?? 0) / 50) * 100),
      barColor: "var(--amber)",
      ok: connected,
    },
    {
      name: "HUMIDITY",
      pin: "GPIO 4",
      val: sensors.humidity != null ? `${sensors.humidity}%` : "—",
      bar: sensors.humidity ?? 0,
      barColor: "var(--cyan)",
      ok: connected,
    },
    {
      name: "VIBRATION",
      pin: "GPIO 23",
      val: sensors.vibration ? "ACTIVE" : "STABLE",
      bar: sensors.vibration ? 100 : 0,
      barColor: sensors.vib_alarm ? "var(--red)" : "var(--amber)",
      ok: connected,
    },
    {
      name: "PIR",
      pin: "GPIO 27",
      val: sensors.motion ? "DETECTED" : "CLEAR",
      bar: sensors.motion ? 100 : 0,
      barColor: "var(--red)",
      ok: connected,
    },
    {
      name: "MAVLINK",
      pin: "USB ACM0",
      val: connected ? "ONLINE" : "OFFLINE",
      bar: connected ? 100 : 0,
      barColor: "var(--green)",
      ok: connected,
    },
  ]

  return (
    <div className="sensor-bus-strip">
      <div className="bus-strip-title">Sensor Bus</div>
      {items.map((item) => (
        <div key={item.name} className={`bus-strip-item ${item.ok ? "active" : "offline"}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="bus-strip-name">{item.name}</span>
            <div className={`bus-strip-dot ${item.ok ? "active" : "offline"}`} />
          </div>
          <span className="bus-strip-val">{item.val}</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: "var(--text-faint)" }}>{item.pin}</span>
          <div className="bus-strip-bar">
            <div className="bus-strip-bar-fill" style={{ width: `${item.bar}%`, background: item.barColor }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SensorPage() {
  const [sensors, setSensors] = useState({
    temperature: null, humidity: null,
    vibration: false, motion: false,
    vib_alarm: false, pir_alarm: false,
  })
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [detail, setDetail] = useState(null) // which sensor is expanded
  const [tempSpark, setTempSpark]   = useState([])
  const [humSpark, setHumSpark]     = useState([])
  const prevAlarms = useRef({ vib: false, pir: false })

  // Fetch history from DB
  const fetchHistory = useCallback(async () => {
    try {
      const [histRes, statRes] = await Promise.all([
        fetch(`http://${PI_IP}:8000/history/sensors?hours=1`),
        fetch(`http://${PI_IP}:8000/history/sensors/stats?hours=24`),
      ])
      const hist = await histRes.json()
      const stat = await statRes.json()
      setHistory(hist)
      setStats(stat)

      // Build sparklines from last 30 points
      const last30 = hist.slice(-30)
      setTempSpark(last30.map(r => ({ value: r.temperature })))
      setHumSpark(last30.map(r => ({ value: r.humidity })))
    } catch (e) {
      console.error("[History]", e)
    }
  }, [])

  // Fetch history on mount and every 30s
  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 30000)
    return () => clearInterval(interval)
  }, [fetchHistory])

  // WebSocket for live sensor data
  useEffect(() => {
    const ws = new WebSocket(`ws://${PI_IP}:8000/ws/sensors`)
    ws.onopen = () => setConnected(true)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setSensors(data)
      if (data.vib_alarm && !prevAlarms.current.vib) playAlarm()
      if (data.pir_alarm && !prevAlarms.current.pir) playAlarm()
      prevAlarms.current = { vib: data.vib_alarm, pir: data.pir_alarm }
    }
    ws.onclose = () => setConnected(false)
    return () => ws.close()
  }, [])

  return (
    <div className="sensor-page">

      {/* Left bus sidebar */}
      <BusSidebar sensors={sensors} connected={connected} />

      {/* Main area */}
      <div className="sensor-main">

        {/* Alarm banners */}
        {sensors.vib_alarm && (
          <div className="alarm-banner" style={{ margin: "10px 16px 0" }}>
            <div className="alarm-dot" />
            <span className="alarm-text">TURBULENCE DETECTED — Heavy vibration threshold exceeded</span>
          </div>
        )}
        {sensors.pir_alarm && (
          <div className="alarm-banner" style={{ margin: "6px 16px 0" }}>
            <div className="alarm-dot" />
            <span className="alarm-text">PROXIMITY ALERT — Object within 7m below drone</span>
          </div>
        )}

        {/* Stats bar */}
        <div className="sensor-stats-bar">
          <div className="stat-chip">
            <span className="stat-chip-label">Avg Temp (24h)</span>
            <span className="stat-chip-value accent">{stats.temp_avg ?? "—"}°C</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">Max Temp (24h)</span>
            <span className="stat-chip-value">{stats.temp_max ?? "—"}°C</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">Avg Humidity</span>
            <span className="stat-chip-value accent">{stats.humidity_avg ?? "—"}%</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">Vib Events (24h)</span>
            <span className={`stat-chip-value ${(stats.vibration_events ?? 0) > 10 ? "warn" : ""}`}>
              {stats.vibration_events ?? "—"}
            </span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">Alarm Events</span>
            <span className={`stat-chip-value ${(stats.alarm_events ?? 0) > 0 ? "warn" : ""}`}>
              {stats.alarm_events ?? "—"}
            </span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">PIR Events</span>
            <span className="stat-chip-value">{stats.pir_events ?? "—"}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">Total Readings</span>
            <span className="stat-chip-value">{stats.total_readings ?? "—"}</span>
          </div>
        </div>

        {/* Sensor cards grid */}
        <div className="sensor-grid">

          {/* Temperature */}
          <div className="sensor-card-v2" onClick={() => setDetail("temperature")}>
            <div className="sensor-title">
              <Thermometer size={16} style={{ marginRight: 8, color: "var(--amber)" }} />
              Temperature — DHT11
            </div>
            <div className="sensor-big-value">
              {sensors.temperature ?? "—"}
              {sensors.temperature != null && <span className="sensor-big-unit">°C</span>}
            </div>
            <div className="sensor-sublabel">Click to view trend</div>
            <Sparkline data={tempSpark} color="var(--amber)" />
            <div className="sensor-bar-track">
              <div className="sensor-bar-fill" style={{
                width: `${Math.min(100, ((sensors.temperature ?? 0) / 50) * 100)}%`,
                background: "var(--amber)"
              }} />
            </div>
            <div className="sensor-bar-labels">
              <span className="sensor-bar-label">0°C</span>
              <span className="sensor-bar-label">50°C</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="sensor-card-v2" onClick={() => setDetail("humidity")}>
            <div className="sensor-title">
              <Droplets size={16} style={{ marginRight: 8, color: "var(--cyan)" }} />
              Humidity — DHT11
            </div>
            <div className="sensor-big-value">
              {sensors.humidity ?? "—"}
              {sensors.humidity != null && <span className="sensor-big-unit">%</span>}
            </div>
            <div className="sensor-sublabel">Click to view trend</div>
            <Sparkline data={humSpark} color="var(--cyan)" />
            <div className="sensor-bar-track">
              <div className="sensor-bar-fill" style={{
                width: `${sensors.humidity ?? 0}%`,
                background: "#38bdf8"
              }} />
            </div>
            <div className="sensor-bar-labels">
              <span className="sensor-bar-label">0%</span>
              <span className="sensor-bar-label">100%</span>
            </div>
          </div>

          {/* Vibration */}
          <div className={`sensor-card-v2 ${sensors.vib_alarm ? "alarm" : ""}`} onClick={() => setDetail("vibration")}>
            <div className="sensor-title">
              <Activity size={16} style={{ marginRight: 8, color: sensors.vib_alarm ? "var(--red)" : "var(--amber)" }} />
              Vibration Sensor
            </div>
            <div className="sensor-status">
              <div className="sensor-status-dot" style={{
                background: sensors.vib_alarm ? "var(--red)" : sensors.vibration ? "var(--amber)" : "var(--text-faint)"
              }} />
              <span className={`sensor-status-label ${sensors.vib_alarm ? "alarm" : sensors.vibration ? "active" : ""}`}>
                {sensors.vib_alarm ? "TURBULENCE — ALARM" : sensors.vibration ? "Vibration detected" : "Stable"}
              </span>
            </div>
            <div className="sensor-sublabel">
              {stats.vibration_events ?? 0} events in last 24h — click for timeline
            </div>
          </div>

          {/* PIR */}
          <div className={`sensor-card-v2 ${sensors.pir_alarm ? "alarm" : ""}`} onClick={() => setDetail("pir")}>
            <div className="sensor-title">
              <Eye size={16} style={{ marginRight: 8, color: sensors.motion ? "var(--red)" : "var(--text-muted)" }} />
              PIR Proximity — Downward
            </div>
            <div className="sensor-status">
              <div className="sensor-status-dot" style={{
                background: sensors.motion ? "var(--red)" : "var(--text-faint)"
              }} />
              <span className={`sensor-status-label ${sensors.motion ? "alarm" : ""}`}>
                {sensors.motion ? "OBJECT DETECTED — < 7m" : "Clear — No object"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              <div className={`pir-circle ${sensors.motion ? "active" : ""}`}>
                {sensors.motion ? "⚠" : "✓"}
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "var(--text-muted)" }}>DETECTION RANGE</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>7 meters</div>
              </div>
            </div>
            <div className="sensor-sublabel" style={{ marginTop: 8 }}>
              {stats.pir_events ?? 0} detections in last 24h — click for timeline
            </div>
          </div>

          {/* Pixhawk IMU */}
          <div className="sensor-card-v2" style={{ cursor: "default" }}>
            <div className="sensor-title">
              <Cpu size={16} style={{ marginRight: 8, color: "var(--green)" }} />
              Pixhawk — IMU Health
            </div>
            {[
              ["Accelerometer", "OK"],
              ["Gyroscope", "OK"],
              ["Magnetometer", "OK"],
              ["Barometer", "OK"],
            ].map(([name, status]) => (
              <div key={name} className="imu-row">
                <span className="imu-key">{name}</span>
                <span className="imu-val">{status}</span>
              </div>
            ))}
          </div>

          {/* Empty slot or future sensor */}
          <div className="sensor-card-v2" style={{ cursor: "default", opacity: 0.4, alignItems: "center", justifyContent: "center" }}>
            <div className="sensor-title" style={{ textAlign: "center" }}>
              <Zap size={16} style={{ marginRight: 8, color: "var(--purple)" }} />
              Future Sensor
            </div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>
              Slot available
            </div>
          </div>

        </div>
      </div>

      {/* Full screen detail overlay */}
      {detail && (
        <SensorDetail
          sensor={detail}
          history={history}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}