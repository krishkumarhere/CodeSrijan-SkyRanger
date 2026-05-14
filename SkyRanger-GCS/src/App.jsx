import { useState, useEffect } from "react"
import {
  ArrowUpRight, Wind, BatteryCharging, Zap, Satellite, MapPin,
  Shield, Activity, Crosshair, Navigation, Target, Info, AlertCircle, Video, Radio, Camera
} from "lucide-react"
import SensorPage from "./SensorPage"
import CameraPage from "./CameraPage"
import SystemPage from "./SystemPage"
import MissionPage from "./MissionPage"
import AboutPage from "./AboutPage"
import { ResponsiveShell } from "./components/layout/ResponsiveShell"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ProtectedRoute } from "./auth/ProtectedRoute"
import { AuthProvider } from "./auth/AuthContext"
import Login from "./pages/Login"

const emptyTelemetry = {
  armed: null, flight_mode: null,
  alt: null, vx: null,
  battery_remaining: null, battery_voltage: null,
  satellites: null, gps_fix: null,
  roll: null, pitch: null, yaw: null,
  lat: null, lon: null,
}

function MetricTile({ label, value, unit, warn = false, icon: Icon, color = "blue" }) {
  const colors = {
    blue: "from-blue-500/20 to-transparent border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.05)]",
    amber: "from-amber-500/20 to-transparent border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
    green: "from-green-500/20 to-transparent border-green-500/20 text-green-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
    red: "from-red-500/20 to-transparent border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.05)]",
  }

  const selectedColor = warn ? colors.red : colors[color]

  return (
    <div className={`relative group p-4 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${selectedColor}`}>
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-30 transition-opacity">
        <Icon size={32} strokeWidth={1} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon size={12} className="opacity-60" />
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] opacity-60 leading-none">{label}</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-outfit text-3xl font-black tracking-tight leading-none">
            {value != null ? (typeof value === 'number' ? value.toFixed(1) : value) : "—"}
          </span>
          {unit && <span className="font-mono text-[10px] font-bold opacity-40 uppercase">{unit}</span>}
        </div>
      </div>
      {/* Decorative corner */}
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-white/10" />
    </div>
  )
}

function TelemetryPanel({ data, connected }) {
  const batteryLow = data.battery_remaining !== null && data.battery_remaining < 30

  return (
    <div className="h-full flex flex-col bg-[#070b14]/40 border border-blue-500/10 rounded-[2rem] overflow-hidden backdrop-blur-xl relative group">
      {/* HUD Header */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Shield size={18} className="text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-blue-500/60 uppercase font-bold tracking-[0.25em]">Tactical Feed</span>
              <span className="font-outfit text-lg font-black text-white tracking-tight uppercase leading-none mt-1">Telemetry Node</span>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full border font-mono text-[9px] font-black tracking-widest flex items-center gap-2 ${connected ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {connected ? "LIVE DATA" : "NO LINK"}
          </div>
        </div>

        {/* Mission Status Bar */}
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest leading-none">Flight Mode</span>
            <span className="font-outfit text-sm font-black text-white uppercase tracking-wider">{data.flight_mode || "—"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl font-mono text-xs font-black tracking-[0.15em] border transition-all ${data.armed ? "bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)]" : "bg-white/5 border-white/10 text-gray-500"}`}>
              {data.armed ? "ARMED" : "DISARMED"}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <MetricTile label="Altitude" value={data.alt} unit="m" icon={ArrowUpRight} />
          <MetricTile label="Air Speed" value={data.speed} unit="m/s" icon={Wind} color="amber" />
          <MetricTile label="Battery" value={data.battery_remaining} unit="%" warn={batteryLow} icon={BatteryCharging} color="green" />
          <MetricTile label="Voltage" value={data.battery_voltage} unit="V" warn={batteryLow} icon={Zap} color="green" />
          <MetricTile label="Satellites" value={data.satellites} icon={Satellite} />
          <MetricTile label="GPS Fix" value={data.gps_fix ? "3D LOCK" : "NO FIX"} warn={!data.gps_fix} icon={MapPin} />
        </div>

        {/* Attitude Section */}
        <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-black">Spatial Attitude</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-blue-500/40" />
              <div className="w-1 h-1 rounded-full bg-blue-500/20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["Roll", data.roll, "R"], ["Pitch", data.pitch, "P"], ["Yaw", data.yaw, "Y"]].map(([label, val, short]) => (
              <div key={label} className="relative bg-black/30 border border-white/5 p-3 rounded-2xl group transition-all hover:border-blue-500/20">
                <span className="absolute top-1 right-2 font-mono text-[8px] text-blue-500/30 font-bold">{short}</span>
                <div className="font-mono text-[8px] text-gray-500 uppercase mb-1">{label}</div>
                <div className="font-outfit text-sm font-black text-gray-200">
                  {val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}°` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Position Metadata */}
        <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Navigation size={14} className="text-blue-500" />
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-black">Coordinates</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-3 py-2 bg-black/40 border border-white/5 rounded-xl group">
              <span className="font-mono text-[10px] text-gray-600 font-bold">LAT</span>
              <span className="font-mono text-xs font-black text-blue-400 group-hover:text-blue-300 transition-colors">{data.lat?.toFixed(8) ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-black/40 border border-white/5 rounded-xl group">
              <span className="font-mono text-[10px] text-gray-600 font-bold">LON</span>
              <span className="font-mono text-xs font-black text-blue-400 group-hover:text-blue-300 transition-colors">{data.lon?.toFixed(8) ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] scanlines" />
    </div>
  )
}

function FlightLog({ logs }) {
  return (
    <div className="flex-shrink-0 mx-6 mb-6 mt-2 relative">
      <div className="absolute -top-3 left-4 px-3 py-0.5 bg-blue-600 text-white rounded-full font-mono text-[8px] font-black tracking-widest z-10 shadow-lg">MISSION_LOG</div>
      <div className="bg-[#070b14]/60 border border-blue-500/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 overflow-hidden backdrop-blur-xl group">
        <div className="flex items-center gap-2 pr-4 border-r border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          <span className="font-mono text-[10px] text-blue-500 font-black">SYSTEM_STREAMS</span>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-6 overflow-hidden">
          {logs.slice(-3).reverse().map((log, i) => (
            <div key={i} className="flex items-center gap-3 min-w-0 flex-1 group/item">
              <span className="font-mono text-[10px] text-gray-600 font-bold shrink-0">{log.time}</span>
              <span className="font-mono text-[11px] text-gray-400 truncate group-hover/item:text-gray-200 transition-colors uppercase tracking-tight">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MainApp() {
  const [telemetry, setTelemetry] = useState(emptyTelemetry)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [page, setPage] = useState("DASHBOARD")
  const [logs, setLogs] = useState([
    { time: "00:00:00", msg: "CORE_SYSTEM_INITIALIZED" },
  ])
  const [flightPath, setFlightPath] = useState([
    [24.647287, 77.319182],
    [24.647350, 77.319250],
    [24.647450, 77.319300],
    [24.647550, 77.319350],
    [24.647600, 77.319300],
  ])

  // --- AI Detection Logic ---
  const [aiData, setAiData] = useState({
    pipeline: "standby",
    timestamp: null,
    fps: 0,
    state: "CLEAR",
    snapshot_event: false,
    detections: []
  })
  const [showSnapshotToast, setShowSnapshotToast] = useState(false)

  // 1. Polling Logic: Fetch /api/ai/latest every 1000ms
  useEffect(() => {
    const pollAI = async () => {
      try {
        const res = await fetch("/api/ai/latest")
        if (!res.ok) throw new Error("AI Backend Offline")
        const data = await res.json()

        // 2. AI State Updates: Update local state with latest detection data
        setAiData(data)

        // 3. Snapshot Notification Handling: Trigger toast if snapshot_event is true
        if (data.snapshot_event) {
          setShowSnapshotToast(true)
          setTimeout(() => setShowSnapshotToast(false), 3000) // Auto-hide after 3s
        }
      } catch (e) {
        console.error("AI Poll Error:", e)
        setAiData(prev => ({ ...prev, state: "OFFLINE", fps: 0 }))
      }
    }

    const interval = setInterval(pollAI, 1000)
    return () => clearInterval(interval) // 6. Clean up interval on unmount
  }, [])

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
        setLogs(p => [...p, { time: new Date().toLocaleTimeString([], { hour12: false }), msg: "MAVLINK_STREAM_ESTABLISHED" }]);
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
        const last = prev[prev.length - 1]
        if (last && last[0] === telemetry.lat && last[1] === telemetry.lon) return prev
        const next = [...prev, [telemetry.lat, telemetry.lon]]
        return next.length > 500 ? next.slice(-500) : next
      })
    }
  }, [telemetry.lat, telemetry.lon])

  return (
    <ResponsiveShell
      page={page}
      setPage={setPage}
      connected={connected}
      reconnecting={reconnecting}
      telemetry={telemetry}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Snapshot Notification Toast */}
        {showSnapshotToast && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-8 duration-500">
            <div className="bg-cyan-500 border border-white/20 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-3">
              <Camera size={18} className="text-white animate-pulse" />
              <span className="font-mono text-xs font-black text-white uppercase tracking-widest">Inspection evidence captured</span>
            </div>
          </div>
        )}

        {page === "DASHBOARD" && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 lg:p-8 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar bg-cyber-grid">

            {/* Sidebar Telemetry */}
            <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 lg:h-full flex flex-col gap-6">
              <TelemetryPanel data={telemetry} connected={connected} />

              {/* AI Detection Summary Card */}
              <div className="bg-[#070b14]/40 border border-cyan-500/10 rounded-[2rem] p-6 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                      <Target size={16} className="text-cyan-400" />
                    </div>
                    <span className="font-mono text-[9px] text-cyan-500/60 uppercase font-black tracking-widest">Live AI Intelligence</span>
                  </div>
                  <div className="bg-black/40 px-2 py-0.5 rounded-md font-mono text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                    {aiData?.fps || 0} FPS
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="font-mono text-[9px] text-gray-500 uppercase font-bold tracking-widest">AI Status</span>
                    <span className={`font-mono text-[10px] font-black uppercase tracking-widest ${aiData?.state === "DETECTION" ? "text-orange-500 animate-pulse" : "text-green-500"}`}>
                      {aiData?.state || "CLEAR"}
                    </span>
                  </div>

                  {(aiData?.detections?.length || 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {aiData.detections.map((det, i) => (
                        <div key={i} className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-2">
                          <span className="font-mono text-[9px] text-cyan-400 font-black uppercase tracking-widest">{det.label}</span>
                          <span className="font-mono text-[8px] text-cyan-500/40 font-bold">{(det.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="font-mono text-[8px] text-gray-600 uppercase font-bold tracking-widest italic">No infrastructure defects detected</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-mono text-[8px] text-gray-700 uppercase font-bold tracking-widest">Last Update</span>
                    <span className="font-mono text-[8px] text-gray-500 font-bold">
                      {aiData?.timestamp ? new Date(aiData.timestamp).toLocaleTimeString([], { hour12: false }) : "---"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Camera Preview */}
            <div className="flex-1 min-h-[500px] lg:min-h-0 relative rounded-[2.5rem] overflow-hidden border border-blue-500/20 shadow-2xl bg-black group/camera">

              {/* Tactical Feed Container */}
              <div className="w-full h-full bg-[#04070d] relative overflow-hidden">
                {/* HUD Corner Brackets */}
                <div className="absolute top-10 left-10 w-16 h-16 border-t-2 border-l-2 border-blue-500/30 pointer-events-none z-[20] transition-all group-hover/camera:border-blue-500/60" />
                <div className="absolute top-10 right-10 w-16 h-16 border-t-2 border-r-2 border-blue-500/30 pointer-events-none z-[20] transition-all group-hover/camera:border-blue-500/60" />
                <div className="absolute bottom-10 left-10 w-16 h-16 border-b-2 border-l-2 border-blue-500/30 pointer-events-none z-[20] transition-all group-hover/camera:border-blue-500/60" />
                <div className="absolute bottom-10 right-10 w-16 h-16 border-b-2 border-r-2 border-blue-500/30 pointer-events-none z-[20] transition-all group-hover/camera:border-blue-500/60" />

                {/* Center Targeting Reticle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] opacity-20 transition-opacity group-hover/camera:opacity-40">
                  <div className="relative w-64 h-64 border border-white/5 rounded-full flex items-center justify-center">
                    <div className="absolute w-full h-px bg-white/10" />
                    <div className="absolute h-full w-px bg-white/10" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                  </div>
                </div>

                {/* Tactical FPV Stream (go2rtc) */}
                <div className="absolute inset-0 z-[10] flex items-center justify-center bg-[#05080f]">
                  <iframe
                    src="/fpv/stream.html?src=fpv"
                    className="w-full h-full border-none"
                    allow="autoplay; fullscreen"
                    title="FPV Stream"
                  />

                  {/* AI Detection Overlay (Target Locking) */}
                  <div className="absolute inset-0 z-[15] pointer-events-none">
                    {aiData?.detections?.map((det, i) => {
                      const [x1, y1, x2, y2] = det.bbox || [0, 0, 0, 0]
                      // Assume backend is 640x480 for coordinate scaling
                      const left = (x1 / 640) * 100
                      const top = (y1 / 480) * 100
                      const width = ((x2 - x1) / 640) * 100
                      const height = ((y2 - y1) / 480) * 100

                      return (
                        <div 
                          key={i}
                          className="absolute border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                          }}
                        >
                          {/* Targeting Brackets */}
                          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-red-400" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-red-400" />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-red-400" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-red-400" />
                          
                          {/* Detection Label */}
                          <div className="absolute -top-6 left-0 bg-red-600 text-white font-mono text-[8px] px-2 py-0.5 rounded-sm flex items-center gap-1">
                            <Crosshair size={8} className="animate-spin" />
                            <span className="uppercase font-black">{det.label}</span>
                            <span className="opacity-60">{(det.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tactical Overlays (Scanlines/Noise) */}
                  <div className="absolute inset-0 pointer-events-none z-[20] opacity-[0.03] scanlines" />
                  <div className="absolute inset-0 pointer-events-none z-[20] opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
                </div>

                {/* Stream Info Overlays */}
                <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-[30] pointer-events-none">
                  <div className="flex flex-col gap-2">
                    <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                      <span className="font-mono text-[10px] font-black tracking-widest text-white uppercase">PRIMARY_DOWNLINK</span>
                    </div>
                    <div className="bg-black/60 border border-white/5 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                      <span className="font-mono text-[9px] text-gray-400 uppercase tracking-widest">DEVICE: LOGITECH_C270</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                      <Activity size={14} className="text-blue-500" />
                      <span className="font-mono text-[10px] font-black tracking-widest text-white uppercase">AI_ENGINE: {(aiData?.pipeline || "standby").toUpperCase()}</span>
                    </div>
                    <div className={`bg-black/60 border border-white/5 px-3 py-1.5 rounded-xl backdrop-blur-sm flex items-center gap-2 transition-colors ${aiData?.state === "DETECTION" ? "text-orange-400" : "text-gray-400"}`}>
                      <span className="font-mono text-[9px] uppercase tracking-widest">THREAT_LEVEL: {aiData?.state || "CLEAR"}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom HUD Metadata */}
                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end z-[30] pointer-events-none">
                  <div className="flex flex-col gap-2">
                    <div className="bg-black/60 border border-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${aiData?.state === "OFFLINE" ? "bg-red-500" : "bg-green-500"}`} />
                        <span className="font-mono text-[9px] text-gray-400 uppercase tracking-widest">
                          {aiData?.state === "OFFLINE" ? "AI_LINK_LOST" : "AI_INFERENCE_READY"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-[#070b14]/90 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] text-blue-500/60 uppercase font-bold tracking-widest">LAT</span>
                      <span className="font-mono text-xs font-black text-white">{telemetry.lat?.toFixed(6) ?? "0.000000"}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] text-blue-500/60 uppercase font-bold tracking-widest">LON</span>
                      <span className="font-mono text-xs font-black text-white">{telemetry.lon?.toFixed(6) ?? "0.000000"}</span>
                    </div>
                  </div>
                </div>

                {/* Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none z-[40] opacity-[0.03] scanlines" />
              </div>
            </div>
          </div>
        )}
        {page === "SENSORS" && <SensorPage />}
        {page === "CAMERA" && <CameraPage telemetry={telemetry} />}
        {page === "SYSTEM" && <SystemPage />}
        {page === "MISSION" && <MissionPage telemetry={telemetry} connected={connected} />}
        {page === "ABOUT" && <AboutPage />}

        <FlightLog logs={logs} />
      </div>
    </ResponsiveShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<MainApp />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}