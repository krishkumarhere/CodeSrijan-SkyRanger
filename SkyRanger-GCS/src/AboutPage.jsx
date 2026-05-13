import React from "react";
import { 
  Users, Target, Layers, Code, Cpu, ExternalLink, 
  Zap, Shield, Crosshair, Activity, Globe, Box, 
  Terminal, ChevronRight,
  Database, Network, Radio, Server, Search, HardDrive
} from "lucide-react";

const TeamMember = ({ name, role, bio, github, linkedin }) => (
  <div className="group relative bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.06] hover:border-blue-500/30 transition-all duration-500 shadow-xl overflow-hidden">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
      <Users size={80} strokeWidth={1} />
    </div>
    <div className="relative z-10">
      <h4 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{name}</h4>
      <p className="text-blue-500 font-mono text-xs uppercase tracking-widest mb-4">{role}</p>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        {bio}
      </p>
      <div className="flex gap-3">
        <a href={github} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
          <ExternalLink size={18} />
        </a>
        <a href={linkedin} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-blue-400 hover:bg-white/10 transition-all">
          <Globe size={18} />
        </a>
      </div>
    </div>
  </div>
);

const TechBadge = ({ children }) => (
  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-mono uppercase tracking-wider">
    {children}
  </span>
);

export default function AboutPage() {
  const team = [
    { 
      name: "Krish Kumar", 
      role: "AI & Full Stack Developer",
      bio: "Architect of the SkyRanger AI core. Specialized in high-performance computer vision pipelines and real-time GCS dashboard development.",
      github: "#",
      linkedin: "#"
    },
    { 
      name: "Swastika Kumari", 
      role: "ML Engineer",
      bio: "Expert in defect detection models and thermal anomaly identification. Lead developer for the infrastructure health monitoring algorithms.",
      github: "#",
      linkedin: "#"
    },
    { 
      name: "Rudra Bishwakarma", 
      role: "Hardware Engineer",
      bio: "Specializing in drone hardware integration and flight control systems. Expert in Pixhawk/MAVLink communication stacks and sensor fusion.",
      github: "#",
      linkedin: "#"
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#060b14] scroll-smooth">
      
      {/* Hero Section */}
      <div className="relative min-h-[65vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/about-hero-infra.png" 
            alt="SkyRanger Infrastructure Inspection" 
            className="w-full h-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-[#060b14]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060b14] via-transparent to-[#060b14]" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-[0.2em] animate-pulse">
            <Shield size={14} /> Autonomous Infrastructure Guard
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none">
            SKYRANGER<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">INTELLIGENCE</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed">
            The future of critical asset monitoring. AI-powered autonomous drones for precision inspection of power lines, bridges, and industrial facilities.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 group">
              Explore Documentation <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all">
              View Hardware Stack
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24 space-y-32">
        
        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 w-fit mb-6 group-hover:scale-110 transition-transform">
              <Zap size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Grid Monitoring</h3>
            <p className="text-gray-400 leading-relaxed">
              Automated high-voltage power line inspection with thermal anomaly detection to identify hotspots and prevent equipment failure.
            </p>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 w-fit mb-6 group-hover:scale-110 transition-transform">
              <Search size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Defect Identification</h3>
            <p className="text-gray-400 leading-relaxed">
              Real-time AI analysis of structural integrity for bridges and towers, detecting cracks, corrosion, and material fatigue with sub-centimeter precision.
            </p>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
            <div className="p-4 bg-cyan-500/10 rounded-2xl text-cyan-400 w-fit mb-6 group-hover:scale-110 transition-transform">
              <HardDrive size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Asset Management</h3>
            <p className="text-gray-400 leading-relaxed">
              Continuous monitoring of industrial facilities and pipelines, providing actionable insights for predictive maintenance and safety compliance.
            </p>
          </div>
        </section>

        {/* Inspection Workflow */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Mission Workflow</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">From tactical deployment to actionable reporting: The SkyRanger inspection lifecycle.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-0" />
            
            {[
              { step: "01", title: "Tactical Pathing", desc: "Autonomous flight along predefined power grids or dynamically generated structural sweep paths.", icon: <Globe /> },
              { step: "02", title: "Edge Inspection", desc: "Raspberry Pi 5 runs YOLOv8 models locally to identify defects and anomalies in real-time.", icon: <Cpu /> },
              { step: "03", title: "Intelligent Relay", desc: "Inspection data and HD video streams are relayed to the GCS via latency-optimized protocols.", icon: <Radio /> },
              { step: "04", title: "Insight Generation", desc: "System generates comprehensive reports with GPS-tagged defect logs for maintenance teams.", icon: <Target /> }
            ].map((item, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#0d1525] border-2 border-blue-500/50 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  {item.icon}
                </div>
                <div className="space-y-2">
                  <span className="text-blue-500 font-mono text-sm font-bold tracking-widest">{item.step}</span>
                  <h4 className="text-xl font-bold text-white">{item.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Architecture */}
        <section className="bg-gradient-to-br from-[#1e283c]/40 to-[#0f1928]/60 border border-white/5 rounded-[3rem] p-8 md:p-16 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-white">System Architecture</h2>
                <p className="text-gray-400 leading-relaxed">
                  SkyRanger utilizes a decoupled edge-cloud architecture to ensure stable flight control while maintaining high-throughput AI analysis.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-6 items-start">
                  <div className="p-3 bg-white/5 rounded-xl text-blue-400"><Server size={24} /></div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-lg">Edge Infrastructure</h4>
                    <p className="text-sm text-gray-400">High-performance Raspberry Pi 5 node managing AI vision pipelines and multi-spectral sensor streams.</p>
                  </div>
                </div>
                <div className="flex gap-6 items-start">
                  <div className="p-3 bg-white/5 rounded-xl text-purple-400"><Network size={24} /></div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-lg">Flight Control Matrix</h4>
                    <p className="text-sm text-gray-400">Pixhawk 6C flight core communicating via MAVLink for stable autonomous navigation in varying environments.</p>
                  </div>
                </div>
                <div className="flex gap-6 items-start">
                  <div className="p-3 bg-white/5 rounded-xl text-cyan-400"><Database size={24} /></div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-lg">Real-time GCS Dashboard</h4>
                    <p className="text-sm text-gray-400">A React-based command station providing live telemetry, 3D mapping, and automated inspection reporting.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-xl font-bold text-white border-b border-white/5 pb-4">Inspection Technology Stack</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h5 className="text-xs font-mono uppercase tracking-widest text-gray-500">Vision & AI</h5>
                  <div className="flex flex-wrap gap-2">
                    {["YOLOv11", "OpenCV", "TensorRT", "Thermal Vision"].map(t => <TechBadge key={t}>{t}</TechBadge>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="text-xs font-mono uppercase tracking-widest text-gray-500">Autonomous Core</h5>
                  <div className="flex flex-wrap gap-2">
                    {["MAVLink", "ArduPilot", "Path Finding", "Lidar Sync"].map(t => <TechBadge key={t}>{t}</TechBadge>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="text-xs font-mono uppercase tracking-widest text-gray-500">Communications</h5>
                  <div className="flex flex-wrap gap-2">
                    {["WebRTC", "WebSockets", "FastAPI", "Protobuf"].map(t => <TechBadge key={t}>{t}</TechBadge>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="text-xs font-mono uppercase tracking-widest text-gray-500">Analytics</h5>
                  <div className="flex flex-wrap gap-2">
                    {["Recharts", "Leaflet", "GeoJSON", "PDF Reporting"].map(t => <TechBadge key={t}>{t}</TechBadge>)}
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <p className="text-xs text-blue-400/80 font-mono leading-relaxed italic">
                  "System specifically engineered for 24/7 industrial uptime and high-accuracy defect detection in hard-to-reach zones."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Development Team */}
        <section className="space-y-12 pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Development Team</h2>
              <p className="text-gray-400 max-w-xl">
                A multi-disciplinary team from Jaypee University of Engineering and Technology, Guna, dedicated to advancing autonomous industrial inspection.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <TeamMember key={idx} {...member} />
            ))}
          </div>
        </section>
      </div>

      {/* Footer CTA */}
      <div className="bg-[#0a111e] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
              <Layers className="text-white" size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-lg leading-none">SkyRanger Inspection</h4>
              <p className="text-gray-500 text-sm mt-1">Autonomous Industrial Robotics Project</p>
            </div>
          </div>
          <div className="text-gray-500 text-sm font-mono tracking-widest">
            © 2026 CODE SRIJAN · HACKATHON EDITION
          </div>
        </div>
      </div>
    </div>
  );
}
