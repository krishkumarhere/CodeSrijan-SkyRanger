import { useState, useEffect, useRef } from "react"
import { Cpu, Shield, Activity, Target, Clock, AlertCircle, Zap, Radio, Navigation, Camera, Database, Save, ChevronRight } from "lucide-react"

const THERMAL_FEED_URL = `/thermal/stream`
const RESOLUTIONS = ["320x240", "640x480", "1280x720", "1920x1080"]

export default function CameraPage({ telemetry }) {
  const [time, setTime] = useState(new Date())
  const [streamOk, setStreamOk] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [resolution, setResolution] = useState("640x480")
  const [loading, setLoading] = useState(false)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [thermalMode, setThermalMode] = useState(false)
  const [thermalStats, setThermalStats] = useState({ max_temp: 0, avg_temp: 0, hotspots: 0 })
  const [totalDetections, setTotalDetections] = useState(0)

  // Infrastructure Mode & Snapshot States
  const [infrastructureMode, setInfrastructureMode] = useState(false)
  const [snapshotMode, setSnapshotMode] = useState(false)
  const [storedFrames, setStoredFrames] = useState(0)
  const [infraAiData, setInfraAiData] = useState({ detections: [], status: "offline", timestamp: 0 })
  const infraPollingRef = useRef(null)
  const snapshotIntervalRef = useRef(null)

  // AI Detection state - Active by default
  const [aiActive, setAiActive] = useState(true)
  const [aiData, setAiData] = useState({ state: "CLEAR", fps: 0, detections: [], status: "offline", resolution: [640, 480] })
  const aiPollingRef = useRef(null)

  const containerRef = useRef(null)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Poll thermal telemetry when in Thermal Mode
  useEffect(() => {
    if (!thermalMode) return;
    const interval = setInterval(() => {
      fetch(`/thermal/status`)
        .then(r => r.json())
        .then(data => {
          setThermalStats(data)
          if (data.hotspots > 0) {
            setTotalDetections(prev => prev + 1)
          }
        })
        .catch(e => console.error("Thermal Poll Error:", e))
    }, 500)
    return () => clearInterval(interval)
  }, [thermalMode])

  // Fetch Pi camera status and initiate polling if AI is active
  useEffect(() => {
    fetch(`/camera/status`)
      .then(r => r.json())
      .then(d => { setStreaming(d.pi.streaming); setResolution(d.pi.resolution) })
      .catch(() => setStreamOk(false))
  }, [])

  useEffect(() => {
    // If infrastructure mode is ON, we disable edge AI
    if (infrastructureMode) {
      stopPolling()
      startInfraPolling()
    } else {
      stopInfraPolling()
      if (aiActive) startPolling()
    }
    return () => {
      stopPolling()
      stopInfraPolling()
    }
  }, [aiActive, infrastructureMode])

  // Snapshot Engine Mock Logic
  useEffect(() => {
    if (infrastructureMode && snapshotMode && infraAiData.detections.length > 0) {
      if (!snapshotIntervalRef.current) {
        snapshotIntervalRef.current = setInterval(() => {
          setStoredFrames(prev => prev + 1)
        }, 3000)
      }
    } else {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current)
        snapshotIntervalRef.current = null
      }
    }
    return () => {
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current)
    }
  }, [infrastructureMode, snapshotMode, infraAiData.detections])

  function startPolling() {
    stopPolling()
    aiPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/camera/detections`)
        const data = await res.json()
        setAiData(data)
      } catch (e) {
        console.error("AI Poll Error:", e)
      }
    }, 300)
  }

  function stopPolling() {
    if (aiPollingRef.current) {
      clearInterval(aiPollingRef.current)
      aiPollingRef.current = null
    }
  }

  function startInfraPolling() {
    stopInfraPolling()
    infraPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:9000/detections`)
        const data = await res.json()
        setInfraAiData({ ...data, status: "online" })
      } catch (e) {
        setInfraAiData(prev => ({ ...prev, status: "offline" }))
        console.error("Infra AI Poll Error:", e)
      }
    }, 250)
  }

  function stopInfraPolling() {
    if (infraPollingRef.current) {
      clearInterval(infraPollingRef.current)
      infraPollingRef.current = null
    }
  }

  const [serviceOnline, setServiceOnline] = useState(true) // AI Service Health
  const [isToggling, setIsToggling] = useState(false) // Toggle lock

  // 1. Health Monitoring: Periodically check if the AI backend is alive
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/ai/state")
        if (res.ok) {
          const data = await res.json()
          setServiceOnline(true)
          if (typeof data.infrastructure_mode === "boolean" && !isToggling) {
            setInfrastructureMode(data.infrastructure_mode)
          }
        } else {
          setServiceOnline(false)
        }
      } catch (e) {
        setServiceOnline(false)
      }
    }
    const interval = setInterval(checkHealth, 3000)
    checkHealth() // Initial check
    return () => clearInterval(interval)
  }, [isToggling])

  // 2. Verified Toggle handler: Call backend and wait for success confirmation
  const toggleInfrastructureMode = async () => {
    if (!serviceOnline || isToggling) return; // Prevent action if offline or busy

    const newState = !infrastructureMode
    const endpoint = newState ? "/api/ai/infrastructure/enable" : "/api/ai/infrastructure/disable"
    
    try {
      setIsToggling(true)
      const res = await fetch(endpoint, { method: "POST" })
      if (res.ok) {
        const result = await res.json()
        // Verify the backend actually updated the state
        if (result.status === "success" || result.infrastructure_mode === newState) {
          setInfrastructureMode(newState)
        }
      } else {
        throw new Error("Server rejected toggle")
      }
    } catch (e) {
      console.error("AI Control Failure:", e)
      setServiceOnline(false) // Mark as offline on network failure
    } finally {
      setIsToggling(false)
    }
  }

  async function handleResolutionChange(res) {
    setLoading(true); setResolution(res)
    try {
      await fetch(`/camera/stop`, { method: "POST" })
      await new Promise(r => setTimeout(r, 1000))
      await fetch(`/camera/resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: res })
      })
      await new Promise(r => setTimeout(r, 1500))
      setStreamKey(k => k + 1)
      setStreamOk(true)
      setStreaming(true)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const showPiStream = streamOk && streaming && !thermalMode
  const showError = (!streamOk || !streaming) && !thermalMode

  // Bounding Box Scaling Logic
  const renderBBoxes = () => {
    const isInfra = infrastructureMode;
    const currentData = isInfra ? infraAiData : aiData;
    const isActive = isInfra ? (infrastructureMode && infraAiData.status === "online") : aiActive;

    if (!isActive || !currentData.detections || !containerRef.current) return null;

    // Use default res for scaling if not provided by backend
    const [srcW, srcH] = (isInfra ? [640, 480] : (currentData.resolution || [640, 480]));
    const { offsetWidth: displayW, offsetHeight: displayH } = containerRef.current;

    const scaleX = displayW / srcW;
    const scaleY = displayH / srcH;

    return currentData.detections.map((det, i) => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = (x2 - x1) * scaleX;
      const height = (y2 - y1) * scaleY;
      const left = x1 * scaleX;
      const top = y1 * scaleY;

      let borderColor = "border-blue-500";
      let bgColor = "bg-blue-500/10";

      if (isInfra) {
        const infraStyles = {
          crack: "border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.3)]",
          rust: "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)]",
          corrosion: "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)]",
          spalling: "border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]",
          water_leakage: "border-magenta-500 bg-magenta-500/10 shadow-[0_0_15px_rgba(255,0,255,0.3)]"
        };
        borderColor = infraStyles[det.label] || "border-cyan-500";
      } else {
        const zoneColors = {
          CLEAR: "border-green-500 bg-green-500/10",
          WARN: "border-yellow-500 bg-yellow-500/10",
          ALERT: "border-orange-500 bg-orange-500/10",
          DANGER: "border-red-500 bg-red-500/10"
        };
        borderColor = zoneColors[det.zone] || "border-blue-500";
      }

      return (
        <div
          key={i}
          className={`absolute border-2 ${borderColor} transition-all duration-300`}
          style={{ left, top, width, height }}
        >
          <div className={`absolute -top-6 left-0 px-2 py-0.5 bg-black/80 text-white font-mono text-[10px] font-black uppercase whitespace-nowrap border-l-2 ${borderColor.split(' ')[0]}`}>
            {det.label} {(det.confidence ? (det.confidence * 100).toFixed(0) : (det.conf * 100).toFixed(0))}%
          </div>
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-inherit" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-inherit" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-inherit" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-inherit" />
        </div>
      );
    });
  };

  const getRiskColor = (state) => {
    switch (state) {
      case "DANGER": return "text-red-500 border-red-500 bg-red-500/10";
      case "ALERT": return "text-orange-500 border-orange-500 bg-orange-500/10";
      case "WARN": return "text-yellow-500 border-yellow-500 bg-yellow-500/10";
      default: return "text-green-500 border-green-500 bg-green-500/10";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#020617] relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative z-10">
        {/* Feed Area - Redesigned HUD Shell */}
        <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center p-4 lg:p-8">
          <div
            ref={containerRef}
            className={`w-full h-full relative rounded-[2.5rem] overflow-hidden border transition-all duration-700 shadow-2xl group/feed ${aiData.state === "DANGER" ? "border-red-500 ring-4 ring-red-500/20" : "border-blue-500/20"}`}
          >

            {/* HUD Overlays */}
            <div className="absolute inset-0 pointer-events-none z-[10] transition-opacity">
              {/* Corner Brackets */}
              <div className="absolute top-10 left-10 w-16 h-16 border-t-2 border-l-2 border-blue-500/30 transition-all group-hover/feed:border-blue-500/60" />
              <div className="absolute top-10 right-10 w-16 h-16 border-t-2 border-r-2 border-blue-500/30 transition-all group-hover/feed:border-blue-500/60" />
              <div className="absolute bottom-10 left-10 w-16 h-16 border-b-2 border-l-2 border-blue-500/30 transition-all group-hover/feed:border-blue-500/60" />
              <div className="absolute bottom-10 right-10 w-16 h-16 border-b-2 border-r-2 border-blue-500/30 transition-all group-hover/feed:border-blue-500/60" />

              {/* Center Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <div className="absolute w-full h-px bg-white/20" />
                  <div className="absolute h-full w-px bg-white/20" />
                  <div className="w-10 h-10 border border-white/20 rounded-full" />
                </div>
              </div>
            </div>

            {/* Tactical FPV PIP Overlay */}
            {!thermalMode && (
              <div className="absolute bottom-10 right-10 w-64 h-40 z-[40] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] bg-black group/pip animate-in slide-in-from-right-8 duration-700">
                <div className="absolute top-2 left-3 z-[10] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-mono text-[8px] text-cyan-400 font-black uppercase tracking-widest">FPV_FEED_LIVE</span>
                </div>
                <iframe 
                  src="/fpv/stream.html?src=fpv"
                  className="w-full h-full border-none pointer-events-none"
                  allow="autoplay; fullscreen"
                />
                <div className="absolute inset-0 border-2 border-cyan-500/20 pointer-events-none" />
                <div className="absolute inset-0 scanlines opacity-[0.05] pointer-events-none" />
              </div>
            )}

            {/* Main Stream Display */}
            <div className="w-full h-full bg-[#04070d] relative overflow-hidden">
              {showPiStream && (
                <img key={streamKey} className="w-full h-full object-cover lg:object-contain bg-black" crossOrigin="anonymous" src={`/stream/pi?k=${streamKey}`} alt="Pi Feed" onError={() => { if (streaming) setStreamOk(false) }} />
              )}

              {thermalMode && (
                <img className="w-full h-full object-cover lg:object-contain bg-black" src={THERMAL_FEED_URL} alt="Thermal Feed" />
              )}

              {/* AI Overlay Layer */}
              {(aiActive || infrastructureMode) && !thermalMode && (
                <div className="absolute inset-0 z-[20]">
                  {renderBBoxes()}
                </div>
              )}

              {/* HUD Dynamic Data */}
              {showPiStream && (
                <div className="absolute inset-0 pointer-events-none z-[25] p-10 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex flex-col">
                        <span className="font-mono text-[8px] text-blue-500/60 uppercase font-bold tracking-widest">Altitude_AGL</span>
                        <span className="font-outfit text-xl font-black text-white">{telemetry?.alt?.toFixed(1) ?? "0.0"} M</span>
                      </div>
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex flex-col">
                        <span className="font-mono text-[8px] text-amber-500/60 uppercase font-bold tracking-widest">Velocity_VEC</span>
                        <span className="font-outfit text-xl font-black text-white">{telemetry?.vx?.toFixed(1) ?? "0.0"} M/S</span>
                      </div>
                    </div>

                    {/* AI HUD Stats & FPS Meter */}
                    <div className="flex flex-col items-center gap-2">
                      <div className={`px-6 py-2 rounded-2xl border backdrop-blur-xl font-mono text-xs font-black tracking-[0.2em] animate-in slide-in-from-top-4 duration-500 ${infrastructureMode ? (infraAiData.status === "online" ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" : "text-red-500 border-red-500 bg-red-500/10") : getRiskColor(aiData.state)}`}>
                        {infrastructureMode ? (infraAiData.status === "online" ? "INFRASTRUCTURE_ACTIVE" : "AI_LINK_LOST") : `AI_STATE: ${aiData.state}`}
                      </div>
                      <div className="bg-black/60 border border-white/5 px-3 py-1 rounded-xl font-mono text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Activity size={10} className="animate-pulse" />
                        AI_LATENCY: {infrastructureMode ? (infraAiData.status === "online" ? "42ms" : "---") : `${aiData.fps} FPS`}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex flex-col">
                        <span className="font-mono text-[8px] text-gray-500 uppercase font-bold tracking-widest">Temporal_ID</span>
                        <span className="font-mono text-xs font-black text-white uppercase">{time.toLocaleTimeString([], { hour12: false })}</span>
                      </div>
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex flex-col items-end">
                        <span className="font-mono text-[8px] text-green-500/60 uppercase font-bold tracking-widest">Link_Quality</span>
                        <span className="font-mono text-xs font-black text-green-500 uppercase tracking-widest">98.5% STABLE</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-2">
                      <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl backdrop-blur-md transition-all ${infrastructureMode ? "bg-cyan-500/20 border-cyan-500/30" : (aiData.state === "DANGER" ? "bg-red-600 border-red-500 animate-pulse shadow-[0_0_20px_#ef4444]" : "bg-blue-500/20 border-blue-500/30")}`}>
                        <div className={`w-2 h-2 rounded-full ${infrastructureMode ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : (aiData.state === "DANGER" ? "bg-white" : "bg-blue-500 shadow-[0_0_10px_#3b82f6]")}`} />
                        <span className="font-mono text-[10px] font-black text-white tracking-[0.2em] uppercase">
                          {infrastructureMode ? "INFRASTRUCTURE_INSPECTION_ACTIVE" : "AI_SURVEILLANCE_ACTIVE"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-black/60 border border-white/5 px-6 py-2 rounded-full backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Cpu size={12} className="text-blue-500" />
                        <span className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-widest">{infrastructureMode ? "REMOTE_AI_NODE" : "SONY_IMX708"}</span>
                      </div>
                      <div className="w-px h-3 bg-white/10" />
                      <span className="font-mono text-[9px] text-blue-400 font-bold uppercase tracking-widest">{resolution} @ 30FPS</span>
                    </div>
                  </div>

                  {/* Infrastructure Mode Banner */}
                  {infrastructureMode && (
                    <div className="absolute top-1/2 left-6 -translate-y-1/2 z-[30] pointer-events-none">
                      <div className="flex items-center gap-4 bg-[#0891b2]/20 border border-cyan-500/40 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-black text-white tracking-[0.2em] uppercase">INFRASTRUCTURE_INSPECTION_ACTIVE</span>
                          <span className="font-mono text-[7px] text-cyan-400/60 uppercase font-bold tracking-widest">High_Throughput_Pipeline_Running</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Infrastructure Target HUD */}
                  {infrastructureMode && infraAiData.status === "online" && (
                    <div className="absolute top-40 right-10 z-[50] w-64 bg-[#070b14]/90 border border-cyan-500/30 backdrop-blur-2xl p-6 rounded-[2rem] animate-in slide-in-from-right-8 duration-700 pointer-events-auto">
                      <div className="font-mono text-[9px] text-cyan-500/60 uppercase font-black tracking-[0.2em] mb-4">Inspection Targets</div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-gray-500 uppercase">Active Faults</span>
                          <span className="font-outfit text-2xl font-black text-white">{infraAiData.detections.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(infraAiData.detections.map(d => d.label))).map(label => (
                            <span key={label} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-md font-mono text-[8px] text-cyan-400 uppercase font-bold">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Alert Center Banner */}
              {aiData.state === "DANGER" && !infrastructureMode && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[30] pointer-events-none">
                  <div className="bg-red-600 border-2 border-white/50 backdrop-blur-2xl px-12 py-8 rounded-[2rem] flex flex-col items-center gap-4 animate-pulse shadow-[0_0_100px_rgba(239,68,68,0.5)]">
                    <div className="relative">
                      <AlertCircle className="text-white" size={64} />
                    </div>
                    <span className="font-outfit text-3xl font-black text-white tracking-[0.3em] uppercase text-center drop-shadow-lg">COLLISION_AVOIDANCE</span>
                    <span className="font-mono text-xs text-white/80 uppercase font-black tracking-widest">IMMEDIATE ACTION REQUIRED</span>
                  </div>
                </div>
              )}

              {/* Scanline Overlay */}
              <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.03] scanlines" />
            </div>

            {/* Thermal Analytics Panel - Real-time Data */}
            {thermalMode && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[50] flex gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Max Temp Card */}
                <div className="bg-[#070b14]/90 border border-amber-500/30 backdrop-blur-2xl px-8 py-5 rounded-[2rem] flex flex-col gap-1 min-w-[160px] shadow-[0_0_40px_rgba(245,158,11,0.05)] relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
                  <span className="font-mono text-[9px] text-amber-500/60 uppercase font-black tracking-[0.2em] relative z-10">Thermal_Peak</span>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="font-outfit text-3xl font-black text-white">{thermalStats.max_temp.toFixed(1)}</span>
                    <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-widest">°C</span>
                  </div>
                </div>

                {/* Avg Temp Card */}
                <div className="bg-[#070b14]/90 border border-blue-500/30 backdrop-blur-2xl px-8 py-5 rounded-[2rem] flex flex-col gap-1 min-w-[160px] shadow-[0_0_40px_rgba(59,130,246,0.05)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                  <span className="font-mono text-[9px] text-blue-500/60 uppercase font-black tracking-[0.2em] relative z-10">Ambient_Mean</span>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="font-outfit text-3xl font-black text-white">{thermalStats.avg_temp.toFixed(1)}</span>
                    <span className="font-mono text-xs text-blue-500 font-bold uppercase tracking-widest">°C</span>
                  </div>
                </div>

                {/* Hotspot/Detection Card */}
                <div className={`bg-[#070b14]/90 border backdrop-blur-2xl px-8 py-5 rounded-[2rem] flex flex-col gap-1 min-w-[200px] relative overflow-hidden transition-all duration-500 ${thermalStats.hotspots > 0 ? "border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.2)]" : "border-white/10 shadow-none"}`}>
                  <div className={`absolute inset-0 transition-opacity duration-500 ${thermalStats.hotspots > 0 ? "bg-red-500/10 opacity-100" : "opacity-0"}`} />
                  <span className={`font-mono text-[9px] uppercase font-black tracking-[0.2em] relative z-10 ${thermalStats.hotspots > 0 ? "text-red-500 animate-pulse" : "text-gray-500"}`}>
                    {thermalStats.hotspots > 0 ? "!!!_HOTSPOT_DETECTED_!!!" : "No_Thermal_Anomalies"}
                  </span>
                  <div className="flex items-center justify-between relative z-10 mt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-outfit text-3xl font-black text-white">{totalDetections}</span>
                      <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-widest">Total_Events</span>
                    </div>
                    {thermalStats.hotspots > 0 && (
                      <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center animate-ping">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {showError && (
              <div className="absolute inset-0 z-[40] bg-[#020617] flex flex-col items-center justify-center gap-6">
                <div className="font-outfit text-5xl font-black text-gray-800 tracking-[0.2em] opacity-30 italic">NO SIGNAL</div>
                <div className="flex flex-col items-center gap-4">
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Primary video downlink severed</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Cleaned Up */}
        <div className="w-full lg:w-[320px] xl:w-[360px] h-auto lg:h-full bg-[#070b14]/60 border-l border-blue-500/10 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-10 backdrop-blur-xl relative">
          <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />

          <section>
            <div className="font-mono text-[9px] tracking-[0.25em] text-cyan-500/60 uppercase font-black mb-4 px-2">AI Engine</div>
            <button
              onClick={toggleInfrastructureMode}
              disabled={!serviceOnline || isToggling}
              className={`w-full py-4 px-6 rounded-2xl border flex items-center justify-between transition-all duration-500 ${!serviceOnline ? "opacity-50 grayscale cursor-not-allowed border-red-500/20 bg-red-500/5 text-red-400" : infrastructureMode ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/5"}`}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">
                  {!serviceOnline ? "AI Server Offline" : "Infrastructure Mode"}
                </span>
                <span className={`font-mono text-[8px] opacity-60 uppercase ${!serviceOnline ? "text-red-500" : ""}`}>
                  {isToggling ? "VERIFYING_MODE..." : !serviceOnline ? "CONNECTION_LOST" : infrastructureMode ? "INSPECTION_PIPELINE_READY" : "SYSTEM_STANDBY"}
                </span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${!serviceOnline ? "bg-red-900/40" : infrastructureMode ? "bg-cyan-500" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${infrastructureMode ? "left-6" : "left-1"} ${isToggling ? "animate-pulse" : ""}`} />
              </div>
            </button>
            {infrastructureMode && serviceOnline && (
              <div className="mt-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle size={12} className="text-amber-500" />
                <span className="font-mono text-[8px] text-amber-500 uppercase font-bold tracking-widest">EDGE_OBJECT_DETECTION_DISABLED</span>
              </div>
            )}
            {!serviceOnline && (
              <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                <Info size={12} className="text-red-500" />
                <span className="font-mono text-[8px] text-red-500 uppercase font-bold tracking-widest">Verify AI server on laptop</span>
              </div>
            )}
          </section>

          {infrastructureMode ? (
            <section className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <Camera size={16} className="text-cyan-500" />
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-white">Snapshot Engine</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-white uppercase font-black">Enable Snapshots</span>
                    <span className="font-mono text-[7px] text-gray-500 uppercase tracking-widest">Capture_Frames_For_Offline_Analysis</span>
                  </div>
                  <button
                    onClick={() => setSnapshotMode(!snapshotMode)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${snapshotMode ? "bg-cyan-500" : "bg-white/10"}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${snapshotMode ? "left-4.5" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Database size={14} className="text-gray-500" />
                    <span className="font-mono text-[9px] text-gray-500 uppercase font-bold">Stored_Frames</span>
                  </div>
                  <span className="font-outfit text-lg font-black text-white">{storedFrames}</span>
                </div>

                <button
                  disabled
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-mono text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] cursor-not-allowed"
                >
                  <Save size={12} />
                  Download Dataset
                </button>
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Shield size={16} className={aiData.state === "DANGER" ? "text-red-500" : "text-blue-500"} />
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-white">Detection Matrix</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center px-4 py-3 bg-black/40 border border-white/5 rounded-xl">
                  <span className="font-mono text-[9px] text-gray-500 uppercase font-bold">Threat level</span>
                  <span className={`font-outfit text-sm font-black uppercase ${getRiskColor(aiData.state).split(' ')[0]}`}>{aiData.state}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-black/40 border border-white/5 rounded-xl">
                  <span className="font-mono text-[9px] text-gray-500 uppercase font-bold">Active Objects</span>
                  <span className="font-outfit text-lg font-black text-blue-400">{aiData.detections?.length ?? 0}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${aiData.state === "DANGER" ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-blue-500"}`} style={{ width: aiData.detections?.length > 0 ? "100%" : "0%" }} />
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="font-mono text-[9px] tracking-[0.25em] text-blue-500/60 uppercase font-black mb-4 px-2">Output Stream</div>
            <div className="grid grid-cols-1 gap-3">
              {RESOLUTIONS.map(res => (
                <button
                  key={res}
                  onClick={() => handleResolutionChange(res)}
                  disabled={loading || !streaming || thermalMode}
                  className={`py-3 px-4 rounded-xl border font-mono text-[10px] font-bold tracking-tight transition-all duration-300 text-left flex justify-between items-center ${resolution === res && !thermalMode ? "bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-lg" : "bg-white/[0.02] border-transparent text-gray-600 hover:bg-white/5 hover:text-gray-400"}`}
                >
                  {res}
                  {resolution === res && !thermalMode && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="font-mono text-[9px] tracking-[0.25em] text-amber-500/60 uppercase font-black mb-4 px-2">Thermal Engine</div>
            <button
              onClick={() => setThermalMode(!thermalMode)}
              className={`w-full py-4 px-6 rounded-2xl border flex items-center justify-between transition-all duration-500 ${thermalMode ? "bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/5"}`}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">Thermal Mode</span>
                <span className="font-mono text-[8px] opacity-60 uppercase">{thermalMode ? "SENSOR_ONLINE" : "SENSOR_STANDBY"}</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${thermalMode ? "bg-amber-500" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${thermalMode ? "left-6" : "left-1"}`} />
              </div>
            </button>
          </section>

          <section className="mt-auto pt-8 border-t border-white/5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500 uppercase tracking-widest">Processing</span>
                <span className={`font-black tracking-widest transition-colors duration-500 ${infrastructureMode ? "text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "text-blue-500"}`}>
                  {infrastructureMode ? "REMOTE_INSPECTION_NODE" : "EDGE_AI_CORE"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500 uppercase tracking-widest">Model</span>
                <span className={`font-black tracking-widest text-[9px] transition-colors duration-500 ${infrastructureMode ? "text-cyan-100" : "text-white"}`}>
                  {infrastructureMode ? "infra_yolov8n.pt" : "YOLOv8n_V4.1"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500 uppercase tracking-widest">Hardware</span>
                <span className="text-white font-black tracking-widest text-[9px]">BCM2712_PI5</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}