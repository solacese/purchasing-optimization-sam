# Event Topic Taxonomy

All events flow through the Solace PubSub+ broker using hierarchical topic addressing. Agents subscribe to topic patterns and publish enriched events downstream.

## Topic Hierarchy

```
rocher/procurement/
├── market/
│   ├── raw-material/{material}     ← Price feed simulator
│   ├── fx/{pair}                   ← FX rate simulator
│   ├── freight/{route}             ← Shipping cost updates
│   ├── signals/{material}          ← Market Intelligence Agent
│   └── alerts                      ← Price shock / buy window alerts
│
├── risk/
│   ├── weather/{region}            ← Risk feed simulator
│   ├── geopolitics/{region}        ← Risk feed simulator
│   ├── logistics/{region}          ← Risk feed simulator
│   ├── material/{material}         ← Risk Agent (enriched per material)
│   └── alerts                      ← High-severity risk alerts
│
├── advice/
│   ├── recommendations             ← Procurement Advisor Agent
│   ├── alerts                      ← Urgent procurement alerts
│   └── explanations                ← Detailed reasoning traces
│
└── actions/
    ├── create_purchase_request     ← Buyer UI
    ├── schedule_review             ← Buyer UI
    ├── flag_manager                ← Buyer UI
    └── export_summary              ← Buyer UI
```

## Material Keys

| Key | Display Name | Primary Sourcing |
|-----|-------------|-----------------|
| `argan_oil` | Argan Oil | Morocco |
| `shea_butter` | Shea Butter | Burkina Faso, Ghana |
| `rose_extract` | Rose Extract | Bulgaria, Morocco |
| `jojoba_oil` | Jojoba Oil | USA (Arizona) |
| `vanilla` | Vanilla | Madagascar |
| `palmarosa_oil` | Palmarosa Oil | India |

## FX Pairs

| Key | Description |
|-----|-------------|
| `EUR_USD` | Euro / US Dollar |
| `EUR_MAD` | Euro / Moroccan Dirham |
| `EUR_XOF` | Euro / West African CFA Franc |
| `EUR_BGN` | Euro / Bulgarian Lev |
| `EUR_MGA` | Euro / Malagasy Ariary |
| `EUR_INR` | Euro / Indian Rupee |

## Region Keys

| Key | Countries | Materials |
|-----|----------|-----------|
| `morocco` | Morocco | Argan oil, Rose extract |
| `west_africa` | Burkina Faso, Ghana | Shea butter |
| `burkina_faso` | Burkina Faso | Shea butter |
| `bulgaria` | Bulgaria | Rose extract |
| `usa` | United States | Jojoba oil |
| `madagascar` | Madagascar | Vanilla |
| `india` | India | Palmarosa oil |
| `indian_ocean` | Indian Ocean routes | Vanilla, Palmarosa oil |

## Event Payloads

### Market Price Update

```json
{
  "event_type": "price_update",
  "material": "argan_oil",
  "price_eur_per_kg": 47.20,
  "previous_price_eur": 46.50,
  "change_pct": 1.505,
  "avg_7_tick": 46.80,
  "avg_30_tick": 45.50,
  "local_currency": "MAD",
  "unit": "EUR/kg",
  "timestamp": "2025-04-21T10:30:00Z"
}
```

### Market Signal (enriched)

```json
{
  "event_type": "price_shock",
  "material": "argan_oil",
  "price_eur_per_kg": 50.40,
  "change_pct": 12.0,
  "momentum": "rising",
  "confidence": 0.88,
  "summary": "Argan oil price up 12% in 10 days — classified as price shock."
}
```

### Risk Event

```json
{
  "risk_id": "RSK-A1B2C3D4",
  "risk_type": "weather",
  "region": "morocco",
  "affected_materials": ["argan_oil"],
  "severity": "high",
  "confidence": 0.85,
  "headline": "Drought conditions confirmed in Morocco's argan belt",
  "narrative": "Morocco's meteorological service has officially declared...",
  "sources": ["AFP", "Morocco Met Office", "FAO GIEWS"],
  "recommended_action": "accelerate_purchase",
  "time_horizon": "months",
  "updated_at": "2025-04-21T10:25:00Z"
}
```

### Procurement Recommendation

```json
{
  "recommendation_id": "REC-001",
  "material": "argan_oil",
  "action": "buy_partial",
  "urgency": "high",
  "suggested_quantity_kg": 4900,
  "suggested_quantity_pct_of_forecast": 35,
  "price_target_eur": 47.20,
  "timing_window": "next 5 days",
  "confidence": 0.78,
  "rationale": "Buy 35% of forecast Argan requirement now...",
  "signals_used": [...],
  "risk_factors": [...],
  "contract_context": "Active contract CTR-2025-001...",
  "inventory_context": "Current inventory 3,200 kg = 5.3 weeks...",
  "created_at": "2025-04-21T10:35:00Z"
}
```

## Subscription Patterns

| Agent | Subscribes To | Publishes To |
|-------|--------------|-------------|
| Market Intelligence | `rocher/procurement/market/raw-material/>` | `rocher/procurement/market/signals/{material}` |
| | `rocher/procurement/market/fx/>` | `rocher/procurement/market/alerts` |
| Risk & Web Intel | `rocher/procurement/risk/weather/>` | `rocher/procurement/risk/material/{material}` |
| | `rocher/procurement/risk/geopolitics/>` | `rocher/procurement/risk/alerts` |
| | `rocher/procurement/risk/logistics/>` | |
| Procurement Advisor | `rocher/procurement/market/signals/>` | `rocher/procurement/advice/recommendations` |
| | `rocher/procurement/market/alerts` | `rocher/procurement/advice/alerts` |
| | `rocher/procurement/risk/material/>` | `rocher/procurement/advice/explanations` |
| | `rocher/procurement/risk/alerts` | |
