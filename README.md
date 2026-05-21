# GeoPulse AI 🌐✈️

<p align="center">
  <img src="https://img.shields.io/badge/Algorithm-Dijkstra's%20SSSP-neon?style=for-the-badge&logo=mathworks&logoColor=white&color=059669" alt="Dijkstra">
  <img src="https://img.shields.io/badge/Architecture-Multi--Agent%20Simulation-blue?style=for-the-badge&logo=diagrams.net&logoColor=white&color=2563EB" alt="Multi-Agent">
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20NetworkX-darkgreen?style=for-the-badge&logo=fastapi&logoColor=white&color=10B981" alt="Backend">
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Tailwind-darkblue?style=for-the-badge&logo=react&logoColor=white&color=3B82F6" alt="Frontend">
</p>

### 🎯 Overview
**GeoPulse AI** is an intelligent, high-contrast dark-mode logistics dashboard engineered to monitor, analyze, and dynamically reroute high-stakes payloads (e.g., critical pharmaceuticals) around real-time city-scale disruptions. 

By coupling advanced graph theory with an autonomous multi-agent simulation framework, the platform detects localized threats (like flash floods or severe traffic gridlocks) across Bengaluru, India, programmatically mutates topological edge weights, and computes deterministic detours instantly.

---

## 🚀 Key Features

* **Decoupled Architecture:** Asynchronous full-stack pipeline coordinating a high-performance Python mathematical engine with a responsive React viewport client.
* **Dynamic Graph Mutation:** Real-time edge weight inflation to organically redirect routing flows around obstructions rather than simply breaking paths.
* **Autonomous Telemetry Feed:** Real-time multi-agent message routing displaying the independent reasoning steps of the system's automated personas (**Scout**, **Adversarial**, and **Orchestrator**).
* **Street-Snapped Precision:** Dynamic integration with the open-source **OSRM API** to map raw vector node coordinates into high-resolution, street-level tracking polylines.

---

## 🛠️ Tech Stack & Ecosystem

| Layer | Technologies | Primary Function |
| :--- | :--- | :--- |
| **Backend Engine** | `Python 3.10+` `FastAPI` `Uvicorn` | Exposes REST endpoints, tracks state, and runs the agent loop. |
| **Graph Modeling** | `NetworkX` | Houses directed topological structures and handles shortest-path loops. |
| **Frontend Client**| `React.js (Vite)` `Tailwind CSS` | Manages component state and powers the premium dark-mode interface. |
| **Geospatial Mapping**| `React-Leaflet` `OpenStreetMap` | Renders map tile layers, location markers, and route arrays. |

---

## 📐 Core Algorithm & Agent Pipeline

### 1. Route Optimization Mechanics
The urban roadmap grid is modeled as a **Directed Graph ($G = (V, E)$)** within NetworkX. Rather than calculating geometric distance, graph edges are weighted dynamically using a **temporal latency cost metric** (estimated driving time). Baseline paths are resolved using a Min-Heap optimized implementation of **Dijkstra’s Algorithm** with a strict time complexity of:

$$O(|E| + |V| \log |V|)$$

### 2. The Chaos Rerouting Lifecycle
When a user clicks **"Inject Network Anomaly"**, the system runs an automated full-stack simulation loop:
```text
[Adversarial Agent] ──> Simulates Hazard (e.g., Flash Flood at MG Road)
       │
[Scout Agent]       ──> Detects upcoming route path intersections
       │
[Orchestrator]      ──> Mutates Graph Edge Weights (+500 Min temporal penalty)
       │
[Dijkstra Engine]   ──> Recalculates paths on mutated topology to find new optimum
