import { useState, useEffect, useRef, useCallback } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from "recharts"
import { Thermometer, Droplets, Zap, Eye, Activity, Cpu, X, ShieldAlert, Target, Navigation, Box, ZapOff } from "lucide-react"

// Audio singleton to prevent memory leaks and crashes
let audioCtx = null;
function playAlarm() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 880
    osc.type = "square"
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.4)
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#070b14]/95 border border-blue-500/20 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
      <div className="font-mono text-[9px] text-blue-500/60 mb-2 uppercase tracking-[0.2em] font-black">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-mono text-[11px] font-black uppercase text-white">
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function SensorDetail({ sensor, history, onClose }) {
  const chartData = (Array.isArray(history) ? history : []).map(r => ({
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : "—",
    value: sensor === "temperature" ? (r.temperature || 0)
         : sensor === "humidity"    ? (r.humidity || 0)
         : sensor === "vibration"   ? (r.vibration ? 1 : 0)
         : sensor === "pir"         ? (r.motion ? 1 : 0)
         : 0,
  }))

  const isBinary = sensor === "vibration" || sensor === "pir"
  const color = sensor === "temperature" ? "#f59e0b" : sensor === "humidity" ? "#3b82f6" : "#ef4444"
  const label = { temperature: "Core Temperature", humidity: "Environmental Humidity", vibration: "Vibration Impulse", pir: "Proximity Alert" }[sensor] || "Sensor Data"

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-2xl flex flex-col p-4 sm:p-12 animate-in fade-in zoom-in-95 duration-500 relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.03] pointer-events-none" />
      
      <header className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl text-blue-400">
            <Activity size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="font-outfit text-3xl font-black text-white tracking-tight uppercase leading-none">{label}</h2>
            <div className="font-mono text-[10px] text-blue-500/60 uppercase tracking-[0.3em] mt-2 font-bold italic">Telemetry Stream: {sensor.toUpperCase()}</div>
          </div>
        </div>
        <button className="p-2 sm:p-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all group" onClick={onClose}>
          <X size={20} className="sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" />
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-12 relative z-10">
        <div className="bg-[#070b14]/60 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
          <span className="block font-mono text-[7px] sm:text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1 sm:mb-3 leading-none">AVERAGE</span>
          <span className="font-outfit text-xl sm:text-4xl font-black text-blue-400">{chartData.length ? (chartData.reduce((s, d) => s + (d.value ?? 0), 0) / chartData.length).toFixed(1) : "—"}</span>
        </div>
        <div className="bg-[#070b14]/60 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
          <span className="block font-mono text-[7px] sm:text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1 sm:mb-3 leading-none">PEAK</span>
          <span className="font-outfit text-xl sm:text-4xl font-black text-white">{chartData.length ? Math.max(...chartData.map(d => d.value ?? 0)).toFixed(1) : "—"}</span>
        </div>
        <div className="bg-[#070b14]/60 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
          <span className="block font-mono text-[7px] sm:text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1 sm:mb-3 leading-none">PACKETS</span>
          <span className="font-outfit text-xl sm:text-4xl font-black text-white">{chartData.length}</span>
        </div>
        <div className="bg-[#070b14]/60 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-green-500/20 backdrop-blur-xl">
          <span className="block font-mono text-[7px] sm:text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1 sm:mb-3 leading-none">HEALTH</span>
          <span className="font-outfit text-xl sm:text-4xl font-black text-green-500 uppercase tracking-tight">OPTIMAL</span>
        </div>
      </div>

      <div className="flex-1 bg-black/40 border border-blue-500/10 rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 min-h-0 relative z-10 group overflow-hidden">
        <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-blue-500/20" />
        <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-blue-500/20" />
        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-blue-500/20" />
        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-blue-500/20" />
        
        <ResponsiveContainer width="100%" height="100%">
          {isBinary ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#475569" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#475569" }} domain={[0, 1]} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" name={label} fill={color} radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#475569" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#475569" }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={4} fill="url(#chartGrad)" dot={{ r: 4, fill: color, strokeWidth: 2, stroke: "#020617" }} activeDot={{ r: 8, strokeWidth: 0 }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
        <div className="absolute inset-0 scanlines pointer-events-none opacity-[0.02]" />
      </div>
    </div>
  )
}

function Sparkline({ data, color }) {
  if (!Array.isArray(data) || !data.length) return <div className="h-[50px]" />
  return (
    <ResponsiveContainer width="100%" height={50}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#sparkGrad-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function BusSidebar({ sensors, connected }) {
  const items = [
    { name: "DHT11_TEMP", icon: Thermometer, val: sensors?.temperature != null ? `${sensors.temperature}°C` : "—", bar: Math.min(100, ((sensors?.temperature ?? 0) / 50) * 100), color: "#f59e0b", ok: connected },
    { name: "DHT11_HUMID", icon: Droplets, val: sensors?.humidity != null ? `${sensors.humidity}%` : "—", bar: sensors?.humidity ?? 0, color: "#3b82f6", ok: connected },
    { name: "VIBE_INERTIAL", icon: Activity, val: sensors?.vibration ? "IMPULSE" : "STABLE", bar: sensors?.vibration ? 100 : 0, color: sensors?.vib_alarm ? "#ef4444" : "#f59e0b", ok: connected },
    { name: "PIR_PASSIVE", icon: Eye, val: sensors?.motion ? "DETECTED" : "NULL", bar: sensors?.motion ? 100 : 0, color: "#ef4444", ok: connected },
  ]

  return (
    <nav className="flex lg:flex-col shrink-0 py-6 px-6 border-b lg:border-b-0 lg:border-r border-blue-500/10 bg-[#070b14]/60 backdrop-blur-xl overflow-x-auto lg:overflow-y-auto no-scrollbar lg:w-72 z-20">
      <div className="hidden lg:block font-mono text-[9px] tracking-[0.3em] text-blue-500/60 uppercase font-black mb-10 px-2">Hardware Bus Interface</div>
      <div className="flex lg:flex-col gap-4">
        {items.map((item) => (
          <div key={item.name} className={`flex-1 lg:flex-none min-w-[180px] p-5 rounded-2xl border transition-all duration-500 group ${item.ok ? "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-blue-500/20" : "border-red-500/20 bg-red-500/5 opacity-40"}`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <item.icon size={12} className={item.ok ? "text-blue-500/60" : "text-red-500/60"} />
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-bold">{item.name}</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${item.ok ? "bg-green-500 shadow-[0_0_8px_#10b981]" : "bg-red-500"}`} />
            </div>
            <div className="font-outfit text-lg font-black text-white mb-3 uppercase tracking-wider">{item.val}</div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${item.bar}%`, backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}44` }} />
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}

export default function SensorPage() {
  const [sensors, setSensors] = useState({ temperature: null, humidity: null, vibration: false, motion: false, vib_alarm: false, pir_alarm: false })
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [detail, setDetail] = useState(null)
  const [tempSpark, setTempSpark] = useState([])
  const [humSpark, setHumSpark] = useState([])
  const prevAlarms = useRef({ vib: false, pir: false })

  const fetchHistory = useCallback(async () => {
    try {
      const [histRes, statRes] = await Promise.all([
        fetch(`/api/history/sensors?hours=1`),
        fetch(`/api/history/sensors/stats?hours=24`),
      ])
      if (!histRes.ok || !statRes.ok) throw new Error("Backend offline");
      
      const hist = await histRes.json(); 
      const stat = await statRes.json()
      
      if (Array.isArray(hist)) {
        setHistory(hist);
        const last30 = hist.slice(-30)
        setTempSpark(last30.map(r => ({ value: r.temperature })))
        setHumSpark(last30.map(r => ({ value: r.humidity })))
      }
      if (stat) setStats(stat)
    } catch (e) { 
      console.warn("[Sensor History API failed]", e) 
    }
  }, [])

  useEffect(() => {
    fetchHistory(); 
    const interval = setInterval(fetchHistory, 30000)
    return () => clearInterval(interval)
  }, [fetchHistory])

  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/sensors`;
        
        ws = new WebSocket(wsUrl)
        ws.onopen = () => setConnected(true)
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data); 
            if (data && typeof data === 'object') {
              setSensors(data)
              if (data.vib_alarm && !prevAlarms.current.vib) playAlarm()
              if (data.pir_alarm && !prevAlarms.current.pir) playAlarm()
              prevAlarms.current = { vib: !!data.vib_alarm, pir: !!data.pir_alarm }
            }
          } catch (err) {
            console.error("WS Parse Error", err);
          }
        }
        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 5000);
        }
        ws.onerror = (err) => {
          console.error("WS Error", err);
          ws.close();
        }
      } catch (err) {
        console.error("WS Connection Init failed", err);
      }
    }

    connect();
    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[#020617] relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />
      <BusSidebar sensors={sensors} connected={connected} />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        <header className="p-4 sm:p-8 lg:px-12 border-b border-white/[0.03] flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl text-blue-400">
              <Zap size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="font-outfit text-lg sm:text-2xl font-black text-white tracking-tight uppercase leading-none">Sensor Matrix</h1>
              <div className="font-mono text-[7px] sm:text-[9px] text-blue-500/60 uppercase font-bold tracking-widest sm:tracking-[0.25em] mt-1 sm:mt-1.5">Live Synthesis Unit</div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[8px] text-gray-600 uppercase font-black tracking-widest font-bold">Latency</span>
              <span className="font-mono text-xs font-black text-blue-500/80 tracking-widest">12.4 MS</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 shadow-[0_0_8px_#10b981]" : "bg-red-500 animate-pulse"}`} />
              <span className="font-mono text-[8px] sm:text-[10px] font-black text-gray-400 tracking-widest uppercase">{connected ? "SYNCED" : "FAULT"}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 lg:p-12 space-y-6 sm:space-y-10">
          
          {/* Active Alerts HUD */}
          {(sensors?.vib_alarm || sensors?.pir_alarm) && (
            <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
              {sensors.vib_alarm && (
                <div className="flex items-center gap-4 bg-red-600/10 border border-red-500/30 p-6 rounded-[1.5rem] text-red-500 animate-pulse">
                  <ShieldAlert size={24} className="shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] mb-1 leading-none">Acoustic_Structural_Anomaly</span>
                    <span className="font-outfit text-sm font-black tracking-tight uppercase italic">Heavy vibration detected within propulsion frame</span>
                  </div>
                </div>
              )}
              {sensors.pir_alarm && (
                <div className="flex items-center gap-4 bg-amber-600/10 border border-amber-500/30 p-6 rounded-[1.5rem] text-amber-500 animate-pulse">
                  <Target size={24} className="shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] mb-1 leading-none">Proximity_Intrusion_Event</span>
                    <span className="font-outfit text-sm font-black tracking-tight uppercase italic">Unauthorized object detected within critical safety radius</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aggregate Telemetry Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
            {[
              { label: "Avg Temp", val: stats?.temp_avg, unit: "°C" },
              { label: "Max Temp", val: stats?.temp_max, unit: "°C" },
              { label: "Humidity", val: stats?.humidity_avg, unit: "%" },
              { label: "Vibe", val: stats?.vibration_events, unit: "" },
              { label: "PIR", val: stats?.pir_events, unit: "" },
              { label: "Alarms", val: stats?.alarm_events, unit: "", warn: (stats?.alarm_events > 0) },
              { label: "Packets", val: stats?.total_readings, unit: "" },
            ].map((s, i) => (
              <div key={i} className={`bg-[#070b14]/60 border p-3 sm:p-5 rounded-xl sm:rounded-2xl flex flex-col gap-1 sm:gap-2 transition-all hover:bg-white/5 ${s.warn ? "border-red-500/20" : "border-white/5"}`}>
                <span className="font-mono text-[6px] sm:text-[8px] text-gray-500 uppercase tracking-widest font-bold leading-none">{s.label}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`font-outfit text-sm sm:text-xl font-black ${s.warn ? "text-red-500" : "text-white"}`}>{s.val ?? "0"}</span>
                  <span className="font-mono text-[6px] sm:text-[8px] text-gray-600 font-bold uppercase">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Major Telemetry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            
            {/* Temperature Tile */}
            <div className="group bg-[#070b14]/60 border border-blue-500/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer backdrop-blur-xl relative overflow-hidden" onClick={() => setDetail("temperature")}>
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Thermometer size={100} className="sm:w-[120px] sm:h-[120px]" strokeWidth={1} />
              </div>
              <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform"><Thermometer size={16} className="sm:w-5 sm:h-5" /></div>
                  <span className="font-mono text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Thermal_Core</span>
                </div>
                <span className="font-mono text-[7px] sm:text-[8px] text-gray-600 uppercase border border-white/10 px-2 py-0.5 rounded-lg font-bold tracking-widest">IO_4</span>
              </div>
              <div className="flex items-baseline gap-2 sm:gap-3 mb-6 sm:mb-8 relative z-10">
                <span className="font-outfit text-4xl sm:text-6xl font-black text-white leading-none tracking-tighter">{sensors?.temperature ?? "—"}</span>
                <span className="font-outfit text-lg sm:text-2xl font-black text-gray-600 uppercase">°C</span>
              </div>
              <Sparkline data={tempSpark} color="#f59e0b" />
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5 flex justify-between items-center relative z-10 group/btn">
                <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-gray-500 font-black">View History</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 transition-all group-hover/btn:bg-amber-500 group-hover/btn:text-white group-hover/btn:shadow-[0_0_15px_#f59e0b]">
                  <Activity size={12} className="sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            </div>

            {/* Humidity Tile */}
            <div className="group bg-[#070b14]/60 border border-blue-500/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer backdrop-blur-xl relative overflow-hidden" onClick={() => setDetail("humidity")}>
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Droplets size={100} className="sm:w-[120px] sm:h-[120px]" strokeWidth={1} />
              </div>
              <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform"><Droplets size={16} className="sm:w-5 sm:h-5" /></div>
                  <span className="font-mono text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Atmospheric_RH</span>
                </div>
                <span className="font-mono text-[7px] sm:text-[8px] text-gray-600 uppercase border border-white/10 px-2 py-0.5 rounded-lg font-bold tracking-widest">IO_4</span>
              </div>
              <div className="flex items-baseline gap-2 sm:gap-3 mb-6 sm:mb-8 relative z-10">
                <span className="font-outfit text-4xl sm:text-6xl font-black text-white leading-none tracking-tighter">{sensors?.humidity ?? "—"}</span>
                <span className="font-outfit text-lg sm:text-2xl font-black text-gray-600 uppercase">%</span>
              </div>
              <Sparkline data={humSpark} color="#3b82f6" />
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5 flex justify-between items-center relative z-10 group/btn">
                <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-gray-500 font-black">View History</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 transition-all group-hover/btn:bg-blue-500 group-hover/btn:text-white group-hover/btn:shadow-[0_0_15px_#3b82f6]">
                  <Activity size={12} className="sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            </div>

            {/* Vibration/Impulse Tile */}
            <div className={`group p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border transition-all duration-500 cursor-pointer backdrop-blur-xl relative overflow-hidden ${sensors?.vib_alarm ? "bg-red-600/10 border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.25)]" : "bg-[#070b14]/60 border-blue-500/10 hover:-translate-y-2 shadow-2xl"}`} onClick={() => setDetail("vibration")}>
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Activity size={100} className="sm:w-[120px] sm:h-[120px]" strokeWidth={1} />
              </div>
              <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className={`p-3 rounded-2xl transition-all ${sensors?.vib_alarm ? "bg-red-500 text-white shadow-[0_0_15px_#ef4444]" : "bg-blue-500/10 border border-blue-500/20 text-blue-400"}`}>
                  <ZapOff size={20} />
                </div>
                <span className="font-mono text-[10px] font-black text-gray-500 uppercase tracking-widest">Inertial_Impulse</span>
              </div>
              
              <div className="flex items-center gap-5 mb-8 relative z-10">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 font-outfit text-2xl font-black ${sensors?.vib_alarm ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" : sensors?.vibration ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-green-500/10 border-green-500 text-green-500"}`}>
                  {sensors?.vib_alarm ? "!!!" : sensors?.vibration ? "!" : "OK"}
                </div>
                <div className="flex flex-col">
                  <span className={`font-outfit text-xl font-black uppercase tracking-tight ${sensors?.vib_alarm ? "text-red-500" : "text-white"}`}>
                    {sensors?.vib_alarm ? "CRITICAL" : sensors?.vibration ? "TRANS_VIB" : "NOMINAL"}
                  </span>
                  <span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1 italic leading-none">Spectrum Analysis</span>
                </div>
              </div>
            </div>

            {/* Proximity/PIR Tile */}
            <div className={`group p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border transition-all duration-500 cursor-pointer backdrop-blur-xl relative overflow-hidden ${sensors?.motion ? "bg-red-600/10 border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.25)]" : "bg-[#070b14]/60 border-blue-500/10 hover:-translate-y-2 shadow-2xl"}`} onClick={() => setDetail("pir")}>
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Eye size={100} className="sm:w-[120px] sm:h-[120px]" strokeWidth={1} />
              </div>
              <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className={`p-3 rounded-2xl transition-all ${sensors?.motion ? "bg-red-500 text-white shadow-[0_0_15px_#ef4444]" : "bg-blue-500/10 border border-blue-500/20 text-blue-400"}`}>
                  <Target size={20} />
                </div>
                <span className="font-mono text-[10px] font-black text-gray-500 uppercase tracking-widest">Passive_Proximity</span>
              </div>
              
              <div className="flex items-center gap-5 sm:gap-8 mb-8 relative z-10">
                <div className="relative">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-4 font-outfit text-2xl sm:text-3xl font-black ${sensors?.motion ? "bg-red-500/20 border-red-500 text-red-500 animate-ping" : "bg-blue-500/5 border-white/5 text-gray-700"}`}>
                    {sensors?.motion ? "!" : "OK"}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Downlink_Range</div>
                  <div className="font-outfit text-xl sm:text-2xl font-black text-white tracking-widest underline decoration-blue-500/50 underline-offset-8 leading-none">7.0M SCAN</div>
                  <div className={`font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-4 ${sensors?.motion ? "text-red-500 animate-pulse" : "text-green-500/40"}`}>
                    {sensors?.motion ? "WARNING: INTRUSION" : "CONE_SECURE"}
                  </div>
                </div>
              </div>
            </div>

            {/* Compute/Hardware Meta Tile */}
            <div className="bg-[#070b14]/60 border border-blue-500/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Box size={100} className="sm:w-[120px] sm:h-[120px]" strokeWidth={1} />
              </div>
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-500"><Cpu size={20} /></div>
                <span className="font-mono text-[10px] font-black text-gray-500 uppercase tracking-widest">IMU_Array_Status</span>
              </div>
              <div className="space-y-3 sm:space-y-4 relative z-10">
                {[
                  { name: "ACCEL_3_AXIS", status: "VERIFIED" },
                  { name: "GYRO_PRECISION", status: "VERIFIED" },
                  { name: "MAG_NORTH_LOCK", status: "VERIFIED" },
                  { name: "BARO_PRESSURE", status: "VERIFIED" },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-colors group/item">
                    <span className="font-mono text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-widest font-black group-hover/item:text-blue-400/70 transition-colors leading-none">{s.name}</span>
                    <span className="font-mono text-[9px] sm:text-[10px] font-black text-green-500 uppercase tracking-widest">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {detail && <SensorDetail sensor={detail} history={history} onClose={() => setDetail(null)} />}
      
      {/* Global HUD Scanline Layer */}
      <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.01] scanlines" />
    </div>
  )
}