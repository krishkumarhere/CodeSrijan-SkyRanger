import { useState, useEffect, useRef, useMemo } from "react"
import { 
  Cpu, Shield, Activity, Target, Clock, AlertCircle, Zap, Radio, Navigation, 
  Camera, Database, Save, ChevronRight, Info, CheckCircle, FileText, Download, 
  Loader2, RefreshCw, BarChart3, ShieldCheck, AlertTriangle
} from "lucide-react"

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

  // AI Infrastructure & Grid States
  const [infrastructureMode, setInfrastructureMode] = useState(false)
  const [powerlineMode, setPowerlineMode] = useState(false)
  const [snapshotMode, setSnapshotMode] = useState(false)
  const [storedFrames, setStoredFrames] = useState(0)
  const [infraAiData, setInfraAiData] = useState({ detections: [], status: "offline", timestamp: 0 })
  const infraPollingRef = useRef(null)
  const snapshotIntervalRef = useRef(null)

  // AI Detection state - Active by default
  const [aiActive, setAiActive] = useState(true)
  const [aiData, setAiData] = useState({ state: "CLEAR", fps: 0, detections: [], status: "offline", resolution: [640, 480] })
  const aiPollingRef = useRef(null)

  // AI Monitoring System State
  const [pipelineStatus, setPipelineStatus] = useState("INACTIVE") // INACTIVE, INITIALIZING, ONLINE, OFFLINE
  const [lastHeartbeat, setLastHeartbeat] = useState(0)
  
  const containerRef = useRef(null)

  // Report Generation States
  const [reportState, setReportState] = useState("idle") // idle, generating, success, error
  const [reportProgress, setReportProgress] = useState(0)
  const [reportMessageIndex, setReportMessageIndex] = useState(0)
  const [reportResult, setReportResult] = useState(null)
  const [reportError, setReportError] = useState(null)

  const reportMessages = [
    "Initializing Mission Replay...",
    "Loading Structural Scan Data...",
    "Running AI Defect Analysis...",
    "Generating Engineering Summary...",
    "Building Inspection Report...",
    "Finalizing PDF Artifact...",
  ]

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
    // Pipeline Status Orchestration
    if (infrastructureMode || powerlineMode) {
      setPipelineStatus("INITIALIZING")
    } else {
      setPipelineStatus("INACTIVE")
    }

    if (infrastructureMode) {
      stopPolling()
      startInfraPolling()
    } else {
      stopInfraPolling()
      if (aiActive || powerlineMode) startPolling()
    }
    return () => {
      stopPolling()
      stopInfraPolling()
    }
  }, [aiActive, infrastructureMode, powerlineMode])

  // Evidence Acquisition Mock Logic
  useEffect(() => {
    const hasDetections = infrastructureMode 
      ? (infraAiData?.detections?.length > 0) 
      : (powerlineMode ? (aiData?.detections?.length > 0) : false);

    if ((infrastructureMode || powerlineMode) && snapshotMode && hasDetections) {
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
  }, [infrastructureMode, powerlineMode, snapshotMode, infraAiData.detections, aiData.detections])

  function startPolling() {
    stopPolling()
    aiPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/latest`)
        if (!res.ok) throw new Error("AI Backend Offline")
        const data = await res.json()
        setAiData(data)
        
        // Compute Grid/Edge Pipeline Health
        if (powerlineMode || aiActive) {
          if (data.heartbeat_valid) {
            setPipelineStatus("ONLINE")
            setLastHeartbeat(Date.now())
          } else if (Date.now() - new Date(data.timestamp).getTime() > 5000) {
            setPipelineStatus("OFFLINE")
          }
        }
      } catch (e) {
        console.error("AI Poll Error:", e)
        setAiData(prev => ({ ...prev, status: "offline", state: "OFFLINE" }))
        if (powerlineMode) setPipelineStatus("OFFLINE")
      }
    }, 1000)
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
        
        // Compute Integrity Pipeline Health
        const ts = typeof data.timestamp === "number" ? data.timestamp * 1000 : new Date(data.timestamp).getTime()
        if (Date.now() - ts < 3000) {
          setPipelineStatus("ONLINE")
          setLastHeartbeat(Date.now())
        } else {
          setPipelineStatus("OFFLINE")
        }
      } catch (e) {
        setInfraAiData(prev => ({ ...prev, status: "offline" }))
        setPipelineStatus("OFFLINE")
        console.error("Infra AI Poll Error:", e)
      }
    }, 500)
  }

  function stopInfraPolling() {
    if (infraPollingRef.current) {
      clearInterval(infraPollingRef.current)
      infraPollingRef.current = null
    }
  }

  const [serviceOnline, setServiceOnline] = useState(true) // AI Service Health
  const [isToggling, setIsToggling] = useState(false) // Toggle lock

  // 1. Health Monitoring: Periodically check if the AI backend is alive and sync state
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/ai/state")
        if (res.ok) {
          const data = await res.json()
          setServiceOnline(true)
          
          // Only update local state from backend if we aren't in the middle of a toggle
          if (!isToggling) {
            if (typeof data.infrastructure_mode === "boolean") {
              setInfrastructureMode(data.infrastructure_mode)
            }
            if (typeof data.powerline_mode === "boolean") {
              setPowerlineMode(data.powerline_mode)
            }
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

  // 2. AI Mode Toggle Handlers with Mutual Exclusion
  const toggleInfrastructureMode = async () => {
    if (!serviceOnline || isToggling) return;

    const newState = !infrastructureMode
    const endpoint = newState ? "/api/ai/infrastructure/enable" : "/api/ai/infrastructure/disable"
    
    try {
      setIsToggling(true)
      const res = await fetch(endpoint, { method: "POST" })
      if (res.ok) {
        const result = await res.json()
        if (result.success || result.infrastructure_mode === newState) {
          setInfrastructureMode(newState)
          // Mutual Exclusion: If enabling infrastructure, visually disable powerline
          if (newState) setPowerlineMode(false)
        }
      } else {
        throw new Error("Server rejected toggle")
      }
    } catch (e) {
      console.error("AI Control Failure:", e)
      setServiceOnline(false)
    } finally {
      setIsToggling(false)
    }
  }

  const togglePowerlineMode = async () => {
    if (!serviceOnline || isToggling) return;

    const newState = !powerlineMode
    const endpoint = newState ? "/api/ai/powerline/enable" : "/api/ai/powerline/disable"
    
    try {
      setIsToggling(true)
      const res = await fetch(endpoint, { method: "POST" })
      if (res.ok) {
        const result = await res.json()
        if (result.success || result.powerline_mode === newState) {
          setPowerlineMode(newState)
          // Mutual Exclusion: If enabling powerline, visually disable infrastructure
          if (newState) setInfrastructureMode(false)
        }
      } else {
        throw new Error("Server rejected toggle")
      }
    } catch (e) {
      console.error("AI Control Failure:", e)
      setServiceOnline(false)
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

  const handleGenerateReport = async () => {
    setReportState("generating")
    setReportProgress(0)
    setReportMessageIndex(0)
    setReportResult(null)
    setReportError(null)

    // Start progress and message cycles
    const progressInterval = setInterval(() => {
      setReportProgress(prev => (prev < 90 ? prev + Math.floor(Math.random() * 15) : 90))
    }, 2000)

    const messageInterval = setInterval(() => {
      setReportMessageIndex(prev => (prev + 1) % reportMessages.length)
    }, 3500)

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "generate" }),
      })

      if (!response.ok) throw new Error("Report generation failed")
      const data = await response.json()

      if (data.success) {
        setReportProgress(100)
        setReportResult(data)
        setReportState("success")
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (err) {
      console.error("Report Error:", err)
      setReportError(err.message)
      setReportState("error")
    } finally {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
    }
  }

  const showPiStream = streamOk && streaming && !thermalMode
  const showError = (!streamOk || !streaming) && !thermalMode

  // Bounding Box Scaling Logic
  const renderBBoxes = () => {
    const isInfra = infrastructureMode;
    const isPower = powerlineMode;
    // Infrastructure uses local port 9000 polling (infraAiData)
    // Powerline and Default AI use /api/ai/latest (aiData)
    const currentData = isInfra ? infraAiData : aiData;
    const isActive = isInfra 
      ? (infrastructureMode && infraAiData.status === "online") 
      : (isPower || aiActive) && aiData.state !== "OFFLINE";

    if (!isActive || !currentData.detections || !containerRef.current) return null;

    // Use default res for scaling (640x480)
    const [srcW, srcH] = [640, 480];
    const { offsetWidth: displayW, offsetHeight: displayH } = containerRef.current;

    const scaleX = displayW / srcW;
    const scaleY = displayH / srcH;

    return currentData.detections.map((det, i) => {
      const [x1, y1, x2, y2] = det.bbox || [0, 0, 0, 0];
      const width = (x2 - x1) * scaleX;
      const height = (y2 - y1) * scaleY;
      const left = x1 * scaleX;
      const top = y1 * scaleY;

      // Force RED for all detections as per user request ("red box if detected")
      const borderColor = "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
      const textColor = "text-white bg-red-600";

      return (
        <div
          key={i}
          className={`absolute border-2 ${borderColor} animate-pulse transition-all duration-300`}
          style={{ left, top, width, height }}
        >
          {/* Targeting Brackets */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-red-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-red-400" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-red-400" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-red-400" />

          {/* Target Label */}
          <div className={`absolute -top-6 left-0 px-2 py-0.5 ${textColor} font-mono text-[9px] font-black uppercase whitespace-nowrap flex items-center gap-1`}>
            <Target size={10} className="animate-spin" />
            {det.label} {det.confidence ? (det.confidence * 100).toFixed(0) : "0"}%
          </div>
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

  const renderStatusAlert = () => {
    if (pipelineStatus === "INACTIVE") return (
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        <span className="font-mono text-[9px] font-black text-gray-500 uppercase tracking-widest">No Active Model</span>
      </div>
    );
    
    if (pipelineStatus === "INITIALIZING") return (
      <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 px-4 py-1.5 rounded-full backdrop-blur-md animate-pulse">
        <Activity size={10} className="text-yellow-500 animate-spin" />
        <span className="font-mono text-[9px] font-black text-yellow-500 uppercase tracking-widest">Initializing AI Pipeline</span>
      </div>
    );

    if (pipelineStatus === "OFFLINE") return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-red-600 border border-red-400 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-bounce">
          <AlertCircle size={14} className="text-white" />
          <span className="font-mono text-[10px] font-black text-white uppercase tracking-widest">{infrastructureMode ? "Asset Integrity" : "Grid Analysis"} Model Offline</span>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-lg border border-red-500/20">
          <span className="font-mono text-[8px] text-red-400 uppercase tracking-widest">Inference server may be unreachable</span>
        </div>
      </div>
    );

    return (
      <div className="flex items-center gap-3 bg-green-500/20 border border-green-500/40 px-5 py-2 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(34,197,94,0.1)]">
        <CheckCircle size={12} className="text-green-500" />
        <span className="font-mono text-[10px] font-black text-green-500 uppercase tracking-widest">{infrastructureMode ? "Asset Integrity" : "Grid Analysis"} Model Online</span>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#020617] relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative z-10">
        {/* Feed Area - Redesigned HUD Shell */}
        <div className="h-[45vh] sm:h-[55vh] lg:h-full lg:flex-1 relative bg-black overflow-hidden flex items-center justify-center p-2 sm:p-4 lg:p-8">
          <div
            ref={containerRef}
            className={`w-full h-full relative rounded-2xl sm:rounded-[2.5rem] overflow-hidden border transition-all duration-700 shadow-2xl group/feed ${aiData.state === "DANGER" ? "border-red-500 ring-4 ring-red-500/20" : pipelineStatus === "OFFLINE" ? "border-red-600 ring-4 ring-red-900/20 shadow-[inset_0_0_100px_rgba(220,38,38,0.1)]" : "border-blue-500/20"}`}
          >
            {/* Status Alert Overlay */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
              {renderStatusAlert()}
            </div>

            {pipelineStatus === "OFFLINE" && (
              <div className="absolute inset-0 z-[90] pointer-events-none border-[12px] border-red-600/10 animate-pulse" />
            )}

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
              <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 w-32 h-20 sm:w-64 sm:h-40 z-[40] rounded-xl sm:rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] bg-black group/pip animate-in slide-in-from-right-8 duration-700">
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
              {(aiActive || infrastructureMode || powerlineMode) && !thermalMode && (
                <div className="absolute inset-0 z-[20]">
                  {renderBBoxes()}
                </div>
              )}

              {/* HUD Dynamic Data */}
              {showPiStream && (
                <div className="absolute inset-0 pointer-events-none z-[25] p-4 sm:p-10 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 sm:gap-2">
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-2xl flex flex-col">
                        <span className="font-mono text-[6px] sm:text-[8px] text-blue-500/60 uppercase font-bold tracking-widest leading-none">Altitude</span>
                        <span className="font-outfit text-sm sm:text-xl font-black text-white">{telemetry?.alt?.toFixed(1) ?? "0.0"} M</span>
                      </div>
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-2xl flex flex-col">
                        <span className="font-mono text-[6px] sm:text-[8px] text-amber-500/60 uppercase font-bold tracking-widest leading-none">Velocity</span>
                        <span className="font-outfit text-sm sm:text-xl font-black text-white">{telemetry?.vx?.toFixed(1) ?? "0.0"} M/S</span>
                      </div>
                    </div>

                    {/* AI HUD Stats & FPS Meter */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <div className={`px-3 py-1 sm:px-6 sm:py-2 rounded-lg sm:rounded-2xl border backdrop-blur-xl font-mono text-[8px] sm:text-xs font-black tracking-widest sm:tracking-[0.2em] animate-in slide-in-from-top-4 duration-500 ${infrastructureMode ? (infraAiData.status === "online" ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" : "text-red-500 border-red-500 bg-red-500/10") : powerlineMode ? "text-purple-400 border-purple-500/40 bg-purple-500/10" : getRiskColor(aiData.state)}`}>
                        {infrastructureMode ? (infraAiData.status === "online" ? "INFRA_ACTIVE" : "AI_LOST") : powerlineMode ? "GRID_ACTIVE" : aiData.state}
                      </div>
                      <div className="bg-black/60 border border-white/5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl font-mono text-[6px] sm:text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-2">
                        <Activity size={8} className="animate-pulse lg:hidden" />
                        <Activity size={10} className="animate-pulse hidden lg:block" />
                        {infrastructureMode ? (infraAiData.status === "online" ? "42ms" : "---") : `${aiData.fps} FPS`}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 sm:gap-2 text-right">
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-2xl flex flex-col">
                        <span className="font-mono text-[6px] sm:text-[8px] text-gray-500 uppercase font-bold tracking-widest leading-none">Clock</span>
                        <span className="font-mono text-[8px] sm:text-xs font-black text-white uppercase">{time.toLocaleTimeString([], { hour12: false })}</span>
                      </div>
                      <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-2xl flex flex-col items-end">
                        <span className="font-mono text-[6px] sm:text-[8px] text-green-500/60 uppercase font-bold tracking-widest leading-none">Link</span>
                        <span className="font-mono text-[8px] sm:text-xs font-black text-green-500 uppercase tracking-widest">STABLE</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1 sm:gap-2">
                      <div className={`flex items-center gap-1.5 sm:gap-3 border px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-2xl backdrop-blur-md transition-all ${infrastructureMode ? "bg-cyan-500/20 border-cyan-500/30" : powerlineMode ? "bg-purple-500/20 border-purple-500/30" : (aiData.state === "DANGER" ? "bg-red-600 border-red-500 animate-pulse shadow-[0_0_20px_#ef4444]" : "bg-blue-500/20 border-blue-500/30")}`}>
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${infrastructureMode ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : powerlineMode ? "bg-purple-400 shadow-[0_0_10px_#a855f7]" : (aiData.state === "DANGER" ? "bg-white" : "bg-blue-500 shadow-[0_0_10px_#3b82f6]")}`} />
                        <span className="font-mono text-[7px] sm:text-[10px] font-black text-white tracking-widest sm:tracking-[0.2em] uppercase">
                          {infrastructureMode ? "INFRA_ACTIVE" : powerlineMode ? "GRID_ACTIVE" : "AI_SURVEILLANCE"}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 bg-black/60 border border-white/5 px-6 py-2 rounded-full backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Cpu size={12} className="text-blue-500" />
                        <span className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-widest">{infrastructureMode ? "REMOTE_AI_NODE" : powerlineMode ? "POWERLINE_CORE" : "SONY_IMX708"}</span>
                      </div>
                      <div className="w-px h-3 bg-white/10" />
                      <span className="font-mono text-[9px] text-blue-400 font-bold uppercase tracking-widest">{resolution} @ 30FPS</span>
                    </div>
                  </div>

                  {/* Mode Specific HUD Banners */}
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

                  {powerlineMode && (
                    <div className="absolute top-1/2 left-6 -translate-y-1/2 z-[30] pointer-events-none">
                      <div className="flex items-center gap-4 bg-purple-900/20 border border-purple-500/40 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)] animate-in fade-in slide-in-from-left-8 duration-700">
                        <Zap size={16} className="text-purple-400 animate-pulse" />
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-black text-white tracking-[0.2em] uppercase">POWERLINE_ANALYSIS_ACTIVE</span>
                          <span className="font-mono text-[7px] text-purple-400/60 uppercase font-bold tracking-widest">Corona_Discharge_Monitoring_Engaged</span>
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

                  {/* AI PIPELINE OFFLINE WARNING BANNER */}
                  {pipelineStatus === "OFFLINE" && (infrastructureMode || powerlineMode) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none w-full max-w-lg px-8">
                      <div className="bg-red-900/90 border-2 border-red-500 backdrop-blur-2xl p-8 rounded-3xl flex flex-col items-center gap-4 shadow-[0_0_100px_rgba(239,68,68,0.3)] animate-in zoom-in duration-300">
                        <AlertCircle className="text-red-500" size={48} />
                        <div className="text-center">
                          <div className="font-outfit text-2xl font-black text-white uppercase tracking-widest mb-1">AI PIPELINE NOT DETECTED</div>
                          <div className="font-mono text-[10px] text-red-400 font-bold uppercase tracking-widest">Inference server may be offline or unreachable</div>
                        </div>
                        <div className="w-full h-px bg-red-500/20 my-2" />
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <span className="font-mono text-[8px] text-gray-400 uppercase">Last Heartbeat</span>
                            <span className="font-mono text-[10px] text-white">{lastHeartbeat ? `${Math.floor((Date.now() - lastHeartbeat)/1000)}s ago` : "NEVER"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Alert Center Banner */}
              {aiData.state === "DANGER" && !infrastructureMode && !powerlineMode && (
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
              <div className="absolute inset-0 z-[40] bg-[#020617] flex flex-col items-center justify-center gap-4 sm:gap-6">
                <div className="font-outfit text-3xl sm:text-5xl font-black text-gray-800 tracking-widest sm:tracking-[0.2em] opacity-30 italic">NO SIGNAL</div>
                <div className="flex flex-col items-center gap-2 sm:gap-4">
                  <span className="font-mono text-[8px] sm:text-xs text-gray-500 uppercase tracking-widest">Primary video downlink severed</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Cleaned Up */}
        <div className="w-full lg:w-[320px] xl:w-[360px] flex-1 lg:h-full bg-[#070b14]/60 border-t lg:border-t-0 lg:border-l border-blue-500/10 overflow-y-auto custom-scrollbar p-6 sm:p-8 flex flex-col gap-6 sm:gap-10 backdrop-blur-xl relative">
          <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />

          {/* AI Mode Controls */}
          <section className="space-y-4">
            <div className="font-mono text-[9px] tracking-[0.25em] text-cyan-500/60 uppercase font-black mb-2 px-2">Mission Intelligence</div>
            
            {/* Infrastructure Toggle */}
            <button
              onClick={toggleInfrastructureMode}
              disabled={!serviceOnline || isToggling || powerlineMode}
              className={`w-full py-4 px-6 rounded-2xl border flex items-center justify-between transition-all duration-500 ${!serviceOnline ? "opacity-50 grayscale cursor-not-allowed border-red-500/20 bg-red-500/5 text-red-400" : powerlineMode ? "opacity-30 cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-700" : infrastructureMode ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/5"}`}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">
                  {!serviceOnline ? "AI Server Offline" : "Asset Integrity"}
                </span>
                <span className={`font-mono text-[8px] opacity-60 uppercase ${!serviceOnline ? "text-red-500" : ""}`}>
                  {powerlineMode ? "LOCKED_BY_GRID_MODE" : isToggling ? "VERIFYING_NODE..." : (infrastructureMode && pipelineStatus === "ONLINE") ? "INTEGRITY_PIPELINE_ACTIVE" : (infrastructureMode && pipelineStatus === "OFFLINE") ? "INTEGRITY_OFFLINE" : "STANDBY"}
                </span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${!serviceOnline ? "bg-red-900/40" : (infrastructureMode && pipelineStatus === "OFFLINE") ? "bg-red-600" : infrastructureMode ? "bg-cyan-500" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${infrastructureMode ? "left-6" : "left-1"} ${isToggling && infrastructureMode ? "animate-pulse" : ""}`} />
              </div>
            </button>

            {/* Powerline Toggle */}
            <button
              onClick={togglePowerlineMode}
              disabled={!serviceOnline || isToggling || infrastructureMode}
              className={`w-full py-4 px-6 rounded-2xl border flex items-center justify-between transition-all duration-500 ${!serviceOnline ? "opacity-50 grayscale cursor-not-allowed border-red-500/20 bg-red-500/5 text-red-400" : infrastructureMode ? "opacity-30 cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-700" : powerlineMode ? (pipelineStatus === "OFFLINE" ? "bg-red-900/20 border-red-500/40 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.1)]") : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/5"}`}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">
                  {!serviceOnline ? "AI Server Offline" : "Grid Analysis"}
                </span>
                <span className={`font-mono text-[8px] opacity-60 uppercase ${!serviceOnline ? "text-red-500" : ""}`}>
                  {infrastructureMode ? "LOCKED_BY_ASSET_MODE" : isToggling ? "SYNCING_MATRIX..." : (powerlineMode && pipelineStatus === "ONLINE") ? "GRID_PIPELINE_ACTIVE" : (powerlineMode && pipelineStatus === "OFFLINE") ? "GRID_OFFLINE" : "READY"}
                </span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${!serviceOnline ? "bg-red-900/40" : (powerlineMode && pipelineStatus === "OFFLINE") ? "bg-red-600" : powerlineMode ? "bg-purple-500" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${powerlineMode ? "left-6" : "left-1"} ${isToggling && powerlineMode ? "animate-pulse" : ""}`} />
              </div>
            </button>

            {(infrastructureMode || powerlineMode) && serviceOnline && (
              <div className="mt-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle size={12} className="text-amber-500" />
                <span className="font-mono text-[8px] text-amber-500 uppercase font-bold tracking-widest">COLLISION_AVOIDANCE_OVERRIDDEN</span>
              </div>
            )}
            
            {!serviceOnline && (
              <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                <Info size={12} className="text-red-500" />
                <span className="font-mono text-[8px] text-red-500 uppercase font-bold tracking-widest">Verify AI laptop connection</span>
              </div>
            )}
          </section>

          {/* Evidence Acquisition Section - Enabled for both Integrity and Grid modes */}
          {(infrastructureMode || powerlineMode) ? (
            <section className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <Camera size={16} className={infrastructureMode ? "text-cyan-500" : "text-purple-500"} />
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-white">Evidence Acquisition</span>
              </div>
              <div className={`bg-black/40 border ${infrastructureMode ? "border-cyan-500/10" : "border-purple-500/10"} rounded-[2rem] p-6 space-y-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-white uppercase font-black">Autonomous Capture</span>
                    <span className="font-mono text-[7px] text-gray-500 uppercase tracking-widest">Archive_Frames_For_Forensic_Review</span>
                  </div>
                  <button
                    onClick={() => setSnapshotMode(!snapshotMode)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${snapshotMode ? (infrastructureMode ? "bg-cyan-500" : "bg-purple-500") : "bg-white/10"}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${snapshotMode ? "left-4.5" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Database size={14} className="text-gray-500" />
                    <span className="font-mono text-[9px] text-gray-500 uppercase font-bold">Archived Metrics</span>
                  </div>
                  <span className="font-outfit text-lg font-black text-white">{storedFrames}</span>
                </div>

                <button
                  disabled
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-mono text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] cursor-not-allowed"
                >
                  <Save size={12} />
                  Export Forensic Log
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

          {/* AI Report Generation Button */}
          <section className="pt-4 mt-auto">
            <button
              onClick={handleGenerateReport}
              className="w-full relative group overflow-hidden rounded-2xl p-[1px] transition-all active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-gradient-x opacity-30 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#070b14]/90 backdrop-blur-xl rounded-2xl py-4 px-6 flex items-center justify-between border border-white/10 group-hover:border-transparent transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <FileText size={18} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-outfit text-[11px] font-black text-white uppercase tracking-wider">Generate AI Report</span>
                    <span className="font-mono text-[7px] text-gray-500 uppercase font-bold tracking-widest">Enterprise_Ready</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
              </div>
            </button>
          </section>

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
                <span className={`font-black tracking-widest transition-colors duration-500 ${infrastructureMode ? "text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : powerlineMode ? "text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "text-blue-500"}`}>
                  {infrastructureMode ? "REMOTE_INSPECTION_NODE" : powerlineMode ? "POWERLINE_AI_CORE" : "EDGE_AI_CORE"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500 uppercase tracking-widest">Model</span>
                <span className={`font-black tracking-widest text-[9px] transition-colors duration-500 ${infrastructureMode ? "text-cyan-100" : powerlineMode ? "text-purple-100" : "text-white"}`}>
                  {infrastructureMode ? "infra_yolov8n.pt" : powerlineMode ? "powerline_v2.pt" : "YOLOv8n_V4.1"}
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

      {/* Report Generation Overlay */}
      {reportState !== "idle" && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-[#020617]/80 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-full max-w-xl p-8 relative">
            {/* Background cinematic pulse */}
            <div className="absolute inset-0 bg-blue-500/5 rounded-[3rem] blur-3xl animate-pulse" />
            
            <div className="relative bg-[#070b14]/90 border border-white/10 rounded-[3rem] p-12 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 cyber-grid opacity-[0.03]" />
              
              {reportState === "generating" && (
                <div className="flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-500">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-blue-500/20 flex items-center justify-center">
                      <Loader2 className="text-blue-500 animate-spin" size={64} strokeWidth={1} />
                    </div>
                    <div className="absolute inset-0 w-32 h-32 rounded-full border-t-4 border-blue-500 animate-spin" />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-outfit text-2xl font-black text-white uppercase tracking-widest animate-pulse">
                      Synthesizing AI Analysis
                    </h3>
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw size={14} className="text-blue-500 animate-spin" />
                      <span className="font-mono text-xs text-blue-400 font-bold uppercase tracking-widest transition-all duration-500">
                        {reportMessages[reportMessageIndex]}
                      </span>
                    </div>
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex justify-between font-mono text-[10px] text-gray-500 uppercase font-black tracking-widest">
                      <span>Inference Progress</span>
                      <span>{reportProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        style={{ width: `${reportProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {reportState === "success" && (
                <div className="flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-500">
                  <div className="w-32 h-32 rounded-full bg-green-500/10 border-4 border-green-500/20 flex items-center justify-center">
                    <ShieldCheck className="text-green-500" size={64} strokeWidth={1} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-outfit text-3xl font-black text-white uppercase tracking-tighter">
                      Mission Report Ready
                    </h3>
                    <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">
                      AI analysis cycle complete. Intelligence artifact synchronized.
                    </p>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 p-5 rounded-3xl text-left">
                      <span className="block font-mono text-[8px] text-gray-500 uppercase font-black mb-2">Mission ID</span>
                      <span className="font-outfit text-lg font-black text-white">{reportResult?.mission_id}</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-5 rounded-3xl text-left">
                      <span className="block font-mono text-[8px] text-gray-500 uppercase font-black mb-2">Risk Level</span>
                      <span className={`font-outfit text-lg font-black uppercase ${
                        reportResult?.risk_level === 'CRITICAL' ? 'text-red-500' : 
                        reportResult?.risk_level === 'HIGH' ? 'text-orange-500' : 'text-green-500'
                      }`}>
                        {reportResult?.risk_level}
                      </span>
                    </div>
                    <div className="col-span-2 bg-white/5 border border-white/5 p-5 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                          <BarChart3 size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[8px] text-gray-500 uppercase font-black">Total Detections</span>
                          <span className="font-outfit text-lg font-black text-white">{reportResult?.detections} Events</span>
                        </div>
                      </div>
                      <AlertTriangle size={20} className={reportResult?.detections > 0 ? "text-orange-500" : "text-gray-800"} />
                    </div>
                  </div>

                  <div className="w-full flex gap-4">
                    <button
                      onClick={() => setReportState("idle")}
                      className="flex-1 py-4 px-6 rounded-2xl border border-white/10 font-mono text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                      Close HUD
                    </button>
                    <a
                      href={reportResult?.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-[2] py-4 px-6 bg-blue-600 rounded-2xl font-mono text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all animate-bounce"
                    >
                      <Download size={18} />
                      Download Report
                    </a>
                  </div>
                </div>
              )}

              {reportState === "error" && (
                <div className="flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center">
                    <AlertCircle className="text-red-500" size={48} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-outfit text-2xl font-black text-white uppercase tracking-widest">
                      Synthesis Failed
                    </h3>
                    <p className="font-mono text-xs text-red-400 uppercase tracking-widest">
                      {reportError || "AI connection timeout or inference error."}
                    </p>
                  </div>
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => setReportState("idle")}
                      className="flex-1 py-4 border border-white/10 rounded-2xl font-mono text-xs text-gray-500 uppercase font-black"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateReport}
                      className="flex-1 py-4 bg-red-600 rounded-2xl font-mono text-xs text-white uppercase font-black"
                    >
                      Retry Cycle
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}