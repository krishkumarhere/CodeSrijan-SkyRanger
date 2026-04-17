import { useState } from "react";
import { CheckCircle2, Circle, Search, Upload, Target, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export default function MissionPage() {
  const [waypoints, setWaypoints] = useState([
    { id: 1, lat: 24.647500, lon: 77.319400, alt: 25, speed: 5, type: "TAKEOFF" },
    { id: 2, lat: 24.647800, lon: 77.319600, alt: 45, speed: 10, type: "WAYPOINT" },
    { id: 3, lat: 24.648000, lon: 77.319300, alt: 35, speed: 10, type: "WAYPOINT" },
    { id: 4, lat: 24.647600, lon: 77.318900, alt: 20, speed: 5, type: "WAYPOINT" },
    { id: 5, lat: 24.647287, lon: 77.319182, alt: 0, speed: 2, type: "RTL" },
  ]);

  const [logs] = useState([
    { time: "14:32:10", type: "system", msg: "Mission Uploaded to Pixhawk" },
    { time: "14:32:15", type: "system", msg: "Takeoff Sequence Initiated" },
    { time: "14:35:05", type: "ai", msg: "⚠ Survivor Detected (88% Conf) in Sector 2" },
    { time: "14:35:06", type: "ai", msg: "AI Overriding MAVLink: Hover and Track" },
    { time: "14:38:10", type: "sensor", msg: "Proximity Alert: Object within 7m below" },
    { time: "14:38:12", type: "system", msg: "Resuming Search Pattern" },
  ]);

  const checklist = [
    { label: "Pixhawk Connection", status: "ok" },
    { label: "GPS 3D Fix (>8 Sats)", status: "ok" },
    { label: "AI Model Loaded (YOLOv8)", status: "ok" },
    { label: "Video Stream Active", status: "ok" },
    { label: "Battery Voltage > 11.5V", status: "warn" },
    { label: "Mission Path Validated", status: "ok" },
  ];

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
            {checklist.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#a1a1aa" }}>
                {item.status === 'ok' ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <AlertTriangle size={16} color="#f59e0b" />
                )}
                {item.label}
              </div>
            ))}
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
            <button style={{
              background: "#ea580c", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer"
            }}>
              <Upload size={14} /> PUSH TO DRONE
            </button>
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
                </tr>
              </thead>
              <tbody>
                {waypoints.map((wp, i) => (
                  <tr key={wp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "12px 8px", color: wp.type === 'RTL' ? '#ea580c' : '#e5e7eb' }}>
                      <span style={{ 
                        background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "JetBrains Mono" 
                      }}>{wp.type}</span>
                    </td>
                    <td style={{ padding: "12px 8px", fontFamily: "JetBrains Mono", color: "#a1a1aa" }}>{wp.lat.toFixed(6)}</td>
                    <td style={{ padding: "12px 8px", fontFamily: "JetBrains Mono", color: "#a1a1aa" }}>{wp.lon.toFixed(6)}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <input type="number" defaultValue={wp.alt} style={{ 
                        width: "50px", background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", fontFamily: "JetBrains Mono" 
                      }} />
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <input type="number" defaultValue={wp.speed} style={{ 
                        width: "50px", background: "#27272a", border: "1px solid #3f3f46", color: "white", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", fontFamily: "JetBrains Mono" 
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button style={{ flex: 1, background: "#27272a", color: "#e5e7eb", border: "1px solid #3f3f46", padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>+ ADD WAYPOINT</button>
            <button style={{ flex: 1, background: "#27272a", color: "#e5e7eb", border: "1px solid #3f3f46", padding: "8px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>DRAW SEARCH GRID</button>
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
          <div style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px" }}>PATROL & SCAN</div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
            <div>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>Time Elapsed</div>
              <div style={{ fontSize: "18px", fontFamily: "JetBrains Mono", fontWeight: 600 }}>00:14:32</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>Distance</div>
              <div style={{ fontSize: "18px", fontFamily: "JetBrains Mono", fontWeight: 600 }}>1.2 km</div>
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
