export default function MissionPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#020617] relative">
      <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border border-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
        </div>
        <h1 className="font-mono text-[10px] text-blue-500/40 uppercase tracking-[0.4em] font-black">
          Mission System Offline
        </h1>
      </div>
    </div>
  );
}