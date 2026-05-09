import { Users, Target, Layers, Code, Cpu, ExternalLink } from "lucide-react";
export default function AboutPage() {
  const team = [
    { name: "Krish Kumar", role: "AI & Full Stack Developer" },
    { name: "Swastika Kumari", role: "ML Engineer" },
    { name: "Rudra Bishwakarma", role: "Hardware Engineer" }
  ]

  return (
    <div className="flex-1 flex flex-col gap-12 p-6 sm:p-10 lg:p-16 overflow-y-auto custom-scrollbar bg-[#060b14]">

      {/* Hero Header */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
          SkyRanger <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8">Intelligence</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto font-medium">
          An autonomous, AI-powered drone intelligence framework designed for real-time disaster response and hazard mitigation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto w-full">
        {/* Problem Statement */}
        <div className="bg-gradient-to-br from-[#1e283c]/60 to-[#0f1928]/80 border border-white/5 rounded-[2rem] p-8 sm:p-12 shadow-2xl flex flex-col hover:border-blue-500/20 transition-all duration-500">
          <div className="flex items-center gap-5 mb-8">
            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400"><Target size={32} /></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Mission Objective</h2>
          </div>
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-blue-500 uppercase font-bold mb-6">Smart Disaster Response Robots with AI Navigation</h3>
          <div className="space-y-6 text-gray-400 leading-relaxed text-base sm:text-lg">
            <p>
              During natural disasters such as earthquakes, fires, or floods, rescue operations are often risky and time-sensitive. Human responders face extreme dangers in accessing affected and unstable areas.
            </p>
            <p>
              This project develops AI-enabled disaster response robotics that can autonomously navigate hazardous environments using computer vision and edge computing. SkyRanger locates survivors, calculates mission sweeps, and directly assists rescue teams—reducing risk and fundamentally improving reaction times.
            </p>
          </div>
        </div>

        {/* Team Details */}
        <div className="bg-gradient-to-br from-[#1e283c]/60 to-[#0f1928]/80 border border-white/5 rounded-[2rem] p-8 sm:p-12 shadow-2xl hover:border-green-500/20 transition-all duration-500">
          <div className="flex items-center gap-5 mb-8">
            <div className="p-4 bg-green-500/10 rounded-2xl text-green-400"><Users size={32} /></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Development Team</h2>
          </div>
          <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase mb-8 pb-4 border-b border-white/5">
            Jaypee University of Engineering and Technology, Guna
          </div>
          <div className="space-y-4">
            {team.map(member => (
              <div key={member.name} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group">
                <div>
                  <div className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{member.name}</div>
                  <div className="text-sm text-gray-500 font-medium mt-1">{member.role}</div>
                </div>
                <div className="flex gap-3">
                  <button className="p-2.5 bg-white/5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all"><Github size={18} /></button>
                  <button className="p-2.5 bg-white/5 rounded-xl text-gray-500 hover:text-blue-400 hover:bg-white/10 transition-all"><Linkedin size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto w-full mb-12">
        {/* Architecture */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Layers size={22} /></div>
            <h3 className="text-xl font-bold text-white">Architecture</h3>
          </div>
          <ul className="space-y-4 text-sm text-gray-400 leading-relaxed">
            <li className="flex gap-3"><span className="text-purple-500 font-bold shrink-0">01</span><span><strong className="text-gray-300">Edge Node:</strong> Raspberry Pi 5 handles real-time CV streams and localized telemetry.</span></li>
            <li className="flex gap-3"><span className="text-purple-500 font-bold shrink-0">02</span><span><strong className="text-gray-300">Flight Core:</strong> Pixhawk executes low-level mission logic via MAVLink protocol.</span></li>
            <li className="flex gap-3"><span className="text-purple-500 font-bold shrink-0">03</span><span><strong className="text-gray-300">AI Compute:</strong> YOLOv8 engine for sub-millisecond survivor detection.</span></li>
          </ul>
        </div>

        {/* Tech Stack */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Code size={22} /></div>
            <h3 className="text-xl font-bold text-white">Stack Specs</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {["React.js", "FastAPI", "Python 3.13", "YOLOv8", "OpenCV", "PyTorch", "MAVLink", "WebSockets", "Tailwind"].map(t => (
              <span key={t} className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-[10px] text-gray-400 font-mono tracking-widest uppercase">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><Cpu size={22} /></div>
            <h3 className="text-xl font-bold text-white">Capabilities</h3>
          </div>
          <ul className="space-y-4 text-sm text-gray-400 leading-relaxed">
            <li className="flex gap-3 text-cyan-500/80 italic"><span>- Real-time CV overlaid on latency-optimized stream matrix.</span></li>
            <li className="flex gap-3 text-cyan-500/80 italic"><span>- Autonomous waypoint mission generation via sweep patterns.</span></li>
            <li className="flex gap-3 text-cyan-500/80 italic"><span>- Human detection algorithms tuned for SAR operations.</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
