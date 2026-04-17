import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Search, Upload, Target, Clock, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";

export default function MissionPage({ telemetry = {}, connected = false }) {
  const [waypoints, setWaypoints] = useState([]);

  const [logs, setLogs] = useState([]);

  const addWaypoint = () => {
    const newId = waypoints.length > 0 ? Math.max(...waypoints.map(w => w.id)) + 1 : 1;
    setWaypoints([
      ...waypoints,
      { id: newId, lat: 0, lon: 0, alt: 10, speed: 5, type: "WAYPOINT" }
    ]);
  };

  const updateWaypoint = (id, field, value) => {
    setWaypoints(waypoints.map(wp => wp.id === id ? { ...wp, [field]: value } : wp));
  };

  const removeWaypoint = (id) => {
    setWaypoints(waypoints.filter(wp => wp.id !== id));
  };

  const clearAllWaypoints = () => {
    setWaypoints([]);
  };

  const generateSearchGrid = () => {
    // Determine starting point - either last waypoint, drone location, or a default coordinate
    const startLat = waypoints.length > 0 ? waypoints[waypoints.length - 1].lat : (telemetry.lat || 24.647500);
    const startLon = waypoints.length > 0 ? waypoints[waypoints.length - 1].lon : (telemetry.lon || 77.319400);

    // ~11 meters offset (0.0001 degrees)
    const step = 0.0002;

    // "Lawnmower" snake sweep pattern
    const patternOffsets = [
      { dLat: step, dLon: -step },
      { dLat: step, dLon: step },
      { dLat: 0, dLon: step },
      { dLat: 0, dLon: -step },
      { dLat: -step, dLon: -step },
      { dLat: -step, dLon: step },
    ];

    let newId = waypoints.length > 0 ? Math.max(...waypoints.map(w => w.id)) + 1 : 1;
    const newWaypoints = patternOffsets.map(offset => ({
      id: newId++,
      type: "WAYPOINT",
      lat: parseFloat((startLat + offset.dLat).toFixed(6)),
      lon: parseFloat((startLon + offset.dLon).toFixed(6)),
      alt: 20, // Standard Search Altitude
      speed: 3 // Slower sweep speed (m/s)
    }));

    setWaypoints([...waypoints, ...newWaypoints]);
  };

  const [aiServerOk, setAiServerOk] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const AI_SERVER_URL = "http://10.132.78.80:8001"; // Pi IP for FastAPI AI server

  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        let res = await fetch(`${AI_SERVER_URL}/health`);
        if (res.ok) setAiServerOk(true);
        else setAiServerOk(false);
      } catch (err) {
        setAiServerOk(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const hasGpsFix = telemetry.gps_fix === 3 && telemetry.satellites >= 8;
  const hasGoodBattery = telemetry.battery_voltage && telemetry.battery_voltage > 11.5;

  // --- Distance & Time Calculations ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const totals = waypoints.reduce((acc, wp, i, arr) => {
    if (i === 0) return acc;
    const d = calculateDistance(arr[i - 1].lat, arr[i - 1].lon, wp.lat, wp.lon);
    const v = wp.speed > 0 ? wp.speed : 5;
    return { dist: acc.dist + d, timeSeconds: acc.timeSeconds + (d / v) };
  }, { dist: 0, timeSeconds: 0 });

  const formatDistance = (m) => m > 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;

  const formatTime = (secs) => {
    if (!secs) return "00:00:00";
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- Dynamic Objective ---
  let currentObjective = "STANDBY / PLANNING";
  if (telemetry.armed) {
    if (telemetry.flight_mode === "AUTO") currentObjective = "EXECUTING MISSION";
    else if (telemetry.flight_mode === "RTL") currentObjective = "RETURNING (RTL)";
    else currentObjective = `MANUAL (${telemetry.flight_mode})`;
  } else if (waypoints.length > 0) {
    currentObjective = "MISSION PLANNED";
  }

  const checklist = [
    { label: "Pixhawk Connection", status: connected ? "ok" : "err" },
    { label: `GPS 3D Fix (${telemetry.satellites || 0} Sats)`, status: telemetry.gps_fix === 3 ? (telemetry.satellites >= 8 ? "ok" : "warn") : "err" },
    { label: "AI Model Server", status: aiServerOk ? "ok" : "err" },
    { label: `Battery Voltage (${telemetry.battery_voltage?.toFixed(1) || '0.0'}V)`, status: hasGoodBattery ? "ok" : "warn" },
    { label: "Mission Path Validated", status: waypoints.length > 0 ? "ok" : "warn" },
  ];

  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const handleUploadMission = async () => {
    setUploading(true);
    setStatus("");

    try {
      const missionData = waypoints.map(wp => ({
        lat: wp.lat,
        lon: wp.lon,
        alt: wp.alt
      }));

      const res = await fetch(`${BACKEND_URL}/upload_mission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission: missionData })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Upload failed");

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }

    setUploading(false);
  };

  return (
    <div className="mission-page" style={{
      display: "flex",
      gap: "24px",
      padding: "24px",
      height: "100%",
      backgroundColor: "#161618",
      color: "#e5e7eb",
      overflow: "hidden"
    }}>

      {/* LEFT COLUMN: Planner & Checklist */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>

        {/* Pre-flight Checklist */}
        <div className="extej-card" style={{
          background: "#1c1c1f", border: "1px solid #27272a", borderRadius: "16px", padding: "20px"
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} color="#f97316" /> Pre-Flight Checklist
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {checklist.map((item, idx) => {
              let icon = <CheckCircle2 size={16} color="#10b981" />;
              if (item.status === 'warn') icon = <AlertTriangle size={16} color="#f59e0b" />;
              if (item.status === 'err') icon = <XCircle size={16} color="#ef4444" />;

              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#a1a1aa" }}>
                  {icon}
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Waypoint Planner */}
        <div className="extej-card" style={{
          background: "#1c1c1f", border: "1px solid #27272a", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} color="#f97316" /> Flight Plan
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {status === "success" && (
                <span style={{ color: "#10b981", fontSize: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={14} /> Uploaded Successfully
                </span>
              )}
              {status === "error" && (
                <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={14} /> Upload Failed
                </span>
              )}
              <button
                onClick={handleUploadMission}
                disabled={uploading}
                style={{
                  background: uploading ? "#52525b" : "#ea580c",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
              >
                <Upload size={14} /> {uploading ? "UPLOADING..." : "PUSH TO DRONE"}
              </button>
            </div>
          </div>

          <div style={{ overflowY: "auto", pr: "8px", flex: 1 }}>
            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ color: "#71717a", borderBottom: "1px solid #27272a" }}>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>CMD</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>LAT</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>LON</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>ALT (m)</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>SPD (m/s)</th>
                  <th style={{ padding: "12px 0", fontWeight: 500 }}></th>
                </tr>
              </thead>
              <tbody>
                {waypoints.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#71717a" }}>
                      No waypoints added yet. Click "+ ADD WAYPOINT" to begin.
                    </td>
                  </tr>
                )}
                {waypoints.map((wp, i) => (
                  <tr key={wp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <select value={wp.type} onChange={(e) => updateWaypoint(wp.id, 'type', e.target.value)} style={{
                        background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px", fontSize: "10px", fontFamily: "JetBrains Mono"
                      }}>
                        <option value="TAKEOFF">TAKEOFF</option>
                        <option value="WAYPOINT">WAYPOINT</option>
                        <option value="RTL">RTL</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <input type="number" step="0.000001" value={wp.lat || ''} onChange={(e) => updateWaypoint(wp.id, 'lat', parseFloat(e.target.value) || 0)} style={{
                        width: "80px", background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", fontFamily: "JetBrains Mono"
                      }} />
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <input type="number" step="0.000001" value={wp.lon || ''} onChange={(e) => updateWaypoint(wp.id, 'lon', parseFloat(e.target.value) || 0)} style={{
                        width: "80px", background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", fontFamily: "JetBrains Mono"
                      }} />
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <input type="number" value={wp.alt} onChange={(e) => updateWaypoint(wp.id, 'alt', parseFloat(e.target.value) || 0)} style={{
                        width: "50px", background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", fontFamily: "JetBrains Mono"
                      }} />
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <input type="number" value={wp.speed} onChange={(e) => updateWaypoint(wp.id, 'speed', parseFloat(e.target.value) || 0)} style={{
                        width: "50px", background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", fontFamily: "JetBrains Mono"
                      }} />
                    </td>
                    <td style={{ padding: "12px 0", textAlign: "right" }}>
                      <button onClick={() => removeWaypoint(wp.id)} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "16px" }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button onClick={addWaypoint} style={{ flex: 1, background: "#27272a", color: "#e5e7eb", border: "1px solid #3f3f46", padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>+ ADD WAYPOINT</button>
            <button onClick={generateSearchGrid} style={{ flex: 1, background: "#27272a", color: "#e5e7eb", border: "1px solid #3f3f46", padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>DRAW SEARCH GRID</button>
            {waypoints.length > 0 && (
              <button
                onClick={clearAllWaypoints}
                style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
              >
                CLEAR ALL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Log & Insights */}
      <div style={{ width: "380px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Mission Status Widget */}
        <div className="extej-card" style={{
          background: "linear-gradient(145deg, #ea580c, #c2410c)", borderRadius: "16px", padding: "24px", color: "white", position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", right: "-20px", top: "-20px", opacity: 0.1 }}>
            <Target size={150} />
          </div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.9, marginBottom: "8px" }}>Mission Objective</div>
          <div style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px" }}>{currentObjective}</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
            <div>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>Est. Time (Planned)</div>
              <div style={{ fontSize: "18px", fontFamily: "JetBrains Mono", fontWeight: 600 }}>{formatTime(totals.timeSeconds)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>Distance</div>
              <div style={{ fontSize: "18px", fontFamily: "JetBrains Mono", fontWeight: 600 }}>{formatDistance(totals.dist)}</div>
            </div>
          </div>
        </div>

        {/* AI Insight Event Log */}
        <div className="extej-card" style={{
          background: "#1c1c1f", border: "1px solid #27272a", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} color="#f97316" /> Mission Event Log
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", pr: "8px", flex: 1 }}>
            {logs.map((log, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{
                  marginTop: "2px",
                  padding: "4px", borderRadius: "50%",
                  background: log.type === 'ai' ? 'rgba(234, 88, 12, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: log.type === 'ai' ? '#ea580c' : '#10b981'
                }}>
                  {log.type === 'ai' ? <Search size={12} /> : <Circle size={12} fill="currentColor" />}
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontFamily: "JetBrains Mono", color: "#71717a", marginBottom: "4px" }}>
                    {log.time} • {log.type.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "12px", color: log.type === 'ai' ? '#fde68a' : '#e5e7eb', lineHeight: "1.4" }}>
                    {log.msg}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}