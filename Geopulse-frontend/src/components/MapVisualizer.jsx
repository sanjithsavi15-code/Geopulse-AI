import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Real Bengaluru Hub Coordinates
export const NODE_COORDS = {
  Malleswaram: [13.0031, 77.5643],
  Hebbal: [13.0354, 77.5988],
  Majestic: [12.9766, 77.5713],
  MG_Road: [12.9730, 77.6110],
  Indiranagar: [12.9784, 77.6408],
  Whitefield: [12.9698, 77.7499],
  Jayanagar: [12.9299, 77.5824],
  Koramangala: [12.9352, 77.6245],
  HSR_Layout: [12.9121, 77.6446],
  Electronic_City: [12.8399, 77.6770],
};

export default function MapVisualizer({ spatialState, startNode, endNode }) {
  const activeRouteCoords = spatialState.current_active_route
    .map((id) => NODE_COORDS[id])
    .filter(Boolean);
  const abandonedRouteCoords = spatialState.abandoned_route
    .map((id) => NODE_COORDS[id])
    .filter(Boolean);

  return (
    <MapContainer center={[12.95, 77.63]} zoom={12} className="w-full h-full bg-slate-900">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; CARTO"
      />

      {/* 1. Draw Active Route (Glowing Green) */}
      {activeRouteCoords.length > 0 && (
        <Polyline
          positions={activeRouteCoords}
          color="#22c55e"
          weight={6}
          opacity={0.9}
        />
      )}

      {/* 2. Draw Abandoned Route (Dashed Red) */}
      {abandonedRouteCoords.length > 0 && (
        <Polyline
          positions={abandonedRouteCoords}
          color="#ef4444"
          weight={5}
          dashArray="10, 15"
          opacity={0.8}
        />
      )}

      {/* 3. Mark Blocked Nodes (Pulsing Red Dots) */}
      {spatialState.blocked_nodes.map((nodeId) =>
        NODE_COORDS[nodeId] ? (
          <CircleMarker
            key={nodeId}
            center={NODE_COORDS[nodeId]}
            radius={14}
            color="#ef4444"
            fillColor="#ef4444"
            fillOpacity={0.9}
          />
        ) : null,
      )}

      {/* START MARKER */}
      {startNode && NODE_COORDS[startNode] && (
        <CircleMarker
          center={NODE_COORDS[startNode]}
          radius={10}
          color="#3b82f6"
          fillColor="#3b82f6"
          fillOpacity={1}
          weight={3}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -10]}
            className="bg-slate-950 text-blue-400 font-mono text-xs shadow-md"
          >
            START: {startNode.replace('_', ' ')}
          </Tooltip>
        </CircleMarker>
      )}

      {/* END MARKER */}
      {endNode && NODE_COORDS[endNode] && (
        <CircleMarker
          center={NODE_COORDS[endNode]}
          radius={10}
          color="#f59e0b"
          fillColor="#f59e0b"
          fillOpacity={1}
          weight={3}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -10]}
            className="bg-slate-950 text-amber-400 font-mono text-xs shadow-md"
          >
            END: {endNode.replace('_', ' ')}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
