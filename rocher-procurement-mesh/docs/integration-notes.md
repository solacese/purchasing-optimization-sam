# Enterprise Integration Notes

This document describes how the demo architecture maps to production integration with Groupe Rocher's enterprise systems.

## Integration Points

### 1. ERP / SAP MM — Purchase Orders

**Demo**: Buyer clicks "Create Purchase Request" → event published to Solace topic
**Production**:
- SAP MM subscribes to `rocher/procurement/actions/create_purchase_request`
- Converts recommendation into SAP Purchase Requisition (ME51N)
- Approval workflow triggers based on value thresholds
- Purchase order created automatically for pre-approved amounts
- Confirmation event published back to mesh: `rocher/procurement/erp/po_created`

**Connection method**: SAP AEM (Advanced Event Mesh) connector or Solace SAP integration adapter

### 2. Contract Management — SAP Ariba / Coupa

**Demo**: Historical contracts loaded from JSON
**Production**:
- Contract data streamed from Ariba/Coupa to Solace topics
- Contract expiry events auto-generated: `rocher/procurement/contracts/expiring/{material}`
- Procurement Advisor Agent subscribes to contract events
- Renegotiation recommendations include live contract terms
- New contracts can be initiated via event back to Ariba

**Connection method**: Ariba API → Solace adapter, or Coupa webhook → Solace Event Mesh Gateway

### 3. Market Data Providers

**Demo**: Price feed simulator generates synthetic GBM-style prices
**Production options**:

| Provider | Data | Connection |
|----------|------|-----------|
| **S&P Global Platts** | Commodity benchmarks | API → Solace adapter |
| **Bloomberg** | Real-time prices, FX | Bloomberg B-PIPE → Solace bridge |
| **Refinitiv (LSEG)** | Market data, news | Refinitiv API → Solace adapter |
| **ICIS** | Chemical/ingredient pricing | API polling → Solace publish |
| **Mintec** | Food ingredient benchmarks | API → Solace adapter |

Each provider publishes to `rocher/procurement/market/raw-material/{material}` using the same payload schema — the Market Intelligence Agent doesn't need to change.

### 4. Weather & Climate Data

**Demo**: Risk feed simulator publishes scripted weather scenarios
**Production options**:

| Provider | Data | Connection |
|----------|------|-----------|
| **NOAA** | Global weather data | Public API → polling adapter |
| **Copernicus CDS** | Climate datasets, drought indices | API → scheduled fetch |
| **Weather.com** | Severe weather alerts | Webhook → Solace Event Mesh Gateway |
| **aWhere** | Agricultural weather intelligence | API → Solace adapter |

Weather events publish to `rocher/procurement/risk/weather/{region}`.

### 5. Geopolitical & News Intelligence

**Demo**: Risk feed simulator with scripted scenarios; Gemini agent does web research
**Production options**:

| Provider | Data | Connection |
|----------|------|-----------|
| **Dataminr** | Real-time alerts | API/webhook → Solace |
| **Predata** | Geopolitical predictive analytics | API → Solace adapter |
| **Resilinc** | Supply chain risk monitoring | API → Solace adapter |
| **ACLED** | Conflict data | API polling → Solace |
| **Google News API** | News monitoring | Gemini agent web search (as in demo) |

The Gemini-powered Risk & Web Intelligence Agent can use web search in production for real-time research, supplemented by structured feeds from specialized providers.

### 6. Logistics & Shipping

**Demo**: Simulated logistics events
**Production**:

| Provider | Data | Connection |
|----------|------|-----------|
| **Flexport** | Shipment tracking | Webhook → Solace |
| **Maersk / CMA CGM** | Container tracking, rate indices | API → Solace |
| **Freightos** | Freight rate benchmarks | API polling → Solace |
| **project44** | Visibility platform | API → Solace adapter |

Events publish to `rocher/procurement/risk/logistics/{region}`.

### 7. Internal Procurement Applications

**Demo**: React UI with SSE connection to API
**Production**:
- **Existing procurement portal**: Embed recommendation widgets via iframe or micro-frontend
- **SAP Fiori**: SAP UI5 component consuming Solace SSE or SAP AEM events
- **Microsoft Teams**: Solace → Teams webhook for alerts (similar to Slack gateway in SAM)
- **Email alerts**: Solace → email adapter for critical recommendations
- **Mobile**: Push notifications via Solace → Firebase/APNS adapter

## Architecture Principle: Event Mesh as Integration Backbone

The key architectural principle is that **Solace PubSub+** serves as the universal integration backbone:

```
Bloomberg ──→ Solace ──→ Market Agent ──→ Solace ──→ Advisor Agent ──→ Solace ──→ SAP
NOAA     ──→ Solace ──→ Risk Agent   ──→ Solace ──→ Advisor Agent ──→ Solace ──→ Teams
Ariba    ──→ Solace ──→ Advisor Agent ──→ Solace ──→ UI
```

Every system connects **only to Solace** — not to each other. This means:
- Any source or consumer can be added without changing existing components
- Agents can be upgraded or replaced independently
- The event stream is auditable and replayable
- Geographic distribution is handled by Solace mesh routing

## Estimated Production Timeline

| Phase | Scope | Timeline |
|-------|-------|---------|
| **Phase 1** | Demo → pilot with 2 materials, simulated feeds | 4-6 weeks |
| **Phase 2** | Connect 1 real market data provider + SAP adapter | 8-12 weeks |
| **Phase 3** | Full material coverage, risk feeds, production Solace cluster | 12-16 weeks |
| **Phase 4** | Multi-region deployment, advanced ML models, full ERP integration | 16-24 weeks |

## Security & Compliance

- Solace supports TLS, OAuth 2.0, and LDAP/AD authentication
- Topic-level ACLs restrict agent access to authorized event streams
- All events are auditable (Solace persistent messaging + replay)
- GDPR: no personal data in event payloads — only procurement/material data
- API gateway handles authentication for UI users
- Gemini API calls comply with Google Cloud data processing terms
