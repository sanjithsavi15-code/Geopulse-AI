def run_scout(blocked_nodes):
    """Detects anomalies and generates the first critical log."""
    if not blocked_nodes:
        return None

    nodes_str = ", ".join(blocked_nodes)
    return {
        "agent": "Scout",
        "action": "DETECT",
        "message": (
            f"CRITICAL: Node {nodes_str} blockage detected via "
            "infrastructure API. Capacity dropped to 0."
        )
    }
