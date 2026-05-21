# Geopulse-AI

GeoPulse AI is an intelligent dark-mode logistics dashboard that utilizes Dijkstra's algorithm and an autonomous multi-agent framework to simulate network disruptions, dynamically mutate graph weights, and calculate real-time optimum detours.

## Project structure

- `geopulse-ai-engine/` — FastAPI backend with NetworkX routing and multi-agent chaos simulation
- `Geopulse-frontend/` — React + Vite dashboard with Leaflet map visualization

## Quick start

### Backend

```bash
cd geopulse-ai-engine
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env         # add your GROQ_API_KEY
python main.py
```

The API runs at `http://localhost:8000`.

### Frontend

```bash
cd Geopulse-frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:5173` and proxies `/engine` and `/api` to the backend.

## Environment variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for the adversarial agent (optional; falls back to a static critique) |
