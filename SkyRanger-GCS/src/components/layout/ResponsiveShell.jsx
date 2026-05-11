import { useState, useEffect } from "react"
import { Menu, X, Activity, Camera, Cpu, Compass, Info, LayoutDashboard, Zap, Shield, Radio, Wifi, Battery, Clock } from "lucide-react"

const NAV_ITEMS = [
  { id: "DASHBOARD", label: "DASHBOARD", icon: LayoutDashboard },
  { id: "SENSORS", label: "SENSORS", icon: Activity },
  { id: "CAMERA", label: "AI INSIGHTS", icon: Camera },
  { id: "SYSTEM", label: "SYSTEM", icon: Cpu },
  { id: "MISSION", label: "MISSION", icon: Compass },
  { id: "ABOUT", label: "ABOUT", icon: Info },
]

export function TopNavbar({ onMenuClick, connected, reconnecting, telemetry }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <nav className="flex items-center justify-between px-4 py-2 border-b border-blue-500/10 bg-[#070b14]/95 backdrop-blur-xl z-50 h-14">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-blue-500/10 text-blue-400/70 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Zap size={16} className="text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
          </div>
          <div className="flex flex-col">
            <span className="font-outfit text-xs font-black tracking-[0.2em] uppercase text-white leading-none">SKYRANGER</span>
            <span className="font-mono text-[9px] text-blue-500/60 uppercase tracking-widest mt-0.5 font-bold">GCS TACTICAL v2.0</span>
          </div>
        </div>
      </div>

      {/* Center Stats HUD - Desktop Only */}
      <div className="hidden md:flex items-center gap-6 px-6 py-1.5 bg-black/40 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2">
          <Wifi size={12} className={connected ? "text-blue-400" : "text-red-500"} />
          <div className="flex flex-col">
            <span className="font-mono text-[8px] text-gray-500 uppercase leading-none">LINK</span>
            <span className={`font-mono text-[10px] font-bold ${connected ? "text-blue-400" : "text-red-500"}`}>{connected ? "95.4Mbps" : "OFFLINE"}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-white/5" />
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-gray-500" />
          <div className="flex flex-col">
            <span className="font-mono text-[8px] text-gray-500 uppercase leading-none">UTC</span>
            <span className="font-mono text-[10px] font-bold text-gray-300">{time.toLocaleTimeString([], { hour12: false })}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-white/5" />
        <div className="flex items-center gap-2">
          <Battery size={12} className={telemetry.battery_remaining < 20 ? "text-red-500 animate-pulse" : "text-green-500"} />
          <div className="flex flex-col">
            <span className="font-mono text-[8px] text-gray-500 uppercase leading-none">CELL</span>
            <span className={`font-mono text-[10px] font-bold ${telemetry.battery_remaining < 20 ? "text-red-500" : "text-gray-300"}`}>{telemetry.battery_voltage?.toFixed(1) || "0.0"}V</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all duration-500 ${connected ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-blue-400 shadow-[0_0_8px_#3b82f6]" : "bg-red-500 animate-pulse"}`} />
          <span className="font-mono text-[10px] font-bold tracking-widest hidden xs:inline">{connected ? "STREAM ACTIVE" : reconnecting ? "RECONNECTING" : "NO LINK"}</span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1.5 rounded-xl font-mono text-[10px] font-black tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          {telemetry.flight_mode || "DISCONNECTED"}
        </div>
      </div>
    </nav>
  )
}

export function DesktopSidebar({ page, setPage }) {
  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-white/5 bg-[#070b14] shrink-0 overflow-y-auto">
      <div className="flex flex-col gap-1 p-3 mt-4">
        <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-gray-600 mb-4 px-3 font-bold">Command Menu</div>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 group ${isActive
                  ? "bg-blue-600/10 border-blue-500/30 text-white shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]"
                  : "border-transparent text-gray-500 hover:bg-white/[0.03] hover:text-gray-300"
                }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-transparent text-gray-600 group-hover:text-gray-400"}`}>
                <Icon size={16} />
              </div>
              <span className={`font-mono text-[10px] tracking-[0.15em] font-bold uppercase transition-colors ${isActive ? "text-white" : "text-gray-600 group-hover:text-gray-400"}`}>{label}</span>
              {isActive && <div className="ml-auto w-1 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
            </button>
          )
        })}
      </div>

      <div className="mt-auto p-4 space-y-4">
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8px] text-gray-500 uppercase font-bold">Signal Int.</span>
            <span className="font-mono text-[9px] text-blue-400 font-bold">98%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" style={{ width: "98%" }} />
          </div>
        </div>
        <div className="flex items-center justify-center py-4 opacity-20 border-t border-white/5">
          <Radio size={14} className="text-blue-500" />
        </div>
      </div>
    </aside>
  )
}

export function MobileSidebar({ page, setPage, onClose, isOpen }) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[60] lg:hidden transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#070b14] border-r border-blue-500/10 z-[70] flex flex-col shadow-2xl lg:hidden transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Zap size={16} className="text-blue-400" />
            </div>
            <span className="font-outfit text-sm font-black tracking-widest text-white uppercase">SKYRANGER GCS</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2 p-4 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setPage(id); onClose(); }}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${page === id
                  ? "bg-blue-600/10 border-blue-500/30 text-white shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                  : "border-transparent text-gray-500 hover:bg-white/5"
                }`}
            >
              <Icon size={20} className={page === id ? "text-blue-400" : "text-gray-600"} />
              <span className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase">{label}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}

export function ResponsiveShell({ children, page, setPage, connected, reconnecting, telemetry }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#020617] text-gray-200 selection:bg-blue-500/30">
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-[0.03]" />
      <TopNavbar
        onMenuClick={() => setMobileMenuOpen(true)}
        connected={connected}
        reconnecting={reconnecting}
        telemetry={telemetry}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <DesktopSidebar page={page} setPage={setPage} />
        <MobileSidebar
          page={page}
          setPage={setPage}
          onClose={() => setMobileMenuOpen(false)}
          isOpen={mobileMenuOpen}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
          <div className="absolute inset-0 scanlines pointer-events-none opacity-[0.02]" />
          {children}
        </main>
      </div>
    </div>
  )
}
