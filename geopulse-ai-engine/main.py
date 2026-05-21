import random
from itertools import islice
from pydantic import BaseModel
import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import custom modules
from core.state_manager import SimulationState
from agents.scout import run_scout
from agents.adversary import run_adversary
from agents.orchestrator import run_orchestrator


# Initialize the FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (good for local development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)
# -----------------------------

class RoutePayload(BaseModel):
    start_node: str
    end_node: str

# Bengaluru hub graph — shared by frontend and backend
NODE_COORDS = {
    "Malleswaram": {"lat": 13.0031, "lng": 77.5643},
    "Majestic": {"lat": 12.9767, "lng": 77.5713},
    "Hebbal": {"lat": 13.0354, "lng": 77.5988},
    "MG_Road": {"lat": 12.9733, "lng": 77.6117},
    "Jayanagar": {"lat": 12.9250, "lng": 77.5938},
    "Indiranagar": {"lat": 12.9719, "lng": 77.6412},
    "Koramangala": {"lat": 12.9352, "lng": 77.6245},
    "HSR_Layout": {"lat": 12.9105, "lng": 77.6450},
    "Electronic_City": {"lat": 12.8452, "lng": 77.6632},
    "Whitefield": {"lat": 12.9698, "lng": 77.7500},
}

EDGES = [
    ("Malleswaram", "Majestic", 5), ("Malleswaram", "Hebbal", 12),
    ("Majestic", "MG_Road", 8), ("Majestic", "Jayanagar", 10),
    ("Hebbal", "MG_Road", 12), ("Hebbal", "Indiranagar", 15),
    ("MG_Road", "Indiranagar", 6), ("MG_Road", "Koramangala", 8),
    ("Indiranagar", "Koramangala", 5),
    ("Jayanagar", "Koramangala", 6), ("Jayanagar", "HSR_Layout", 8),
    ("Koramangala", "HSR_Layout", 5), ("HSR_Layout", "Electronic_City", 10),
    ("Indiranagar", "Whitefield", 25),
    ("Whitefield", "Electronic_City", 25),
]


def apply_bengaluru_graph(state: SimulationState) -> None:
    state.graph.clear()
    for node, coords in NODE_COORDS.items():
        state.graph.add_node(node, **coords)
    for u, v, w in EDGES:
        state.graph.add_edge(u, v, weight=w, original_weight=w)
        state.graph.add_edge(v, u, weight=w, original_weight=w)


def create_bengaluru_sim() -> SimulationState:
    state = SimulationState()
    apply_bengaluru_graph(state)
    state.active_route = [
        "Malleswaram", "Majestic", "MG_Road", "Indiranagar",
        "Koramangala", "HSR_Layout", "Electronic_City",
    ]
    state.abandoned_route = []
    state.agent_logs = []
    state.vehicle_telemetry["current_location"] = {
        "node_id": "Malleswaram", "lat": 13.0031, "lng": 77.5643,
    }
    return state


def validate_route_request(payload: RoutePayload) -> None:
    if payload.start_node == payload.end_node:
        raise HTTPException(status_code=400, detail="Origin and destination must be different.")
    for node_id in (payload.start_node, payload.end_node):
        if node_id not in NODE_COORDS:
            raise HTTPException(status_code=400, detail=f"Unknown node: {node_id}")


def dijkstra_route(start_node: str, end_node: str) -> tuple[list[str], float]:
    try:
        route = nx.dijkstra_path(sim.graph, start_node, end_node, weight="weight")
        length = nx.dijkstra_path_length(sim.graph, start_node, end_node, weight="weight")
        return route, length
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        raise HTTPException(
            status_code=400,
            detail="No baseline path exists between these nodes.",
        )


def route_edges(route: list[str]) -> set[tuple[str, str]]:
    return {(route[i], route[i + 1]) for i in range(len(route) - 1)}


def routes_overlap(route_a: list[str], route_b: list[str]) -> bool:
    if list(route_a) == list(route_b):
        return True
    return bool(route_edges(route_a) & route_edges(route_b))


def find_non_overlapping_detour(
    graph: nx.DiGraph,
    start_node: str,
    end_node: str,
    baseline_route: list[str],
) -> list[str]:
    """Return a detour that shares no road segments with the optimal route."""
    baseline = list(baseline_route)
    baseline_edge_set = route_edges(baseline)

    def is_valid_detour(candidate: list[str]) -> bool:
        return len(candidate) >= 2 and not routes_overlap(candidate, baseline)

    # 1. Block every segment of the optimal route, then re-route
    blocked = graph.copy()
    for u, v in baseline_edge_set:
        if blocked.has_edge(u, v):
            blocked[u][v]["weight"] = 999999
    try:
        candidate = list(nx.dijkstra_path(blocked, start_node, end_node, weight="weight"))
        if is_valid_detour(candidate):
            return candidate
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        pass

    # 2. Scan alternate simple paths until we find zero segment overlap
    try:
        for path in islice(
            nx.shortest_simple_paths(graph, start_node, end_node, weight="weight"),
            1,
            50,
        ):
            candidate = list(path)
            if is_valid_detour(candidate):
                return candidate
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        pass

    # 3. Hard-block interior nodes on the optimal route and retry
    trial = graph.copy()
    for node in baseline[1:-1]:
        if node not in trial:
            continue
        for neighbor in list(trial.neighbors(node)):
            trial[node][neighbor]["weight"] = 999999
        for predecessor in list(trial.predecessors(node)):
            trial[predecessor][node]["weight"] = 999999
        try:
            candidate = list(nx.dijkstra_path(trial, start_node, end_node, weight="weight"))
            if is_valid_detour(candidate):
                return candidate
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            continue

    raise HTTPException(
        status_code=400,
        detail="No non-overlapping detour exists between these nodes.",
    )


# 1. Boot up the master simulation state (This stays alive in memory)
sim = create_bengaluru_sim()


@app.get("/engine/state")
def get_engine_state():
    """Master endpoint for the React frontend polling."""

    # Tick the simulation clock forward 1 minute every time the
    # frontend calls this
    sim.time_elapsed += 1

    return sim.get_routing_payload()


@app.post("/engine/calculate-route")
async def calculate_route(payload: RoutePayload):
    """Baseline route only — no chaos injection."""
    validate_route_request(payload)
    sim.clear_all_blockages()
    sim.agent_logs = []
    sim.anomaly_active = False
    sim.blocked_nodes = []

    baseline_route, path_length = dijkstra_route(payload.start_node, payload.end_node)
    sim.active_route = baseline_route
    sim.abandoned_route = []
    sim.vehicle_telemetry["status"] = "EN_ROUTE"

    start_coords = NODE_COORDS[payload.start_node]
    sim.vehicle_telemetry["current_location"] = {
        "node_id": payload.start_node,
        "lat": start_coords["lat"],
        "lng": start_coords["lng"],
    }

    sim.add_agent_log(
        "Scout",
        "SCAN",
        f"Route verified: {len(baseline_route)} waypoints from {payload.start_node} to {payload.end_node}.",
    )
    sim.add_agent_log(
        "Orchestrator",
        "CONFIRM",
        f"Optimal path locked. Estimated time: {int(path_length)} mins.",
    )

    payload_data = sim.get_routing_payload()
    payload_data["eta"] = f"~{int(path_length)} min"
    payload_data["distanceKm"] = round(path_length * 0.8, 1)
    return payload_data


@app.post("/engine/inject-chaos")
async def inject_chaos(payload: RoutePayload):
    print(f"\n--- [TARGETED CRISIS: {payload.start_node} -> {payload.end_node}] ---")
    validate_route_request(payload)

    # 1. Reset graph weights and logs for a clean run
    sim.clear_all_blockages()
    sim.agent_logs = []

    # 2. Identify the original baseline route before the anomaly
    baseline_route, _ = dijkstra_route(payload.start_node, payload.end_node)

    # 3. Smart Disaster Targeting (Pick a middle node)
    if len(baseline_route) > 2:
        disaster_epicenter = random.choice(baseline_route[1:-1])
    else:
        # Fallback to a random node if trip is too short
        possible_nodes = [n for n in sim.graph.nodes() if n not in [payload.start_node, payload.end_node]]
        disaster_epicenter = random.choice(possible_nodes)
        
    # 4. Apply The Gridlock Math (Massive temporal penalty)
    sim.anomaly_active = True
    sim.blocked_nodes = [disaster_epicenter]
    sim.anomaly_type = random.choice(["FLASH_FLOOD", "CRANE_COLLAPSE", "CHEMICAL_SPILL"])

    # Artificially inflate the weight (+500) for all connections to epicenter
    for neighbor in list(sim.graph.neighbors(disaster_epicenter)):
        sim.graph[disaster_epicenter][neighbor]['weight'] += 500
    for predecessor in list(sim.graph.predecessors(disaster_epicenter)):
        sim.graph[predecessor][disaster_epicenter]['weight'] += 500
            
    sim.add_agent_log("Scout", "DETECT", f"ALERT: {sim.anomaly_type} detected at {disaster_epicenter}. Applied +500 temporal penalty.")

    # 5. The Reroute: must not share any road segment with the optimal route
    sim.abandoned_route = baseline_route
    new_route = find_non_overlapping_detour(
        sim.graph,
        payload.start_node,
        payload.end_node,
        baseline_route,
    )
    sim.active_route = new_route
    
    # 6. Run AI Agent logic (Adversary & Orchestrator)
    scenario_desc = f"A massive {sim.anomaly_type.lower().replace('_', ' ')} has triggered a gridlock at {disaster_epicenter}."
    
    adversary_log = run_adversary(new_route, scenario_desc)
    sim.add_agent_log(adversary_log["agent"], adversary_log["action"], adversary_log["message"])
    
    orchestrator_result = run_orchestrator(
        adversary_log["message"], sim.graph, payload.start_node, payload.end_node,
    )
    sim.add_agent_log(
        orchestrator_result["agent"],
        orchestrator_result["action"],
        orchestrator_result["message"],
    )

    # 7. Final State Updates
    sim.vehicle_telemetry["status"] = "REROUTED"
    sim.time_elapsed = 0

    payload_data = sim.get_routing_payload()
    try:
        eta_mins = int(nx.dijkstra_path_length(
            sim.graph, payload.start_node, payload.end_node, weight="weight",
        ))
        payload_data["eta"] = f"~{eta_mins} min"
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        pass
    return payload_data


@app.get("/engine/reset")
def reset_engine():
    global sim
    sim = create_bengaluru_sim()
    return {"message": "Simulation reset to baseline."}

@app.get("/api/vehicle/telemetry")
async def get_telemetry():
    """Returns the current vehicle telemetry data."""
    return sim.vehicle_telemetry

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
