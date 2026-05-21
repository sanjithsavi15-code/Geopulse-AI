import React, { useState, useEffect, useCallback } from "react";

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  nominal: {
    label: "Nominal",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
    pulse: true,
  },
  anomaly: {
    label: "Anomaly Detected",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
    dot: "bg-rose-500",
    pulse: true,
  },
  rerouting: {
    label: "Rerouting…",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    dot: "bg-amber-400",
    pulse: true,
  },
  offline: {
    label: "Offline",
    color: "text-slate-500",
    bg: "bg-slate-700/30",
    border: "border-slate-600/20",
    dot: "bg-slate-600",
    pulse: false,
  },
};

// ─── Metric Row ────────────────────────────────────────────────────────────────
function MetricRow({ label, value, unit, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-white" : "text-slate-200"}`}>
        {value}
        {unit && (
          <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>
        )}
      </span>
    </div>
  );
}

// ─── Thermal Timer Display ─────────────────────────────────────────────────────
function ThermalTimer({ seconds, isAnomaly }) {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;

  return (
    <div className="flex flex-col items-center py-6">
      {/* Label */}
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
        Thermal Timer
      </span>

      {/* Big number display */}
      <div className="relative flex items-baseline gap-1">
        <span
          className={`
            text-7xl font-black tabular-nums leading-none tracking-tight
            transition-colors duration-300
            ${isAnomaly ? "text-rose-400" : "text-white"}
          `}
        >
          {String(mins).padStart(2, "0")}
        </span>
        <span className={`text-4xl font-black leading-none mb-1 ${isAnomaly ? "text-rose-500/50" : "text-slate-600"}`}>
          :
        </span>
        <span
          className={`
            text-7xl font-black tabular-nums leading-none tracking-tight
            transition-colors duration-300
            ${isAnomaly ? "text-rose-400" : "text-white"}
          `}
        >
          {String(secs).padStart(2, "0")}
        </span>
      </div>

      {/* Min / Sec labels */}
      <div className="flex items-center gap-8 mt-2">
        <span className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold">min</span>
        <span className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold">sec</span>
      </div>

      {/* Progress bar */}
      <div className="w-full mt-5 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isAnomaly
              ? "bg-rose-500"
              : seconds > 120
              ? "bg-emerald-500"
              : seconds > 60
              ? "bg-amber-400"
              : "bg-rose-500"
          }`}
          style={{ width: `${Math.min(100, (seconds / 300) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Inject Anomaly Button ─────────────────────────────────────────────────────
function AnomalyButton({ onInject, isActive, isLoading }) {
  return (
    <button
      onClick={onInject}
      disabled={isLoading}
      className={`
        relative w-full py-4 rounded-full
        text-sm font-bold uppercase tracking-[0.12em]
        transition-all duration-200 ease-out
        active:scale-95 hover:scale-[1.02]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        overflow-hidden group
        ${
          isActive
            ? "bg-rose-500 hover:bg-rose-400 text-white focus-visible:ring-rose-500 shadow-lg shadow-rose-500/25"
            : "bg-white hover:bg-slate-100 text-slate-900 focus-visible:ring-white shadow-lg shadow-white/10"
        }
      `}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative flex items-center justify-center gap-2.5">
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Injecting…</span>
          </>
        ) : isActive ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>Anomaly Active</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span>Inject Network Anomaly</span>
          </>
        )}
      </div>
    </button>
  );
}

// ─── Vehicle Header ────────────────────────────────────────────────────────────
function VehicleHeader({ vehicleId, status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.nominal;
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
      <div>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">
          Active Vehicle
        </p>
        <h2 className="text-base font-bold text-white tracking-tight">
          {vehicleId || "VEH-0042"}
        </h2>
      </div>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border}`}>
        <div className="relative flex items-center justify-center w-2 h-2">
          {cfg.pulse && (
            <span className={`absolute inline-flex w-full h-full rounded-full ${cfg.dot} opacity-60 animate-ping`} />
          )}
          <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main TelemetryDash Component ─────────────────────────────────────────────
export default function TelemetryDash({
  vehicleData = {},
  thermalTimer = 0,
  isAnomalyActive = false,
  isLoading = false,
  onInjectAnomaly,
}) {
  const {
    vehicleId,
    status = "nominal",
    speed = 0,
    battery = 0,
    signal = 0,
    lat = 0,
    lng = 0,
    currentRoute = "—",
    eta = "—",
  } = vehicleData;

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 border border-white/5 overflow-hidden">

      {/* ── Vehicle Header ── */}
      <VehicleHeader vehicleId={vehicleId} status={isAnomalyActive ? "anomaly" : status} />

      {/* ── Thermal Timer (Focal Point) ── */}
      <div className="px-5 border-b border-white/5">
        <ThermalTimer seconds={thermalTimer} isAnomaly={isAnomalyActive} />
      </div>

      {/* ── Metrics Grid ── */}
      <div className="px-5 py-2 flex-1">
        <MetricRow label="Speed" value={speed} unit="km/h" />
        <MetricRow label="Battery" value={`${battery}%`} highlight={battery < 20} />
        <MetricRow label="Signal" value={`${signal}%`} />
        <MetricRow label="Route" value={currentRoute} />
        <MetricRow label="ETA" value={eta} highlight />
        <MetricRow
          label="Position"
          value={lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "—"}
        />
      </div>

      {/* ── Inject Anomaly CTA ── */}
      <div className="px-5 pb-5 pt-3">
        <AnomalyButton
          onInject={onInjectAnomaly}
          isActive={isAnomalyActive}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
