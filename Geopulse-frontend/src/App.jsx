import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import TelemetryDash from "./components/TelemetryDash";
import AgentSidebar from "./components/AgentSidebar";

// ─── Constants ─────────────────────────────────────────────────────────────────
// In dev, use Vite proxy (same origin). In prod, hit backend directly.
const API_BASE = import.meta.env.DEV ? "" : "http://localhost:8000";

function apiErrorMessage(err, fallback = "Request failed.") {
  if (err.response?.data?.detail) {
    const d = err.response.data.detail;
    return typeof d === "string" ? d : JSON.stringify(d);
  }
  if (err.response) return `Server error (${err.response.status})`;
  if (err.request) return "Cannot reach backend — is it running on port 8000?";
  return err.message || fallback;
}
const POLL_INTERVAL_MS = 3000;

const LOCATIONS = [
  { id: "Malleswaram",     label: "Malleswaram",     lat: 13.0031, lng: 77.5643 },
  { id: "Hebbal",          label: "Hebbal",          lat: 13.0354, lng: 77.5988 },
  { id: "Majestic",        label: "Majestic",        lat: 12.9767, lng: 77.5713 },
  { id: "MG_Road",         label: "MG Road",         lat: 12.9733, lng: 77.6117 },
  { id: "Indiranagar",     label: "Indiranagar",     lat: 12.9719, lng: 77.6412 },
  { id: "Whitefield",      label: "Whitefield",      lat: 12.9698, lng: 77.7500 },
  { id: "Jayanagar",       label: "Jayanagar",       lat: 12.9250, lng: 77.5938 },
  { id: "Koramangala",     label: "Koramangala",     lat: 12.9352, lng: 77.6245 },
  { id: "HSR_Layout",      label: "HSR Layout",      lat: 12.9105, lng: 77.6450 },
  { id: "Electronic_City", label: "Electronic City", lat: 12.8452, lng: 77.6632 },
];

function nodeNameToLatLng(name) {
  if (typeof name !== "string") return null;
  const loc = LOCATIONS.find(
    (l) => l.id === name || l.id === name.replace(/ /g, "_") || l.label === name
  );
  return loc ? [loc.lat, loc.lng] : null;
}

/** Normalise any backend route shape → [[lat, lng], ...] */
function parseRouteToLatLng(raw) {
  if (raw == null) return null;
  if (!Array.isArray(raw)) {
    if (Array.isArray(raw?.coordinates)) return parseRouteToLatLng(raw.coordinates);
    if (raw.lat != null && raw.lng != null) return [[Number(raw.lat), Number(raw.lng)]];
    if (raw.latitude != null && raw.longitude != null) return [[Number(raw.latitude), Number(raw.longitude)]];
    return null;
  }
  if (raw.length < 2) return null;
  const mapped = raw
    .map((p) => {
      if (Array.isArray(p) && p.length >= 2) {
        const lat = Number(p[0]);
        const lng = Number(p[1]);
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
      }
      if (typeof p === "string") return nodeNameToLatLng(p);
      if (p == null) return null;
      if (p.lat != null && p.lng != null) return [Number(p.lat), Number(p.lng)];
      if (p.lat != null && p.lon != null) return [Number(p.lat), Number(p.lon)];
      if (p.latitude != null && p.longitude != null) return [Number(p.latitude), Number(p.longitude)];
      if (p.node != null) return nodeNameToLatLng(p.node);
      if (p.name != null) return nodeNameToLatLng(p.name);
      return null;
    })
    .filter((c) => c && Number.isFinite(c[0]) && Number.isFinite(c[1]));
  return mapped.length >= 2 ? mapped : null;
}

// ─── Map tile URL (dark Uber-style) ───────────────────────────────────────────
const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// ─── Fix Leaflet default icon paths (common CRA/Vite issue) ───────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ─── Custom SVG marker factory ─────────────────────────────────────────────────
function createMarkerIcon(color, shape = "circle") {
  const svg =
    shape === "circle"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
           <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2.5"/>
         </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
           <rect x="3" y="3" width="14" height="14" rx="3" fill="${color}" stroke="white" stroke-width="2.5"/>
         </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// ─── Location Selector (Ride-hailing style) ────────────────────────────────────
function LocationInput({ label, icon, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.id === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${open ? "z-[999]" : "z-auto"}`}>
      {/* Input trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-3 w-full px-4 py-3
          bg-white/10 backdrop-blur-sm hover:bg-white/15
          border border-white/10 hover:border-white/20
          rounded-2xl transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
          text-left
        `}
      >
        {/* Icon slot */}
        <span className="shrink-0">{icon}</span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
            {label}
          </p>
          <p className="text-sm font-semibold text-white truncate">
            {selected?.label || "Select location…"}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[999] left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">
          <ul
            className="
              max-h-60 overflow-y-auto
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-slate-600
              [&::-webkit-scrollbar-thumb]:rounded-full
            "
          >
            {options.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <li key={opt.id}>
                  <button
                    onClick={() => { onChange(opt.id); setOpen(false); }}
                    className={`
                      flex items-center gap-3 w-full px-4 py-3 text-left
                      cursor-pointer transition-colors duration-100
                      ${isSelected ? "bg-slate-700" : "hover:bg-slate-700/70"}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {opt.lat.toFixed(4)}, {opt.lng.toFixed(4)}
                      </p>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Route Button ──────────────────────────────────────────────────────────────
function RouteButton({ onClick, isLoading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        w-full py-3.5 rounded-full text-sm font-bold uppercase tracking-[0.1em]
        transition-all duration-200 active:scale-95 hover:scale-[1.02]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-offset-transparent focus-visible:ring-white
        bg-white text-slate-900 hover:bg-slate-100
        shadow-lg shadow-black/30
      `}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Calculating Route…
        </span>
      ) : (
        "Calculate Optimal Route"
      )}
    </button>
  );
}

// ─── Toast Notification ────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl shadow-black/50
        border backdrop-blur-xl text-sm font-medium
        animate-in slide-in-from-bottom-4 duration-300
        ${type === "error"
          ? "bg-rose-900/90 border-rose-500/30 text-rose-100"
          : "bg-slate-800/90 border-white/10 text-white"
        }
      `}
    >
      {type === "error"
        ? <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        : <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      }
      {message}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [origin, setOrigin] = useState("Majestic");
  const [destination, setDestination] = useState("Electronic_City");
  const [routeData, setRouteData] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [abandonedRoute, setAbandonedRoute] = useState(null);
  const [logs, setLogs] = useState([]);
  const [vehicleData, setVehicleData] = useState({
    vehicleId: "VEH-0042",
    status: "nominal",
    speed: 0,
    battery: 87,
    signal: 94,
    lat: 12.9716,
    lng: 77.5946,
    currentRoute: "—",
    eta: "—",
  });
  const [thermalTimer, setThermalTimer] = useState(0);
  const [isAnomalyActive, setIsAnomalyActive] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(false);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const abandonedRouteLayerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const normalizeLogEntry = useCallback((log, index = 0) => {
    if (typeof log === "string") {
      const match = log.match(/^\[(Orchestrator|Adversarial|Scout)\]\s*/i);
      return {
        id: `log-${Date.now()}-${index}-${Math.random()}`,
        agent: match ? match[1] : "System",
        message: match ? log.slice(match[0].length).trim() : log,
      };
    }
    const rawMessage = log?.message ?? log?.text ?? String(log ?? "");
    const bracketMatch = rawMessage.match(/^\[(Orchestrator|Adversarial|Scout)\]\s*/i);
    return {
      id: log?.id ?? `log-${Date.now()}-${index}-${Math.random()}`,
      agent: log?.agent ?? (bracketMatch ? bracketMatch[1] : "System"),
      message: bracketMatch ? rawMessage.slice(bracketMatch[0].length).trim() : rawMessage,
    };
  }, []);

  const addLog = useCallback((message) => {
    setLogs((prev) => [...prev, normalizeLogEntry(message, prev.length)]);
  }, [normalizeLogEntry]);

  const safeActiveRoute = useMemo(() => {
    if (!activeRoute || !Array.isArray(activeRoute) || activeRoute.length < 2) return [];
    const parsed = parseRouteToLatLng(activeRoute);
    return parsed ?? [];
  }, [activeRoute]);

  const safeAbandonedRoute = useMemo(() => {
    if (!abandonedRoute || !Array.isArray(abandonedRoute) || abandonedRoute.length < 2) return [];
    const parsed = parseRouteToLatLng(abandonedRoute);
    return parsed ?? [];
  }, [abandonedRoute]);

  const applyRouteResponse = useCallback((responseData, { originLoc, destLoc, anomalyActive }) => {
    setActiveRoute(responseData.active_route ?? null);
    setAbandonedRoute(responseData.abandoned_route ?? null);
    setRouteData(responseData);
    setIsAnomalyActive(anomalyActive);
    setLogs(
      Array.isArray(responseData.logs)
        ? responseData.logs.map((log, i) => normalizeLogEntry(log, i))
        : [],
    );
    setThermalTimer(responseData.thermalTimer ?? responseData.thermal_timer ?? 300);
    setVehicleData((prev) => ({
      ...prev,
      status: anomalyActive ? "rerouting" : "nominal",
      currentRoute: anomalyActive
        ? `${originLoc.label} → ${destLoc.label} (DETOUR)`
        : `${originLoc.label} → ${destLoc.label}`,
      eta: responseData.eta ?? responseData.estimated_eta ?? prev.eta,
      speed: responseData.averageSpeed ?? (anomalyActive ? prev.speed : 42),
      lat: originLoc.lat,
      lng: originLoc.lng,
    }));
  }, [normalizeLogEntry]);

  // Clear stale routes when pickup or dropoff changes
  useEffect(() => {
    setActiveRoute(null);
    setAbandonedRoute(null);
    setRouteData(null);
    setIsAnomalyActive(false);
    setLogs([]);
    setIsLoopActive(false);
  }, [origin, destination]);

  // ── Leaflet Map Initialization ─────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom controls (positioned bottom-right)
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Update markers when origin/destination changes ─────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const originLoc = LOCATIONS.find((l) => l.id === origin);
    const destLoc = LOCATIONS.find((l) => l.id === destination);

    // Origin marker
    if (originMarkerRef.current) originMarkerRef.current.remove();
    if (originLoc) {
      originMarkerRef.current = L.marker([originLoc.lat, originLoc.lng], {
        icon: createMarkerIcon("#10b981", "circle"),
        title: originLoc.label,
      })
        .addTo(map)
        .bindPopup(`<b>Origin:</b> ${originLoc.label}`);
    }

    // Destination marker
    if (destMarkerRef.current) destMarkerRef.current.remove();
    if (destLoc) {
      destMarkerRef.current = L.marker([destLoc.lat, destLoc.lng], {
        icon: createMarkerIcon("#f43f5e", "square"),
        title: destLoc.label,
      })
        .addTo(map)
        .bindPopup(`<b>Destination:</b> ${destLoc.label}`);
    }

    // Fit bounds
    if (originLoc && destLoc) {
      map.fitBounds(
        [[originLoc.lat, originLoc.lng], [destLoc.lat, destLoc.lng]],
        { padding: [80, 80] }
      );
    }
  }, [origin, destination]);

  // ── Draw route polylines on map ────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current)          { routeLayerRef.current.remove();          routeLayerRef.current = null; }
    if (abandonedRouteLayerRef.current) { abandonedRouteLayerRef.current.remove(); abandonedRouteLayerRef.current = null; }

    if (safeActiveRoute.length === 0 && safeAbandonedRoute.length === 0) return;

    // 1. Red dashed — blocked / abandoned route (only when backend sent valid coords)
    if (safeAbandonedRoute.length >= 2) {
      abandonedRouteLayerRef.current = L.polyline(safeAbandonedRoute, {
        color:     "#ef4444",
        weight:    4,
        opacity:   isAnomalyActive ? 0.9 : 0.45,
        lineCap:   "round",
        lineJoin:  "round",
        dashArray: "10, 10",
      }).addTo(map);
    }

    // 2. Green dotted — active detour route (drawn on top of abandoned)
    if (safeActiveRoute.length >= 2) {
      routeLayerRef.current = L.polyline(safeActiveRoute, {
        color:    isAnomalyActive ? "#22c55e" : "#4ade80",
        weight:   isAnomalyActive ? 7 : 5,
        opacity:  1,
        lineCap:  "round",
        lineJoin: "round",
        ...(isAnomalyActive ? { dashArray: "2, 8" } : {}),
      }).addTo(map);
      routeLayerRef.current.bringToFront();
    }

    const drawn = [routeLayerRef.current, abandonedRouteLayerRef.current].filter(Boolean);
    if (drawn.length > 0) {
      map.fitBounds(L.featureGroup(drawn).getBounds(), { padding: [70, 70] });
    }
  }, [safeActiveRoute, safeAbandonedRoute, isAnomalyActive]);

  // ── Vehicle marker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !vehicleData.lat || !vehicleData.lng) return;

    const vehicleIcon = L.divIcon({
      html: `<div style="
        width:36px;height:36px;border-radius:50%;
        background:${isAnomalyActive ? "#f43f5e" : "#3b82f6"};
        border:3px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M13.5 2c-5.621 0-10.211 4.443-10.475 10h-3.025l5 6.625 5-6.625h-2.975c.257-3.351 3.06-6 6.475-6 3.584 0 6.5 2.916 6.5 6.5s-2.916 6.5-6.5 6.5c-1.863 0-3.542-.793-4.728-2.053l-2.427 3.216c1.877 1.754 4.389 2.837 7.155 2.837 5.79 0 10.5-4.71 10.5-10.5s-4.71-10.5-10.5-10.5z"/>
        </svg>
      </div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([vehicleData.lat, vehicleData.lng]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    } else {
      vehicleMarkerRef.current = L.marker(
        [vehicleData.lat, vehicleData.lng],
        { icon: vehicleIcon, title: vehicleData.vehicleId }
      )
        .addTo(map)
        .bindPopup(`<b>${vehicleData.vehicleId}</b><br/>Speed: ${vehicleData.speed} km/h`);
    }
  }, [vehicleData, isAnomalyActive]);

  // ── Thermal timer countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (thermalTimer > 0) {
      timerRef.current = setInterval(() => {
        setThermalTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [thermalTimer]);

  // ── Vehicle telemetry polling ──────────────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/vehicle/telemetry`);
        if (res.data) setVehicleData((prev) => ({ ...prev, ...res.data }));
      } catch {
        // Fail silently on polling errors
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Fetch Route ────────────────────────────────────────────────────────────
  const handleCalculateRoute = useCallback(async () => {
    const originLoc = LOCATIONS.find((l) => l.id === origin);
    const destLoc = LOCATIONS.find((l) => l.id === destination);
    if (!originLoc || !destLoc) return;

    setIsRouteLoading(true);
    setIsLoopActive(true);
    addLog("[Orchestrator] Initiating route calculation pipeline…");
    addLog(`[Scout] Scanning waypoints from ${originLoc.label} → ${destLoc.label}`);

    try {
      const response = await axios.post(`${API_BASE}/engine/calculate-route`, {
        start_node: origin,
        end_node: destination,
      });

      console.log("📦 RAW routeData from backend:", JSON.stringify(response.data, null, 2));

      applyRouteResponse(response.data, { originLoc, destLoc, anomalyActive: false });

      if (!Array.isArray(response.data.logs) || response.data.logs.length === 0) {
        addLog("[Scout] Route waypoints acquired. Forwarding to Orchestrator.");
        addLog("[Orchestrator] Applying traffic weight matrix. Optimal path confirmed.");
      }
      showToast("Route calculated successfully");
    } catch (err) {
      const msg = apiErrorMessage(err, "Route calculation failed.");
      console.error("Route calculation error:", err.response?.data ?? err);
      addLog(`[Adversarial] Route calculation failed: ${msg}`);
      showToast(msg, "error");
    } finally {
      setIsRouteLoading(false);
    }
  }, [origin, destination, addLog, showToast, applyRouteResponse]);

  // ── Inject Network Anomaly ─────────────────────────────────────────────────
  const handleInjectAnomaly = useCallback(async () => {
    const originLoc = LOCATIONS.find((l) => l.id === origin);
    const destLoc = LOCATIONS.find((l) => l.id === destination);

    setIsAnomalyLoading(true);
    setIsLoopActive(true);
    addLog("[Adversarial] Preparing network anomaly injection sequence…");

    try {
      const response = await axios.post(`${API_BASE}/engine/inject-chaos`, {
        start_node: origin,
        end_node: destination,
      });

      console.log("💥 RAW anomaly response:", JSON.stringify(response.data, null, 2));

      applyRouteResponse(response.data, {
        originLoc: originLoc ?? { label: origin, lat: 0, lng: 0 },
        destLoc: destLoc ?? { label: destination, lat: 0, lng: 0 },
        anomalyActive: true,
      });

      if (!Array.isArray(response.data.logs) || response.data.logs.length === 0) {
        addLog("[Adversarial] Network anomaly injected. Chaos propagating across graph.");
        addLog("[Scout] Signal degradation detected on primary corridor.");
        addLog("[Orchestrator] Activating contingency routing protocol B-7.");
      }

      showToast("Anomaly injected — detour calculated", "error");

    } catch (err) {
      const msg = apiErrorMessage(err, "Anomaly injection failed.");
      console.error("Anomaly inject error:", err.response?.data ?? err);
      addLog(`[Adversarial] Anomaly injection failed: ${msg}`);
      showToast(msg, "error");
    } finally {
      setIsAnomalyLoading(false);
    }
  }, [origin, destination, addLog, showToast, applyRouteResponse]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-sans">

      {/* ─── MAP (full-bleed background) ─────────────────────────────────── */}
      <div
        ref={mapRef}
        className="absolute inset-0 z-0"
        style={{ background: "#0f172a" }}
      />

      {/* ─── LEFT PANEL: Origin/Destination Controls ─────────────────────── */}
      <div className="absolute top-6 left-5 z-10 w-72 flex flex-col gap-3">
        {/* Route controls card */}
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 border border-white/5 p-4 flex flex-col gap-3">

          {/* GeoPulse AI Branding */}
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-md shadow-black/30 shrink-0">
              <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div className="leading-none">
              <p className="text-base leading-none">
                <span className="font-black text-white tracking-tight">GeoPulse</span>
                <span className="font-light text-white tracking-tight"> AI</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                Intelligent Logistics Routing
              </p>
            </div>
          </div>

          {/* Origin / Destination with connector line */}
          <div className="relative flex flex-col gap-2">
            {/* Vertical connector */}
            <div className="absolute left-[26px] top-[44px] bottom-[44px] w-px bg-slate-700 pointer-events-none" />

            <LocationInput
              label="Pickup"
              value={origin}
              onChange={setOrigin}
              options={LOCATIONS}
              icon={
                <div className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shrink-0" />
              }
            />

            <LocationInput
              label="Dropoff"
              value={destination}
              onChange={setDestination}
              options={LOCATIONS.filter((l) => l.id !== origin)}
              icon={
                <div className="w-3 h-3 rounded-md bg-rose-400 ring-2 ring-rose-400/30 shrink-0" />
              }
            />
          </div>

          {/* CTA */}
          <RouteButton
            onClick={handleCalculateRoute}
            isLoading={isRouteLoading}
            disabled={origin === destination}
          />

          {/* Quick stats strip — inside the card so dropdown always overlays it */}
          {routeData && (
            <div className="flex gap-2 pt-1">
              {[
                { label: "ETA",      value: vehicleData.eta },
                { label: "Distance", value: routeData.distanceKm ? `${routeData.distanceKm} km` : "—" },
                { label: "Traffic",  value: routeData.trafficLevel || "Low" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex-1 bg-slate-800 border border-white/5 rounded-2xl px-3 py-2.5 text-center"
                >
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: Telemetry ──────────────────────────────────────── */}
      <div className="absolute top-16 right-5 z-10 w-80">
        <TelemetryDash
          vehicleData={vehicleData}
          thermalTimer={thermalTimer}
          isAnomalyActive={isAnomalyActive}
          isLoading={isAnomalyLoading}
          onInjectAnomaly={handleInjectAnomaly}
        />
      </div>

      {/* ─── LEFT BOTTOM: Agent Feed ─────────────────────────────────────── */}
      <div className="absolute bottom-6 left-5 z-10 w-72">
        <AgentSidebar
          logs={logs}
          isLoopActive={isLoopActive}
        />
      </div>

      {/* ─── TOAST NOTIFICATION ──────────────────────────────────────────── */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
        </div>
      )}
    </div>
  );
}
