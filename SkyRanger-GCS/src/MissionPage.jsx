import { useState, useEffect } from "react";
import {
  MapContainer, TileLayer, Marker, Polyline, Popup, useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation, Target, Zap, Satellite,
  ArrowUpRight, Wind, MapPin, Info, AlertCircle,
  Activity, Clock, ChevronRight, ShieldCheck,
  RefreshCw, Layers, ExternalLink, X, CheckCircle2
} from "lucide-react";

// Fix Leaflet default icon issue
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Tactical Drone Icon
const createDroneIcon = (heading) => L.divIcon({
  html: `<div style="transform: rotate(${heading}deg); transition: transform 0.3s ease-out;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#60a5fa" class="animate-pulse"/>
          </svg>
        </div>`,
  className: "drone-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Custom Waypoint Icon based on status
const createWaypointIcon = (index, isActive, isCompleted) => L.divIcon({
  html: `<div class="relative flex items-center justify-center">
          ${isActive ? '<div class="absolute w-8 h-8 bg-blue-600/20 border border-blue-500 rounded-full animate-ping"></div>' : ''}
          <div class="w-6 h-6 ${isCompleted ? "bg-green-600 border-green-400" : isActive ? "bg-blue-600 border-white" : "bg-gray-800 border-gray-600"} border-2 rounded-full flex items-center justify-center shadow-lg transition-all duration-500">
            <span class="text-[9px] font-black text-white">${index}</span>
          </div>
        </div>`,
  className: "waypoint-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const MAV_CMD_MAP = {
  16: "WAYPOINT",
  22: "TAKEOFF",
  21: "LAND",
  20: "RETURN_TO_LAUNCH",
  17: "LOITER_UNLIM",
  18: "LOITER_TURNS",
  19: "LOITER_TIME",
  84: "VTOL_TAKEOFF",
  85: "VTOL_LAND"
};

export default function MissionPage({ telemetry }) {
  const [mission, setMission] = useState([]);
  const [missionStatus, setMissionStatus] = useState({ total_wps: 0, active_wp: -1, is_autonomous: false });
  const [flightPath, setFlightPath] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [showQGCModal, setShowQGCModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Drone state from telemetry
  const dronePos = {
    lat: telemetry?.lat || 0,
    lon: telemetry?.lon || 0,
    heading: telemetry?.heading || 0,
    alt: telemetry?.alt || 0,
    speed: telemetry?.speed || 0,
    satellites: telemetry?.satellites || 0,
    battery: telemetry?.battery_remaining || 0,
    mode: telemetry?.flight_mode || "STABILIZE",
    armed: telemetry?.armed || false,
    gps_fix: telemetry?.gps_fix || false
  };

  // Initial Data Load
  useEffect(() => {
    handleSync();
  }, []);

  // Poll Mission Status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/mission/status');
        const data = await res.json();
        setMissionStatus(data);
      } catch (e) {
        console.error("Failed to fetch mission status:", e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Map Controller to handle auto-centering
  const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center[0] !== 0 && dronePos.gps_fix) {
        map.setView(center, map.getZoom());
      }
    }, [center]);
    return null;
  };

  // Update flight path trail
  useEffect(() => {
    if (dronePos.lat && dronePos.lon) {
      setFlightPath(prev => {
        const last = prev[prev.length - 1];
        if (last && last[0] === dronePos.lat && last[1] === dronePos.lon) return prev;
        return [...prev, [dronePos.lat, dronePos.lon]].slice(-300);
      });
    }
  }, [dronePos.lat, dronePos.lon]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/mission/sync', { method: 'POST' });
      const data = await res.json();

      const missionRes = await fetch('/api/mission');
      const missionData = await missionRes.json();
      setMission(missionData.mission || []);
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Sync Failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  const progress = mission.length > 0 ? (Math.max(0, missionStatus.active_wp) / mission.length) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] overflow-hidden relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.03] pointer-events-none" />

      {/* 1. TOP TELEMETRY STRIP */}
      <div className="h-auto sm:h-16 bg-[#070b14]/80 border-b border-blue-500/10 flex flex-col sm:flex-row items-center px-4 sm:px-6 py-3 sm:py-0 gap-3 sm:gap-8 z-[1000] backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:pr-8 sm:border-r border-white/5 w-full sm:w-auto">
          <div className={`w-2 h-2 rounded-full ${dronePos.armed ? "bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" : "bg-white/20"}`} />
          <div className="flex flex-col">
            <span className="font-mono text-[7px] sm:text-[8px] text-gray-500 uppercase tracking-widest leading-none">Status</span>
            <span className="font-outfit text-xs sm:text-sm font-black text-white uppercase tracking-wider">{dronePos.armed ? "ARMED" : "DISARMED"}</span>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-4 sm:gap-10 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          <TelemetryItem icon={Zap} label="Bat" value={dronePos.battery} unit="%" color="green" />
          <TelemetryItem icon={Satellite} label="GPS" value={dronePos.satellites} unit="SAT" color="blue" />
          <TelemetryItem icon={ArrowUpRight} label="Alt" value={dronePos.alt} unit="M" color="blue" />
          <TelemetryItem icon={Wind} label="Spd" value={dronePos.speed} unit="M/S" color="amber" />
          <TelemetryItem icon={Navigation} label="Hdg" value={dronePos.heading} unit="°" color="blue" />
          <TelemetryItem icon={Target} label="Mode" value={dronePos.mode} unit="" color={missionStatus.is_autonomous ? "green" : "blue"} />
        </div>

        <div className="flex items-center gap-4 pl-8 border-l border-white/5">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest leading-none">Intelligence_Sync</span>
            <span className="font-mono text-[10px] text-blue-500 font-black uppercase tracking-wider">
              {lastSync ? `LAST: ${lastSync}` : "SYNCING..."}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* 2. MAIN MAP AREA */}
        <div className="h-[40vh] sm:h-[50vh] lg:h-full lg:flex-1 relative bg-black">
          <MapContainer
            center={[dronePos.lat || 0, dronePos.lon || 0]}
            zoom={18}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <MapController center={[dronePos.lat, dronePos.lon]} />

            {dronePos.gps_fix && (
              <Marker position={[dronePos.lat, dronePos.lon]} icon={createDroneIcon(dronePos.heading)}>
                <Popup className="tactical-popup">
                  <div className="font-mono text-[10px] p-1 text-blue-400">SKY_RANGER_UAV</div>
                </Popup>
              </Marker>
            )}

            <Polyline positions={flightPath} color="#3b82f6" weight={1} dashArray="5, 10" opacity={0.4} />

            {mission.map((wp, idx) => (
              <Marker
                key={idx}
                position={[wp.lat, wp.lon]}
                icon={createWaypointIcon(wp.seq, wp.seq === missionStatus.active_wp, wp.seq < missionStatus.active_wp)}
              />
            ))}

            {mission.length > 1 && (
              <Polyline
                positions={mission.map(wp => [wp.lat, wp.lon])}
                color="#60a5fa" weight={2} opacity={0.6} dashArray="10, 10"
              />
            )}

            <div className="absolute top-6 left-6 z-[1000]">
              <div className="bg-[#070b14]/90 border border-blue-500/20 px-4 py-2 rounded-xl backdrop-blur-xl flex items-center gap-3">
                <ShieldCheck size={14} className="text-green-500" />
                <span className="font-mono text-[9px] font-black text-white uppercase tracking-widest">QGC_Authoritative_View</span>
              </div>
            </div>

            {!dronePos.gps_fix && (
              <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <div className="px-6 py-3 bg-red-600/20 border border-red-500/40 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-red-500 animate-pulse" size={20} />
                    <span className="font-mono text-lg font-black text-white uppercase tracking-[0.2em]">NO GPS FIX</span>
                  </div>
                  <span className="font-mono text-[10px] text-red-500/60 uppercase font-bold tracking-widest animate-pulse">Awaiting 3D Satellite Lock...</span>
                </div>
              </div>
            )}
          </MapContainer>
        </div>

        {/* 3. MISSION INTELLIGENCE PANEL (RIGHT SIDEBAR) */}
        <div className="w-full lg:w-[380px] flex-1 lg:h-full bg-[#070b14]/60 border-t lg:border-t-0 lg:border-l border-blue-500/10 backdrop-blur-2xl flex flex-col z-[2000] overflow-y-auto custom-scrollbar">

          {/* Mission Workflow Section */}
          <div className="p-4 sm:p-6 border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent">
            <div className="font-mono text-[9px] text-blue-500/60 uppercase font-black tracking-[0.25em] mb-3 sm:mb-4">Mission_Workflow</div>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setShowQGCModal(true)}
                className="group flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-blue-600/10 hover:border-blue-500/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <ExternalLink size={18} className="text-blue-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-mono text-[11px] font-black text-white uppercase">Open QGroundControl</span>
                    <span className="font-mono text-[8px] text-gray-500 uppercase">Operational Instructions</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-600 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl font-mono text-[10px] font-black text-blue-400 hover:bg-blue-600/30 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                  Sync Mission
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl font-mono text-[10px] font-black text-gray-400 hover:bg-white/10 transition-all"
                >
                  <Layers size={14} />
                  Refresh UI
                </button>
              </div>
            </div>
          </div>

          {/* Mission Intelligence Metrics */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[9px] text-gray-500 uppercase font-black tracking-widest">Progress_Metrics</span>
              <span className="font-mono text-xs font-black text-blue-400">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mb-6">
              <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Active_WP" icon={Target} value={missionStatus.active_wp >= 0 ? `#${missionStatus.active_wp}` : "—"} />
              <MetricBox label="Est_Finish" icon={Clock} value={missionStatus.is_autonomous ? "14:20" : "—"} color="amber" />
            </div>
          </div>

          {/* Waypoint Intelligence List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-blue-500" />
                <span className="font-mono text-[10px] text-gray-400 uppercase font-black tracking-widest">Sequence_Intelligence</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {mission.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                  <Info size={24} className="text-blue-500/40 mb-2" />
                  <span className="font-mono text-[9px] text-center px-10 uppercase tracking-widest">Awaiting Pixhawk Mission Data</span>
                </div>
              ) : (
                mission.map((wp) => (
                  <WaypointCard
                    key={wp.seq}
                    wp={wp}
                    isActive={wp.seq === missionStatus.active_wp}
                    isDone={wp.seq < missionStatus.active_wp}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QGC Tactical Modal */}
      {showQGCModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#070b14] border border-blue-500/30 rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(59,130,246,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

            <button
              onClick={() => setShowQGCModal(false)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <ExternalLink size={24} className="text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-blue-500 font-black uppercase tracking-widest">System_Handoff</span>
                <h3 className="font-outfit text-xl font-black text-white uppercase tracking-tight">QGC Workflow</h3>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <WorkflowStep num="1" text="Open QGroundControl application manually on your workstation." />
              <WorkflowStep num="2" text="Create or Load your mission plan and Upload to Pixhawk." />
              <WorkflowStep num="3" text="Return to SkyRanger GCS and click 'Sync Mission' to visualize." />
              <WorkflowStep num="4" text="Monitor AI inspection intelligence during autonomous flight." />
            </div>

            <button
              onClick={() => setShowQGCModal(false)}
              className="w-full mt-10 py-4 bg-blue-600 rounded-2xl font-mono text-[11px] font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function TelemetryItem({ icon: Icon, label, value, unit, color }) {
  const colors = { blue: "text-blue-500", green: "text-green-500", amber: "text-amber-500" };
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className={`p-1.5 rounded-lg bg-white/[0.03] border border-white/5 ${colors[color]}`}><Icon size={14} /></div>
      <div className="flex flex-col">
        <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest leading-none mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="font-outfit text-sm font-black text-white leading-none">{value != null ? (typeof value === 'number' ? value.toFixed(1) : value) : "—"}</span>
          {unit && <span className="font-mono text-[8px] text-gray-500 font-bold uppercase">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, color = "blue" }) {
  const colors = { blue: "text-blue-500", amber: "text-amber-500" };
  return (
    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-1">
      <div className="flex items-center gap-2"><Icon size={12} className={colors[color]} /><span className="font-mono text-[8px] text-gray-500 uppercase font-black tracking-widest">{label}</span></div>
      <div className="font-outfit text-xl font-black text-white tracking-wider">{value}</div>
    </div>
  );
}

function WaypointCard({ wp, isActive, isDone }) {
  return (
    <div className={`p-4 border rounded-2xl flex flex-col gap-3 transition-all duration-500 ${isActive ? "bg-blue-600/10 border-blue-500 shadow-lg" : isDone ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-white/[0.03] border-white/5 opacity-80"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-[10px] font-black border ${isActive ? "bg-blue-500 border-white text-white" : "bg-white/5 border-white/10 text-gray-400"}`}>{wp.seq}</div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-white font-black uppercase tracking-widest">{MAV_CMD_MAP[wp.command] || "WAYPOINT"}</span>
            <span className="font-mono text-[8px] text-gray-500">ALT: {wp.alt}M | {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}</span>
          </div>
        </div>
        {isActive && <div className="bg-blue-500 text-white font-mono text-[8px] px-2 py-0.5 rounded-full animate-pulse">ACTIVE</div>}
        {isDone && <CheckCircle2 size={14} className="text-green-500" />}
      </div>
    </div>
  );
}

function WorkflowStep({ num, text }) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 shrink-0 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-mono text-[10px] font-black text-blue-500">{num}</div>
      <p className="font-mono text-[11px] text-gray-400 leading-relaxed uppercase">{text}</p>
    </div>
  );
}