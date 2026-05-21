import React, { useEffect, useRef } from "react";

function LiveIndicator({ isActive }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="relative w-2.5 h-2.5 flex items-center justify-center">
        {isActive && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
      </div>
      <span className={`text-xs font-semibold ${isActive ? "text-emerald-400" : "text-slate-500"}`}>
        {isActive ? "LIVE" : "IDLE"}
      </span>
    </div>
  );
}

export default function AgentSidebar({ logs = [], isLoopActive = false }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 border border-white/5 overflow-hidden">

      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-bold text-white tracking-tight">
          AI Reasoning Loop
        </h2>
        <LiveIndicator isActive={isLoopActive} />
      </div>

      <div className="px-5 pb-5">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto max-h-[300px] mt-4 space-y-3 custom-scrollbar"
        >
          {logs && logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={log?.id ?? `${log.agent}-${index}`} className="flex flex-col gap-1 p-3 rounded-lg bg-slate-800 border border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {log.agent || "System"}
                </span>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">{log.message}</p>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500 italic">Awaiting telemetry data...</div>
          )}
        </div>
      </div>
    </div>
  );
}
