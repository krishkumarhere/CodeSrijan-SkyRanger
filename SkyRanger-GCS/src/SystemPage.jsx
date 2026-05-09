import { useState, useEffect } from "react"
import { Cpu, Zap, Activity, Globe, HardDrive, Thermometer, Shield, Server, Network, Clock, AlertCircle } from "lucide-react"

const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws"
const HOSTNAME = window.location.host
const WS_URL = `${WS_PROTOCOL}://${HOSTNAME}/api/ws/system`

function TempGauge({ value, max = 85 }) {
  const pct = Math.min(100, ((value ?? 0) / max) * 100)
  const radius = 30
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  const color = value > 70 ? "#ef4444" : value > 60 ? "#f59e0b" : "#3b82f6"

  return (
    <div className="relative w-24 h-24 mx-auto flex items-center justify-center group">
      <div className="absolute inset-0 rounded-full border border-white/5 bg-blue-500/5 animate-pulse-soft" />
      <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
        <circle 
          cx="40" cy="40" r={radius} fill="none" 
          stroke={color} strokeWidth="4" 
          strokeDasharray={circ} strokeDashoffset={offset} 
          strokeLinecap="round" 
          className="transition-all duration-1000 ease-out" 
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-outfit z-20">
        <span className="text-xl font-black tracking-tighter" style={{ color }}>{value ?? "—"}</span>
        <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mt-0.5">CELSIUS</span>
      </div>
    </div>
  )
}

function StatBar({ label, value, color = "#3b82f6", unit = "%" }) {
  const warn = value > 80
  const barColor = warn ? "#ef4444" : color
  return (
    <div className="w-full group">
      <div className="flex justify-between items-end mb-2">
        <span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-[0.2em]">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`font-outfit text-lg font-black leading-none ${warn ? "text-red-500" : "text-white"}`}>{value ?? "—"}</span>
          <span className="font-mono text-[8px] text-gray-600 font-bold">{unit}</span>
        </div>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out relative" 
          style={{ width: `${value ?? 0}%`, backgroundColor: barColor, boxShadow: `0 0 10px ${barColor}44` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scanline" />
        </div>
      </div>
    </div>
  )
}

function HardwareTile({ title, icon: Icon, specs, color = "blue" }) {
  const borderColors = {
    blue: "border-blue-500/10 group-hover:border-blue-500/30",
    amber: "border-amber-500/10 group-hover:border-amber-500/30",
    green: "border-green-500/10 group-hover:border-green-500/30",
  }

  return (
    <div className={`bg-[#070b14]/60 border rounded-[2rem] p-6 transition-all duration-500 group relative overflow-hidden ${borderColors[color]}`}>
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={80} strokeWidth={1} />
      </div>
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
          <Icon size={18} />
        </div>
        <h3 className="font-outfit text-sm font-black tracking-widest text-white uppercase">{title}</h3>
      </div>
      <div className="space-y-3 relative z-10">
        {specs.map(([key, val, cls]) => (
          <div key={key} className="flex justify-between items-center py-2 border-b border-white/[0.03] last:border-0 group/row">
            <span className="font-mono text-[9px] text-gray-500 uppercase font-bold tracking-widest group-hover/row:text-gray-400 transition-colors">{key}</span>
            <span className={`font-mono text-[10px] font-black ${cls === 'accent' ? 'text-blue-400' : cls === 'amber' ? 'text-amber-500' : cls === 'green' ? 'text-green-400' : cls === 'red' ? 'text-red-500' : 'text-gray-300'}`}>{val}</span>
          </div>
        ))}
      </div>
      {/* HUD corner */}
      <div className="absolute bottom-4 right-4 w-4 h-4 border-r border-b border-white/5 rounded-br-xl pointer-events-none" />
    </div>
  )
}

const NAV_ITEMS = [
  { id: "overview", label: "NODE OVERVIEW", icon: Activity },
  { id: "pi", label: "COMPUTE UNIT", icon: Cpu },
  { id: "pixhawk", label: "FLIGHT CORE", icon: Shield },
  { id: "power", label: "POWER GRID", icon: Zap },
  { id: "comms", label: "NETWORK LINK", icon: Globe },
]

export default function SystemPage() {
  const [sys, setSys] = useState({})
  const [connected, setConnected] = useState(false)
  const [active, setActive] = useState("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ws; let retry
    function connect() {
      ws = new WebSocket(WS_URL)
      ws.onopen = () => { setConnected(true); setLoading(false) }
      ws.onmessage = (e) => { setSys(JSON.parse(e.data)); setLoading(false) }
      ws.onerror = (err) => { console.error("[WS] System error", err); setConnected(false) }
      ws.onclose = () => { setConnected(false); retry = setTimeout(connect, 3000) }
    }
    async function fetchSnapshot() {
      try {
        const res = await fetch(`/api/system/status`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json(); setSys(data); setLoading(false)
      } catch (err) { console.warn("[System HTTP] failed", err) }
    }
    fetchSnapshot(); connect()
    return () => { clearTimeout(retry); ws?.close() }
  }, [])

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[#020617] relative">
      {/* Static background grid */}
      <div className="absolute inset-0 cyber-grid opacity-[0.03] pointer-events-none" />

      {/* Side Navigation HUD */}
      <nav className="flex lg:flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-blue-500/10 bg-[#070b14]/60 backdrop-blur-xl overflow-x-auto lg:overflow-y-auto no-scrollbar py-4 lg:py-8 px-4 lg:w-64 z-20">
        <div className="hidden lg:block font-mono text-[9px] tracking-[0.3em] text-blue-500/60 uppercase font-black mb-8 px-4">System Topology</div>
        <div className="flex lg:flex-col gap-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-500 group ${isActive ? "bg-blue-600/10 border-blue-500/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"}`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-blue-500/20 text-blue-400" : "bg-transparent text-gray-600 group-hover:text-gray-400"}`}>
                  <Icon size={16} />
                </div>
                <span className="font-mono text-[10px] font-black tracking-widest uppercase">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Command View */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between p-6 lg:p-8 border-b border-white/[0.03] gap-4">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity animate-pulse-soft" />
              <div className="relative p-4 bg-blue-600/10 border border-blue-500/30 rounded-[1.25rem] text-blue-400">
                {active === "overview" ? <Activity size={24} /> : <Server size={24} />}
              </div>
            </div>
            <div>
              <h2 className="font-outfit text-2xl font-black text-white tracking-tight uppercase leading-none">{active} INTERFACE</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-blue-500 shadow-[0_0_10px_#3b82f6]" : "bg-red-500"} animate-pulse`} />
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">{connected ? "Operational Status: High" : "Diagnostic Mode: Critical"}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[8px] text-gray-600 uppercase font-black tracking-widest">Network Load</span>
              <span className="font-mono text-xs font-black text-blue-500/80">421.4 KB/S</span>
            </div>
            <div className="h-8 w-px bg-white/5 hidden sm:block" />
            <div className="bg-black/40 border border-white/5 px-5 py-2.5 rounded-2xl flex items-center gap-4">
              <Network size={14} className="text-gray-500" />
              <span className="font-mono text-[10px] font-black text-gray-400 tracking-widest uppercase">{connected ? "ACTIVE_LINK" : "NODE_LOST"}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-8">
          {sys.alerts?.length > 0 && (
            <div className="space-y-3">
              {sys.alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-5 rounded-[1.5rem] text-red-500 animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 bg-red-500/20 rounded-lg"><AlertCircle size={18} /></div>
                  <span className="font-mono text-xs font-black tracking-tight uppercase italic">{a}</span>
                </div>
              ))}
            </div>
          )}

          {active === "overview" && (
            <div className="space-y-10 animate-in fade-in duration-700">
              {/* Performance HUD */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-[#070b14]/40 border border-blue-500/10 p-8 rounded-[2.5rem] flex flex-col gap-6 backdrop-blur-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center relative z-10"><span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-[0.25em]">CORE LOAD</span><Cpu size={16} className="text-blue-500/50" /></div>
                  <StatBar label="System Usage" value={sys.cpu_usage} color="#3b82f6" />
                </div>
                <div className="bg-[#070b14]/40 border border-blue-500/10 p-8 rounded-[2.5rem] flex flex-col gap-6 backdrop-blur-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center relative z-10"><span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-[0.25em]">MEMORY POOL</span><Activity size={16} className="text-purple-500/50" /></div>
                  <StatBar label="RAM Distribution" value={sys.ram_percent} color="#8b5cf6" />
                </div>
                <div className="bg-[#070b14]/40 border border-blue-500/10 p-8 rounded-[2.5rem] flex flex-col items-center justify-center backdrop-blur-xl group">
                  <span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-[0.25em] mb-4 self-start">THERMAL UNIT</span>
                  <TempGauge value={sys.cpu_temp} />
                </div>
                <div className="bg-[#070b14]/40 border border-blue-500/10 p-8 rounded-[2.5rem] flex flex-col gap-6 backdrop-blur-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center relative z-10"><span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-[0.25em]">STORAGE ARRAY</span><HardDrive size={16} className="text-amber-500/50" /></div>
                  <StatBar label="Volume Status" value={sys.disk_percent} color="#f59e0b" />
                </div>
              </div>

              {/* Topology Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <HardwareTile title="Temporal Runtime" icon={Clock} specs={[
                  ["System Uptime", sys.uptime ?? "—", "accent"],
                  ["Core Frequency", sys.cpu_freq ? `${sys.cpu_freq} MHz` : "—", ""],
                  ["Logical Cores", sys.cpu_cores ?? "—", "amber"],
                  ["Active Procs", sys.process_count ?? "—", ""],
                ]} />
                <HardwareTile title="Global Network" icon={Globe} specs={[
                  ["Node Hostname", HOSTNAME, "accent"],
                  ["Packets Sent", sys.net_sent ? `${sys.net_sent} MB` : "—", ""],
                  ["Packets Recv", sys.net_recv ? `${sys.net_recv} MB` : "—", ""],
                  ["Link Integrity", connected ? "VERIFIED" : "DISRUPTED", connected ? "green" : "red"],
                ]} />
                <HardwareTile title="Thermal Core" icon={Thermometer} specs={[
                  ["Sink Temp", `${sys.cpu_temp ?? "—"}°C`, sys.cpu_temp > 70 ? "red" : "green"],
                  ["Throttling", sys.cpu_temp > 70 ? "CRITICAL" : "INACTIVE", sys.cpu_temp > 70 ? "red" : "green"],
                  ["Logic Fan", "SMART_MODE", "accent"],
                  ["State", "OPTIMAL", "green"],
                ]} />
              </div>
            </div>
          )}

          {active === "pi" && (
            <div className="max-w-4xl animate-in fade-in slide-in-from-right-4 duration-700">
              <HardwareTile title="Compute Module 5" icon={Cpu} specs={[
                ["Core Model", "Broadcom BCM2712", "accent"],
                ["LPDDR4X Pool", "8192 MB", ""],
                ["Architecture", "ARM Cortex-A76", ""],
                ["Max Velocity", "2.4 GHz", "amber"],
                ["Kernel Build", "6.6.x-SkyRanger", ""],
                ["Node Role", "Autonomous Pilot", "accent"],
              ]} />
            </div>
          )}

          {active === "pixhawk" && (
            <div className="max-w-4xl animate-in fade-in slide-in-from-right-4 duration-700">
              <HardwareTile title="Flight Control Core" icon={Shield} specs={[
                ["MCU Unit", "STM32F427 @ 168MHz", "accent"],
                ["I/O Protocol", "MAVLink v2.0", "amber"],
                ["Sensor Fusion", "Dual IMU / EKF3", ""],
                ["Positioning", "UBLOX M8N L1", "green"],
                ["Stack Version", "ArduCopter v4.5.x", ""],
              ]} />
            </div>
          )}

          {active === "power" && (
            <div className="max-w-4xl animate-in fade-in slide-in-from-right-4 duration-700">
              <HardwareTile title="Power Distribution" icon={Zap} specs={[
                ["Main Bus", "LiPo 4S High Discharge", "amber"],
                ["Logic Supply", "5.1V / 5A Stabilized", "accent"],
                ["Core Voltage", "Nominal 14.8V", "green"],
                ["Peak Current", "180A (30A per ESC)", ""],
              ]} />
            </div>
          )}

          {active === "comms" && (
            <div className="max-w-4xl animate-in fade-in slide-in-from-right-4 duration-700">
              <HardwareTile title="Comms Infrastructure" icon={Globe} specs={[
                ["Primary Link", "5.8GHz Tactical WiFi", "accent"],
                ["MAVLink UART", "115200 Baud / Hardware", "amber"],
                ["API Backend", "FastAPI / Uvicorn", ""],
                ["Stream Port", "8080 RTSP/HLS", "green"],
              ]} />
            </div>
          )}
        </div>
      </div>
      
      {/* Visual scanline/grain overlay */}
      <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.01] scanlines" />
    </div>
  )
}