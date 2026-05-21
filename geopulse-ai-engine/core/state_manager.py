from core.graph_engine import create_logistics_graph
from datetime import datetime, timezone


class SimulationState:
    def __init__(self):
        # 1. Boot up the physical world
        self.graph = create_logistics_graph()

        # 2. Set default starting variables
        self.time_elapsed = 0
        self.anomaly_active = False
        self.blocked_nodes = []
        # The baseline fastest route
        self.active_route = ["N-14", "N-20", "N-22", "N-23", "N-90"]
        self.abandoned_route = []
        # The AI will append its thought processes here later
        self.agent_logs = []

        # 3. Persistent Vehicle Telemetry
        self.vehicle_telemetry = {
            "vehicle_id": "TRK-ONC-001",
            "payload": "Oncology Medication",
            "current_location": {"node_id": "N-14", "lat": 12.9810, "lng": 77.5930},
            "status": "EN_ROUTE",
            "thermal_timer_remaining_mins": 33,
            "battery_load_percent": 82
        }

    def trigger_anomaly(self, node_ids, anomaly_type="PIPELINE_BURST"):
        """Simulates a disaster hitting specific nodes."""
        self.anomaly_active = True
        self.blocked_nodes.extend(node_ids)

        # Block the nodes in the NetworkX graph (set weight to infinity)
        for node_id in node_ids:
            # In a directed graph, we block roads leading into AND out of the
            # flooded node
            if node_id in self.graph:
                for predecessor in list(self.graph.predecessors(node_id)):
                    self.graph[predecessor][node_id]['weight'] = 999999
                for successor in list(self.graph.successors(node_id)):
                    self.graph[node_id][successor]['weight'] = 999999

        print(f"\n[SYSTEM] {anomaly_type} triggered at nodes: {node_ids}")
        print("[SYSTEM] NetworkX graph weights updated to infinity.")

    def clear_all_blockages(self):
        """Resets the graph weights to baseline using original_weight."""
        self.anomaly_active = False
        self.blocked_nodes = []
        
        # Reset weights based on original_weight if available
        for u, v, d in self.graph.edges(data=True):
            if 'original_weight' in d:
                self.graph[u][v]['weight'] = d['original_weight']
            elif d.get('capacity') == 'HIGH':
                self.graph[u][v]['weight'] = 1
            else:
                self.graph[u][v]['weight'] = 2
        print("[SYSTEM] All blockages cleared. Graph weights reset to baseline.")

    def add_agent_log(self, agent_name, action, message):
        """Appends an AI thought process to the state."""
        log_entry = {
            "id": f"log_{len(self.agent_logs) + 1:03}",
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "agent": agent_name,
            "action": action,
            "message": message
        }
        self.agent_logs.append(log_entry)

    def get_routing_payload(self):
        """Returns the compact JSON schema requested for GeoPulse AI routing."""
        
        def route_to_coords(route_nodes):
            coords = []
            for node_id in route_nodes:
                if node_id in self.graph.nodes:
                    node_data = self.graph.nodes[node_id]
                    # Ensure we are returning [lat, lng] as floats
                    coords.append([float(node_data.get("lat", 0)), float(node_data.get("lng", 0))])
            return coords

        # Transform logs to simple agent/message format
        compact_logs = [
            {"agent": log["agent"], "message": log["message"]}
            for log in self.agent_logs
        ]

        return {
            "active_route": route_to_coords(self.active_route),
            "abandoned_route": route_to_coords(self.abandoned_route),
            "logs": compact_logs
        }

    def get_api_payload(self):
        """Generates the exact JSON contract Sanjith's frontend expects."""
        
        # Update dynamic fields in telemetry before returning
        telemetry = self.vehicle_telemetry.copy()
        
        # If not manually overridden to REROUTED, use dynamic logic
        if telemetry["status"] != "REROUTED":
            telemetry["status"] = "REROUTING" if self.anomaly_active else "EN_ROUTE"
            telemetry["thermal_timer_remaining_mins"] = 33 - self.time_elapsed
            
        # Helper to convert node list to coordinate list
        def route_to_coords(route_nodes):
            coords = []
            for node_id in route_nodes:
                if node_id in self.graph.nodes:
                    node_data = self.graph.nodes[node_id]
                    coords.append([node_data.get("lat", 0), node_data.get("lng", 0)])
            return coords

        return {
            "simulation_state": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "anomaly_active": self.anomaly_active,
                "anomaly_type": (
                    "PIPELINE_BURST" if self.anomaly_active else "NONE"
                ),
                "time_elapsed_minutes": self.time_elapsed
            },
            "vehicle_telemetry": telemetry,
            "spatial_state": {
                "blocked_nodes": self.blocked_nodes,
                "congested_edges": [],
                "current_active_route": route_to_coords(self.active_route),
                "abandoned_route": route_to_coords(self.abandoned_route)
            },
            "agent_logs": self.agent_logs
        }


# --- Testing Block ---
if __name__ == "__main__":
    # 1. Initialize the simulation
    sim = SimulationState()
    print("Baseline Route:", sim.active_route)

    # 2. Trigger the chaos
    sim.trigger_anomaly(["N-22", "N-23"])

    # 3. Simulate an AI log
    sim.add_agent_log("Scout", "DETECT",
                      "CRITICAL: Capacity dropped to 0 at N-22.")

    # 4. Check the JSON output
    import json
    print("\nGenerated JSON Payload:")
    print(json.dumps(sim.get_api_payload(), indent=2))
