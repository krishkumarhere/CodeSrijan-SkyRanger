import { useState, useEffect, useRef } from "react"
import { Cpu, Shield, Activity, Target, Clock, AlertCircle, Zap, Radio, Navigation } from "lucide-react"

const THERMAL_FEED_URL = `/stream/thermal/stream`
const RESOLUTIONS = ["320x240", "640x480", "1280x720", "1920x1080"]

export default function CameraPage({ telemetry }) {
  const [time, setTime] = useState(new Date())
  const [streamOk, setStreamOk] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [resolution, setResolution] = useState("640x480")
  const [loading, setLoading] = useState(false)
  const [streamKey, setStreamKey] = useState(Date.now())

  // AI Detection state - Active by default as requested
  const [aiActive, setAiActive] = useState(true)
  const [aiData, setAiData] = useState({ state: "CLEAR", fps: 0, detections: [], status: "offline", resolution: [640, 480] })
  const aiPollingRef = useRef(null)
  const containerRef = useRef(null)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch Pi camera status and initiate polling if AI is active
  useEffect(() => {
    fetch(`/stream/camera/status`)
      .then(r => r.json())
      .then(d => { setStreaming(d.streaming); setResolution(d.resolution) })
      .catch(() => setStreamOk(false))
  }, [])

  useEffect(() => {
    if (aiActive) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [aiActive])

  function startPolling() {
    stopPolling()
    aiPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/latest`)
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

  async function handleResolutionChange(res) {
    setLoading(true); setResolution(res)
    try {
      await fetch(`/stream/camera/stop`, { method: "POST" })
      await new Promise(r => setTimeout(r, 1000))
      await fetch(`/stream/camera/resolution`, {
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

  const showPiStream = streamOk && streaming
  const showError = !streamOk || !streaming

  // Bounding Box Scaling Logic
  const renderBBoxes = () => {
    if (!aiActive || !aiData.detections || !containerRef.current || !aiData.resolution) return null;

    const [srcW, srcH] = aiData.resolution;
    const { offsetWidth: displayW, offsetHeight: displayH } = containerRef.current;

    const scaleX = displayW / srcW;
    const scaleY = displayH / srcH;

    return aiData.detections.map((det, i) => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = (x2 - x1) * scaleX;
      const height = (y2 - y1) * scaleY;
      const left = x1 * scaleX;
      const top = y1 * scaleY;

      const colors = {
        CLEAR: "border-green-500",
        WARN: "border-yellow-500",
        ALERT: "border-orange-500",
        DANGER: "border-red-500"
      };

      return (
        <div 
          key={i}
          className={`absolute border-2 ${colors[det.zone] || "border-blue-500"} transition-all duration-300`}
          style={{ left, top, width, height }}
        >
          <div className={`absolute -top-6 left-0 px-2 py-0.5 ${det.zone === "DANGER" ? "bg-red-600" : "bg-black/80"} text-white font-mono text-[10px] font-black uppercase whitespace-nowrap`}>
            {det.label} {(det.conf * 100).toFixed(0)}%
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

            {/* Main Stream Display */}
            <div className="w-full h-full bg-[#04070d] relative overflow-hidden">
              {showPiStream && (
                <img key={streamKey} className="w-full h-full object-cover lg:object-contain bg-black" crossOrigin="anonymous" src={`/stream/stream?k=${streamKey}`} alt="Pi Feed" onError={() => { if (streaming) setStreamOk(false) }} />
              )}

              {/* AI Overlay Layer */}
              {aiActive && (
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
                      <div className={`px-6 py-2 rounded-2xl border backdrop-blur-xl font-mono text-xs font-black tracking-[0.2em] animate-in slide-in-from-top-4 duration-500 ${getRiskColor(aiData.state)}`}>
                        AI_STATE: {aiData.state}
                      </div>
                      <div className="bg-black/60 border border-white/5 px-3 py-1 rounded-xl font-mono text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Activity size={10} className="animate-pulse" />
                        AI_LATENCY: {aiData.fps} FPS
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
                      <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl backdrop-blur-md transition-all ${aiData.state === "DANGER" ? "bg-red-600 border-red-500 animate-pulse shadow-[0_0_20px_#ef4444]" : "bg-blue-500/20 border-blue-500/30"}`}>
                        <div className={`w-2 h-2 rounded-full ${aiData.state === "DANGER" ? "bg-white" : "bg-blue-500"} shadow-[0_0_10px_currentColor]`} />
                        <span className="font-mono text-[10px] font-black text-white tracking-[0.2em] uppercase">
                          AI_SURVEILLANCE_ACTIVE
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-black/60 border border-white/5 px-6 py-2 rounded-full backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Cpu size={12} className="text-blue-500" />
                        <span className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-widest">SONY_IMX708</span>
                      </div>
                      <div className="w-px h-3 bg-white/10" />
                      <span className="font-mono text-[9px] text-blue-400 font-bold uppercase tracking-widest">{resolution} @ 30FPS</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Alert Center Banner */}
              {aiData.state === "DANGER" && (
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

          <section>
            <div className="font-mono text-[9px] tracking-[0.25em] text-blue-500/60 uppercase font-black mb-4 px-2">Output Stream</div>
            <div className="grid grid-cols-1 gap-3">
              {RESOLUTIONS.map(res => (
                <button
                  key={res}
                  onClick={() => handleResolutionChange(res)}
                  disabled={loading || !streaming}
                  className={`py-3 px-4 rounded-xl border font-mono text-[10px] font-bold tracking-tight transition-all duration-300 text-left flex justify-between items-center ${resolution === res ? "bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-lg" : "bg-white/[0.02] border-transparent text-gray-600 hover:bg-white/5 hover:text-gray-400"}`}
                >
                  {res}
                  {resolution === res && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-auto pt-8 border-t border-white/5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500 uppercase tracking-widest">Processing</span>
                <span className="text-blue-500 font-black tracking-widest">EDGE_AI_CORE</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500 uppercase tracking-widest">Model</span>
                <span className="text-white font-black tracking-widest text-[9px]">YOLOv8n_V4.1</span>
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