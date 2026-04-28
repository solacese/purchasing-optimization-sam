# Architecture — NaturaCo Procurement Intelligence Mesh

## Overview

The system is an event-driven, multi-agent architecture built on **Solace Agent Mesh** (SAM). Three specialized AI agents collaborate over a **Solace PubSub+** event broker to provide real-time procurement intelligence for NaturaCo's raw-material purchasing team.

## System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                         │
│                                                                   │
│   React UI (Vite)                                                │
│   ├── Procurement Dashboard     (material watchlist, live feed)  │
│   ├── Material Detail           (price, risk, recommendation)    │
│   ├── Event Stream              (observability, agent activity)  │
│   └── Buyer Action Panel        (purchase requests, reviews)     │
│                                                                   │
│   Connection: REST + Server-Sent Events (SSE)                    │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────────┐
│                        GATEWAY LAYER                              │
│                                                                   │
│   Procurement API (FastAPI)                                      │
│   ├── REST endpoints for UI queries                              │
│   ├── SSE endpoint for real-time event push                      │
│   ├── Event publishing bridge (simulators → mesh)                │
│   └── Buyer action recording                                    │
│                                                                   │
│   SAM REST Gateway (optional production path)                    │
│   └── Direct agent invocation via A2A protocol                   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │   Solace PubSub+ Broker     │
              │   (Event Mesh Backbone)     │
              │                             │
              │   Topics:                   │
              │   naturaco/procurement/        │
              │   ├── market/*              │
              │   ├── risk/*                │
              │   ├── advice/*              │
              │   └── actions/*             │
              └──────────┬──────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────┴───────┐ ┌─────┴──────┐ ┌──────┴───────┐
│   Market       │ │  Risk &    │ │  Procurement │
│   Intelligence │ │  Web Intel │ │  Advisor     │
│   Agent        │ │  Agent     │ │  Agent       │
│                │ │            │ │              │
│ LLM: OpenAI   │ │ LLM: GEMINI│ │ LLM: OpenAI │
│ gpt-4o        │ │ gemini-2.0 │ │ gpt-4o      │
│                │ │ flash      │ │              │
│ Subscribes:   │ │            │ │ Subscribes: │
│ market/raw-*  │ │ Subscribes:│ │ market/      │
│ market/fx/*   │ │ risk/      │ │   signals/* │
│ market/       │ │   weather  │ │ risk/        │
│   freight/*   │ │   geopol   │ │   material/* │
│                │ │   logistics│ │ risk/alerts  │
│ Publishes:    │ │            │ │              │
│ market/       │ │ Publishes: │ │ Publishes:  │
│   signals/*   │ │ risk/      │ │ advice/     │
│ market/alerts │ │   material │ │   recommend │
│               │ │ risk/alerts│ │ advice/     │
│               │ │            │ │   alerts    │
└───────┬────────┘ └──────┬─────┘ └──────────────┘
        │                 │
┌───────┴────────┐ ┌──────┴──────┐
│  Price Feed    │ │  Risk Feed  │
│  Simulator     │ │  Simulator  │
│                │ │             │
│  GBM price     │ │  Scenario-  │
│  walks, FX     │ │  based risk │
│  updates       │ │  events     │
└────────────────┘ └─────────────┘
```

## Agent Communication Pattern

Agents communicate **asynchronously** over Solace topics using the A2A (Agent-to-Agent) pattern:

1. **Price Feed Simulator** publishes raw price data to `naturaco/procurement/market/raw-material/{material}`
2. **Market Intelligence Agent** subscribes, enriches with analytics, publishes to `naturaco/procurement/market/signals/{material}`
3. **Risk Feed Simulator** publishes risk events to `naturaco/procurement/risk/{type}/{region}`
4. **Risk & Web Intelligence Agent** subscribes, researches via Gemini/web, publishes to `naturaco/procurement/risk/material/{material}`
5. **Procurement Advisor Agent** subscribes to both signal streams, combines with historical data, publishes to `naturaco/procurement/advice/recommendations`
6. **Procurement API** bridges all events to the UI via SSE

This is fully decoupled: any agent can be replaced, scaled, or upgraded independently.

## Data Flow

```
External Feeds ──→ Simulators ──→ Solace Topics ──→ Agents ──→ Enriched Topics ──→ API ──→ UI
                                                       │
                                                       ├── Historical contracts
                                                       ├── Demand forecasts
                                                       ├── Supplier database
                                                       └── Inventory levels
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Event Mesh | Solace PubSub+ Standard | Asynchronous message broker |
| Agent Framework | Solace Agent Mesh | Multi-agent orchestration |
| Market Agent LLM | OpenAI GPT-4o | Price analysis and signal detection |
| Risk Agent LLM | Google Gemini 2.0 Flash | Web research and risk assessment |
| Advisor Agent LLM | OpenAI GPT-4o | Recommendation synthesis |
| API Gateway | FastAPI (Python) | REST + SSE bridge |
| Frontend | React + Vite + Tailwind CSS | Purchasing team UI |
| Data | JSON files (demo) | Contracts, suppliers, forecasts |

## Security Model (Production)

- OAuth 2.0 authentication via SAM gateway
- Role-based access: buyer, commodity_manager, admin
- Solace ACLs for topic-level authorization
- API keys managed via environment variables
- No secrets in code or configuration files

## Scalability Path

- Each agent runs independently and can be horizontally scaled
- Solace PubSub+ supports clustering for HA
- Agents can be deployed as containers (Kubernetes-ready)
- Event-driven architecture handles bursty workloads naturally
- Gemini and OpenAI API calls are the main throughput bottleneck — rate limiting and caching mitigate this
