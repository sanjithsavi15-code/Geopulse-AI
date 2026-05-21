---

```markdown
# GeoPulse AI 🌐✈️
### Intelligent Multi-Agent Autonomous Logistics Routing Dashboard

GeoPulse AI is an enterprise-grade simulation platform designed to monitor and dynamically reroute high-stakes payloads (e.g., critical pharmaceuticals) around real-time network anomalies—such as flash floods or severe gridlocks—across Bengaluru, India. 

The system couples advanced graph theory with an autonomous multi-agent framework to simulate hostile disruptions, mutate network conditions, and calculate deterministic detours instantly.

---

## 🛠️ The Tech Stack

- **Backend:** Python 3.10+, FastAPI (High-speed REST API), NetworkX (Graph Mathematics), Uvicorn.
- **Frontend:** React.js (Vite), Tailwind CSS (Premium UI), React-Leaflet & OpenStreetMap (Geospatial Canvas).
- **Data Pipeline:** Axios configured for rigid JSON data serialization.

---

## 📐 Core Algorithm & Agent Architecture

### 1. Route Optimization (Dijkstra's Algorithm)
The road network is modeled as a **Directed Graph ($G = (V, E)$)** in NetworkX. Instead of static distance, road edges are weighted using a **temporal latency metric** (calculated travel time). The engine handles baseline routing requests using an optimized implementation of **Dijkstra’s Algorithm** ($O(|E| + |V| \log |V|)$).

### 2. The Multi-Agent Chaos Loop
When a user clicks **"Inject Network Anomaly"**, a decoupled multi-agent loop triggers across the full stack:
* 💥 **Adversarial Agent:** Simulates an localized disruption (e.g., a flash flood at MG Road) and broadcasts an alert payload.
* 🛰️ **Scout Agent:** Audits active delivery tracks, flags upcoming intersections with danger zones, and alerts the core network.
* 🧠 **Orchestrator Agent:** Dynamically mutates the live NetworkX graph topology, applying a massive **$+500$ minute temporal penalty** to the compromised edges.
* 🔄 **Dijkstra Recalculation:** The engine re-runs Dijkstra's algorithm on the mutated graph. Because the original path is no longer optimal, the algorithm naturally paths around the barrier, capturing the **next mathematical optimum detour**.

---

## ⚙️ Quick Start (Local Execution)

To run the application, spin up the backend and frontend simultaneously in separate terminal windows:

### Part 1: Python Backend
```bash
cd geopulse-ai-engine
# Activate your venv (Windows: .\\venv\\Scripts\\Activate.ps1 | Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

```

### Part 2: React Frontend

```bash
cd geopulse-frontend
npm install
npm run dev

```

*Open the provided Vite link (e.g., `http://localhost:5173`) in your browser.*

---

## 🔮 Scalability Roadmap (Production Future)

1. **Event-Driven Microservices:** Decouple autonomous agents into dedicated **Docker** containers orchestrated by **Kubernetes**, utilizing **Apache Kafka** or **RabbitMQ** for high-throughput, asynchronous event streaming.
2. **Production-Grade Encryption:** Secure data in transit via **TLS 1.3** proxy termination (Nginx/Cloudflare) and data at rest via **AES-256 transparent database encryption** paired with application-level **Envelope Encryption** for sensitive telemetry.
3. **Graph Scaling Layer:** Migrate NetworkX out of volatile server memory into a dedicated graph database instance (**Neo4j** or **AWS Neptune**) and introduce **Contraction Hierarchies** to keep route calculation speeds under micro-milliseconds at scale.

```

***

### Why this works better for judges:
- **Scannable:** Using bold key terms allows a judge to glance at the document and see "FastAPI", "NetworkX", "Dijkstra's Algorithm", and "Kafka" instantly.
- **Clear Flow:** It explains exactly what happens when the button is clicked step-by-step (Adversarial $\rightarrow$ Scout $\rightarrow$ Orchestrator $\rightarrow$ Recalculation). 
- **The "Future Scope" Section:** It shows that you understand how to write enterprise software, not just clean hackathon scripts!

```
