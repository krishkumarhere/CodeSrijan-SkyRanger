import { Users, Target, Layers, Code, Cpu, ExternalLink } from "lucide-react"

export default function AboutPage() {
  const team = [
    { name: "Krish Kumar", role: "AI & Full Stack Developer" },
    { name: "Swastika Kumari", role: "ML Engineer" },
    { name: "Rudra Bishwakarma", role: "Hardware Engineer" }
  ]

  return (
    <div style={{ flex: 1, padding: "32px 42px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "36px" }}>

      {/* Hero Header */}
      <div style={{ textAlign: "center", marginBottom: "8px", marginTop: "16px" }}>
        <h1 style={{ fontSize: "2.8rem", fontWeight: "700", color: "#ffffff", marginBottom: "12px", letterSpacing: "0.05em" }}>
          SkyRanger <span style={{ color: "var(--accent)" }}>System</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "800px", margin: "0 auto", lineHeight: "1.6" }}>
          An autonomous, AI-powered drone intelligence framework designed for real-time disaster response and hazard mitigation.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "28px" }}>

        {/* Problem Statement */}
        <div style={{ background: "linear-gradient(180deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.9))", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "28px", padding: "36px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{ padding: "12px", background: "rgba(59,130,246,0.15)", borderRadius: "16px", color: "var(--accent)" }}>
              <Target size={28} />
            </div>
            <h2 style={{ fontSize: "1.5rem", color: "#fff", margin: 0, fontWeight: "600" }}>The Problem Statement</h2>
          </div>
          <h3 style={{ color: "var(--accent)", fontSize: "0.9rem", marginBottom: "16px", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.1em" }}>Statement 5: Smart Disaster Response Robots with AI Navigation</h3>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.8", fontSize: "1rem", flex: 1 }}>
            During natural disasters such as earthquakes, fires, or floods, rescue operations are often risky and time-sensitive. Human responders face extreme dangers in accessing affected and unstable areas.
            <br /><br />
            This project develops AI-enabled disaster response robotics that can autonomously navigate hazardous environments using computer vision and edge computing. SkyRanger locates survivors, calculates mission sweeps, and directly assists rescue teams—reducing risk and fundamentally improving reaction times.
          </p>
        </div>

        {/* Team Details */}
        <div style={{ background: "linear-gradient(180deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.9))", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "28px", padding: "36px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div style={{ padding: "12px", background: "rgba(16,185,129,0.15)", borderRadius: "16px", color: "var(--green)" }}>
              <Users size={28} />
            </div>
            <h2 style={{ fontSize: "1.5rem", color: "#fff", margin: 0, fontWeight: "600" }}>Team SkyRanger</h2>
          </div>

          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "28px", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Jaypee University of Engineering and Technology, Guna
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {team.map(member => (
              <div key={member.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", transition: "transform 0.2s, background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                <div>
                  <div style={{ color: "#fff", fontWeight: "600", fontSize: "1.1rem" }}>{member.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "6px" }}>{member.role}</div>
                </div>
                <div style={{ display: "flex", gap: "14px" }}>
                  <a href="#" style={{ color: "var(--text-faint)", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "var(--text-faint)"} title="GitHub"><ExternalLink size={18} style={{ pointerEvents: "none" }} /></a>
                  <a href="#" style={{ color: "var(--text-faint)", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "var(--accent)"} onMouseLeave={e => e.target.style.color = "var(--text-faint)"} title="LinkedIn"><ExternalLink size={18} style={{ pointerEvents: "none" }} /></a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", paddingBottom: "40px" }}>

        {/* Architecture */}
        <div style={{ background: "rgba(31, 41, 55, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "32px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
            <div style={{ padding: "10px", background: "rgba(139,92,246,0.15)", borderRadius: "12px", color: "var(--purple)" }}><Layers size={22} /></div>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>System Architecture</h3>
          </div>
          <ul style={{ color: "var(--text-secondary)", lineHeight: "1.8", paddingLeft: "24px", fontSize: "0.95rem", margin: 0 }}>
            <li style={{ marginBottom: "12px" }}><strong>Edge Node (Raspberry Pi):</strong> Handles real-time computer vision streams, thermal data, and localized sensors.</li>
            <li style={{ marginBottom: "12px" }}><strong>Flight Controller (Pixhawk):</strong> Executes low-level mission execution, UAV stabilization, and telemetry via MAVLink.</li>
            <li style={{ marginBottom: "12px" }}><strong>Compute Node:</strong> Powered by YOLOv8 for sub-millisecond AI object detection and priority validation.</li>
            <li><strong>Ground Control Station:</strong> A robust React Dashboard for live MAVLink manipulation and mapping.</li>
          </ul>
        </div>

        {/* Tech Stack */}
        <div style={{ background: "rgba(31, 41, 55, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "32px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
            <div style={{ padding: "10px", background: "rgba(245,158,11,0.15)", borderRadius: "12px", color: "var(--amber)" }}><Code size={22} /></div>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>Tech Stack</h3>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {["React.js", "FastAPI", "Python 3.10", "YOLOv8", "Computer Vision", "PyTorch", "MAVLink Protocol", "pymavlink", "WebSockets", "Leaflet", "Raspberry Pi"].map(t => (
              <span key={t} style={{ padding: "8px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono" }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ background: "rgba(31, 41, 55, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "32px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
            <div style={{ padding: "10px", background: "rgba(6,182,212,0.15)", borderRadius: "12px", color: "var(--cyan)" }}><Cpu size={22} /></div>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>Key Capabilities</h3>
          </div>
          <ul style={{ color: "var(--text-secondary)", lineHeight: "1.8", paddingLeft: "24px", fontSize: "0.95rem", margin: 0 }}>
            <li style={{ marginBottom: "12px" }}>Real-time computer vision overlaid directly on a latency-optimized stream matrix.</li>
            <li style={{ marginBottom: "12px" }}>Dynamic, autonomous waypoint mission generation leveraging sweep configurations.</li>
            <li style={{ marginBottom: "12px" }}>Strict MAVLink-over-Serial transmission for offline reliability without external clouds.</li>
            <li>Priority-based human detection algorithms explicitly tuned for search & rescue operations.</li>
          </ul>
        </div>

      </div>

    </div>
  )
}
