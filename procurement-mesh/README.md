# NaturaCo Procurement Mesh

**AI-powered procurement intelligence for NaturaCo's raw-material purchasing team.**

Built on [Solace Agent Mesh](https://github.com/SolaceLabs/solace-agent-mesh) — an event-driven multi-agent architecture that coordinates specialized AI agents over the Solace event broker.

## What It Does

The purchasing team at NaturaCo buys natural raw materials (Argan oil, Shea butter, Rose extract, Vanilla, etc.) directly on the market. This system provides real-time intelligence to help buyers decide **what**, **when**, and **how much** to buy.

Three specialized agents collaborate over the Solace event mesh:

| Agent | Role | Powered By |
|-------|------|------------|
| **Market Intelligence** | Tracks commodity prices, FX rates, detects price shocks and buy windows | Claude / OpenAI |
| **Risk & Web Intelligence** | Monitors weather, geopolitics, logistics disruptions via web research | **Google Gemini** |
| **Procurement Advisor** | Synthesizes signals into actionable buy/hold/hedge recommendations | Claude / OpenAI |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Purchasing Team UI                        │
│  Dashboard · Material Detail · Event Stream · Action Panel  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST / SSE
                ┌──────────┴──────────┐
                │   Procurement API   │
                │   (FastAPI Gateway) │
                └──────────┬──────────┘
                           │ Solace PubSub+
         ┌─────────────────┼─────────────────┐
         │                 │                  │
    ┌────┴─────┐   ┌──────┴──────┐   ┌──────┴──────┐
    │ Market   │   │ Risk & Web  │   │ Procurement │
    │ Intel    │   │ Intel       │   │ Advisor     │
    │ Agent    │   │ (Gemini)    │   │ Agent       │
    └────┬─────┘   └──────┬──────┘   └─────────────┘
         │                │
    ┌────┴─────┐   ┌──────┴──────┐
    │ Price    │   │ Risk Feed   │
    │ Feed Sim │   │ Simulator   │
    └──────────┘   └─────────────┘
```

All agents communicate asynchronously via Solace topics:
- `naturaco/procurement/market/*` — price data, FX, signals
- `naturaco/procurement/risk/*` — weather, geopolitics, alerts
- `naturaco/procurement/advice/*` — recommendations, explanations

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- API keys: Google Gemini, OpenAI (or another LLM provider)

### 1. Clone & Configure

```bash
cd naturaco-procurement-mesh
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Infrastructure

```bash
docker-compose up -d solace-broker
# Wait ~30s for broker to initialize
```

### 3. Install & Run Agents

```bash
# Python dependencies
pip install -r requirements.txt

# Start all agents and simulators
./scripts/run_demo.sh
```

### 4. Start the UI

```bash
cd ui
npm install
npm run dev
# Open http://localhost:5173
```

### 5. Start the API Gateway

```bash
cd services/procurement-api
uvicorn main:app --reload --port 8090
```

### 6. Run the Demo Scenario

```bash
./scripts/run_demo_scenario.sh
```

This plays a scripted sequence:
1. Argan oil price rises 12% over 48h
2. Morocco drought alert fires from risk agent
3. Procurement Advisor recommends early buy at 35% of forecast
4. Then a Shea butter scenario where the recommendation is to **wait**

## Project Structure

```
naturaco-procurement-mesh/
├── README.md
├── docker-compose.yml
├── .env.example
├── requirements.txt
├── docs/
│   ├── architecture.md          # Detailed architecture
│   ├── demo-flow.md             # Demo scenario walkthrough
│   ├── event-topics.md          # Topic taxonomy
│   └── integration-notes.md     # Enterprise integration guide
├── sam/
│   ├── shared_config.yaml       # Broker & model config
│   ├── agents/
│   │   ├── market_intelligence.yaml
│   │   ├── risk_web_intelligence.yaml
│   │   └── procurement_advisor.yaml
│   ├── gateways/
│   │   └── rest_gateway.yaml
│   └── services/
│       └── platform_service.yaml
├── services/
│   ├── price-feed-simulator/    # Simulated commodity prices
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── risk-feed-simulator/     # Simulated risk events
│   │   ├── main.py
│   │   └── requirements.txt
│   └── procurement-api/         # FastAPI gateway for UI
│       ├── main.py
│       ├── models.py
│       ├── sample_data.py
│       └── requirements.txt
├── ui/                          # React + Vite frontend
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
├── data/                        # Sample datasets
│   ├── contracts/
│   ├── volumes/
│   ├── suppliers/
│   └── forecasts/
└── scripts/
    ├── run_demo.sh
    └── run_demo_scenario.sh
```

## Configuration

### Gemini (Risk & Web Intelligence Agent)

The risk agent uses Google Gemini for web research and reasoning:

```bash
# In .env
GOOGLE_API_KEY=your-gemini-api-key
```

### LLM Provider (Market & Advisor Agents)

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Or use LiteLLM for other providers
LITELLM_GENERAL_MODEL=gpt-4o
LITELLM_PLANNING_MODEL=gpt-4o
```

### Solace Broker

The Docker Compose file starts a local Solace PubSub+ Standard broker. No cloud account needed for local development.

## Enterprise Integration Points

This demo is designed to extend into production. See [docs/integration-notes.md](docs/integration-notes.md) for connection points to:

- **SAP MM / Ariba** — purchase order creation, contract management
- **Market data providers** — Bloomberg, Refinitiv, S&P Global Platts
- **Weather APIs** — NOAA, Copernicus Climate Data Store
- **ERP systems** — inventory levels, demand forecasts
- **Risk platforms** — Coupa Risk Assess, Resilinc

## License

Demo / internal use. Not for redistribution.
