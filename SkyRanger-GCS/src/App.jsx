import { useState, useEffect } from "react"
import { ArrowUpRight, Wind, BatteryCharging, Zap, Satellite, MapPin } from "lucide-react"
import MapPanel from "./MapPanel"
import SensorPage from "./SensorPage"
import CameraPage from "./CameraPage"
import SystemPage from "./SystemPage"
import MissionPage from "./MissionPage"
import AboutPage from "./AboutPage"

const emptyTelemetry = {
  armed: null, flight_mode: null,
  alt: null, vx: null,
  battery_remaining: null, battery_voltage: null,
  satellites: null, gps_fix: null,
  roll: null, pitch: null, yaw: null,
  lat: null, lon: null,
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
        <div className="section-label">Altitude</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "8px" }}>
          {[["Roll", data.roll], ["Pitch", data.pitch], ["Yaw", data.yaw]].map(([label, val]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", padding: "10px 4px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "12px", fontFamily: "JetBrains Mono", color: "#e5e7eb" }}>
                {val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}` : "—"}
              </div>
            </div>
          ))}
        </div>
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
  const [reconnecting, setReconnecting] = useState(false)
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


  // Health Check Heartbeat
  useEffect(() => {
    let failures = 0;
    const interval = setInterval(() => {
      fetch('/api/health')
        .then(res => {
          if (!res.ok) throw new Error('Health check failed')
          failures = 0;
          setReconnecting(false);
        })
        .catch(() => {
          failures++;
          if (failures >= 3) {
            setConnected(false);
            setReconnecting(true);
          }
        });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket with auto-reconnect
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let attempt = 0;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        setReconnecting(false);
        attempt = 0;
        setLogs(p => [...p, { time: new Date().toLocaleTimeString(), msg: "MAVLink stream active" }]);
      };

      ws.onmessage = (e) => setTelemetry(JSON.parse(e.data));

      ws.onclose = () => {
        setConnected(false);
        setReconnecting(true);
        attempt++;
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        reconnectTimeout = setTimeout(connectWS, delay);
      };

      ws.onerror = (e) => {
        console.error("[WS]", e);
        ws.close();
      };
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

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

        <div className={`conn-status ${connected ? "text-green-400" : reconnecting ? "text-yellow-400" : "text-red-400"}`}>
          <div className={`conn-dot ${connected ? "connected" : reconnecting ? "reconnecting" : "disconnected"}`} style={reconnecting ? { backgroundColor: '#facc15', boxShadow: '0 0 8px #facc15' } : {}} />
          {connected ? "CONNECTED" : reconnecting ? "RECONNECTING..." : "DISCONNECTED"}
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
            {telemetry.flight_mode || "STANDBY"}
          </span>
        </div>
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {page === "DASHBOARD" && (
          <div className="main-layout">
            <TelemetryPanel data={telemetry} connected={connected} />
            <div className="map-wrapper">
              <MapPanel
                lat={telemetry.lat}
                lon={telemetry.lon}
                flightPath={flightPath}
                waypoints={[]}
                currentWaypointIndex={0}
              />
            </div>
          </div>
        )}
        {page === "SENSORS" && <SensorPage />}
        {page === "CAMERA" && <CameraPage telemetry={telemetry} />}
        {page === "SYSTEM" && <SystemPage />}
        {page === "MISSION" && <MissionPage telemetry={telemetry} connected={connected} />}
        {page === "ABOUT" && <AboutPage />}
      </div>

      <FlightLog logs={logs} />


    </div>
  )
}