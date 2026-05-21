# GeoPulse AI 🌐✈️

<p align="center">
  <img src="https://img.shields.io/badge/Algorithm-Dijkstra's%20SSSP-neon?style=for-the-badge&logo=mathworks&logoColor=white&color=059669" alt="Dijkstra">
  <img src="https://img.shields.io/badge/Architecture-Multi--Agent%20Simulation-blue?style=for-the-badge&logo=diagrams.net&logoColor=white&color=2563EB" alt="Multi-Agent">
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20NetworkX-darkgreen?style=for-the-badge&logo=fastapi&logoColor=white&color=10B981" alt="Backend">
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Tailwind-darkblue?style=for-the-badge&logo=react&logoColor=white&color=3B82F6" alt="Frontend">
</p>

---

## 🎯 Overview

**GeoPulse AI** is an intelligent, high-contrast dark-mode logistics dashboard engineered to monitor, analyze, and dynamically reroute high-stakes payloads (e.g., critical pharmaceuticals) around real-time city-scale disruptions.

By coupling advanced graph theory with an autonomous multi-agent simulation framework, the platform detects localized threats (like flash floods or severe traffic gridlocks) across Bengaluru, India, programmatically mutates topological edge weights, and computes deterministic detours instantly.

---

## 🚀 Key Features

- **Decoupled Architecture** — Asynchronous full-stack pipeline coordinating a high-performance Python mathematical engine with a responsive React viewport client.
- **Dynamic Graph Mutation** — Real-time edge weight inflation to organically redirect routing flows around obstructions rather than simply breaking paths.
- **Autonomous Telemetry Feed** — Real-time multi-agent message routing displaying the independent reasoning steps of the system's automated personas (**Scout**, **Adversarial**, and **Orchestrator**).
- **Street-Snapped Precision** — Dynamic integration with the open-source **OSRM API** to map raw vector node coordinates into high-resolution, street-level tracking polylines.

---

## 🛠️ Tech Stack

| Layer | Technologies | Primary Function |
|:---|:---|:---|
| **Backend Engine** | `Python 3.10+` · `FastAPI` · `Uvicorn` | Exposes REST endpoints, tracks state, and runs the agent loop |
| **Graph Modeling** | `NetworkX` | Houses directed topological structures and handles shortest-path loops |
| **Frontend Client** | `React.js (Vite)` · `Tailwind CSS` | Manages component state and powers the premium dark-mode interface |
| **Geospatial Mapping** | `React-Leaflet` · `OpenStreetMap` | Renders map tile layers, location markers, and route arrays |

---

## 📐 Core Algorithm & Agent Pipeline

### Route Optimization

The urban roadmap grid is modeled as a **Directed Graph** `G = (V, E)` within NetworkX. Edges are weighted dynamically using a **temporal latency cost metric** (estimated driving time). Baseline paths are resolved using a Min-Heap optimized implementation of **Dijkstra's Algorithm**:

$$O(|E| + |V| \log |V|)$$

### Chaos Rerouting Lifecycle

When a user triggers **"Inject Network Anomaly"**, the system runs a full-stack simulation loop:

```
[Adversarial Agent] ──> Simulates hazard (e.g., Flash Flood at MG Road)
        │
[Scout Agent]       ──> Detects upcoming route path intersections
        │
[Orchestrator]      ──> Mutates graph edge weights (+500 min temporal penalty)
        │
[Dijkstra Engine]   ──> Recalculates paths on mutated topology
```

The server returns a unified response payload containing:
- `active_route` — the new optimal path
- `abandoned_route` — the original route, rendered as a red dashed vector on the UI
- `agent_logs` — raw reasoning steps from each autonomous agent

---

## 📂 Repository Structure

```
geopulse-AI/                  ← Monorepo root
│
├── geopulse-ai-engine/       ← Backend server
│   ├── core/                 # Graph engine and singleton simulation states
│   ├── agents/               # Orchestrator, Adversary, and Scout behaviors
│   ├── main.py               # FastAPI app & CORS configuration
│   └── requirements.txt      # Python dependencies
│
└── geopulse-frontend/        ← Frontend UI
    ├── src/                  # React components, Map visualizer, Sidebar
    ├── package.json          # Node package manager configuration
    └── tailwind.config.js    # Tailwind design tokens
```

---

## ⚙️ Local Setup

Run both the backend and frontend in **separate terminal sessions**.

### Step 1 — Start the Backend

```bash
cd geopulse-ai-engine

# Activate virtual environment
# Windows:   .\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> Backend will be available at `http://localhost:8000`

### Step 2 — Start the Frontend

```bash
cd geopulse-frontend
npm install
npm run dev
```

> Open the dev URL in your browser (typically `http://localhost:5173`)

---

## 🔮 Roadmap

| Area | Planned Improvement |
|:---|:---|
| **Event-Driven Architecture** | Decouple agent workflows into isolated microservices via Docker/Kubernetes, using Apache Kafka or RabbitMQ for message brokering |
| **Hardened Security** | TLS 1.3 proxy termination via Nginx; AES-256 encryption at rest with Envelope Encryption for sensitive fields |
| **Enterprise Graph Scaling** | Migrate from in-memory NetworkX to Neo4j or AWS Neptune; implement Contraction Hierarchies for sub-millisecond queries at national scale |

---

<p align="center">Designed and engineered by Varsha D and Sanjith P for Scanskip HackOS 💻🌐</p>
