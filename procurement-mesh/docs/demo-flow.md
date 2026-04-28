# Demo Scenario Walkthrough

## Scenario 1: Argan Oil — Buy Signal (Urgent)

This scenario demonstrates a **BUY** recommendation driven by converging market and risk signals.

### Sequence

| Step | Time | Agent | Event |
|------|------|-------|-------|
| 1 | T+0s | Price Feed Simulator | Argan oil price begins rising: EUR 45.00 → 46.20 (+2.7%) |
| 2 | T+10s | Price Feed Simulator | Price continues: EUR 46.20 → 48.50 → 50.40 (+12% from baseline) |
| 3 | T+15s | Market Intelligence Agent | Detects **price shock**: +12% in 10 days, momentum "rising" |
| 4 | T+15s | Market Intelligence Agent | Publishes signal to `naturaco/procurement/market/signals/argan_oil` |
| 5 | T+20s | Risk Feed Simulator | Morocco weather event: below-average rainfall in Souss-Massa |
| 6 | T+25s | Risk Feed Simulator | Escalation: drought officially declared — **severity: high** |
| 7 | T+25s | Risk & Web Intel Agent (Gemini) | Researches web: confirms drought via AFP, Morocco Met Office, FAO |
| 8 | T+30s | Risk & Web Intel Agent (Gemini) | Publishes enriched risk to `naturaco/procurement/risk/material/argan_oil` |
| 9 | T+35s | Procurement Advisor Agent | Receives price shock + drought risk + checks inventory (5.3 wks) |
| 10 | T+40s | Procurement Advisor Agent | Generates recommendation: **BUY_PARTIAL 35% (4,900 kg)** |
| 11 | T+40s | UI | Dashboard updates in real time via SSE |
| 12 | — | Buyer | Reviews recommendation, clicks "Create Purchase Request" |

### What to Show

1. **Dashboard**: Watch the Argan Oil card turn from stable to alert state
2. **Event Stream**: See the topic events flowing: blue (market) → purple (risk) → green (advice)
3. **Material Detail**: Click into Argan Oil — see the price trend, risk alert, and full recommendation
4. **Recommendation**: Highlight the rationale explaining WHY to buy, with signal sources
5. **Action Panel**: Buyer takes action → event published to `naturaco/procurement/actions/create_purchase_request`

---

## Scenario 2: Shea Butter — Hold Signal (Patient)

This scenario demonstrates a **HOLD** recommendation, showing the system is balanced and doesn't always say "buy."

### Sequence

| Step | Time | Agent | Event |
|------|------|-------|-------|
| 1 | T+0s | Price Feed Simulator | Shea butter price begins softening: EUR 8.80 → 8.60 → 8.53 (-3.1%) |
| 2 | T+10s | Market Intelligence Agent | Detects declining momentum, no shock threshold triggered |
| 3 | T+15s | Risk Feed Simulator | West Africa weather: normal rainfall, low risk |
| 4 | T+20s | Risk & Web Intel Agent (Gemini) | Confirms stable supply outlook, port congestion improving |
| 5 | T+25s | Procurement Advisor Agent | Receives soft price + low risk + checks inventory (8.8 wks >> 6 wk safety) |
| 6 | T+30s | Procurement Advisor Agent | Generates recommendation: **HOLD — reassess in 10 days** |
| 7 | T+30s | UI | Dashboard shows Shea Butter in "Hold" state |

### What to Show

1. **Contrast with Scenario 1**: Different recommendation for different conditions
2. **Inventory context**: 8.8 weeks coverage >> 6 weeks safety stock — no urgency
3. **Active contract**: CTR-2025-002 still has 21,000 kg remaining at favorable price
4. **Rationale**: Explains WHY to wait — market declining, inventory comfortable, contract healthy

---

## Running the Demo

### Automated

```bash
./scripts/run_demo_scenario.sh
```

This script plays both scenarios sequentially with appropriate pauses.

### Manual

1. Start all services (see README)
2. Open the UI at http://localhost:5173
3. In a separate terminal, trigger scenarios:

```bash
# Scenario 1: Argan spike + drought
curl -X POST http://localhost:8090/api/events/publish \
  -H "Content-Type: application/json" \
  -d '{"topic":"naturaco/procurement/market/raw-material/argan_oil","payload":{"event_type":"price_update","material":"argan_oil","price_eur_per_kg":50.40,"previous_price_eur":45.00,"change_pct":12.0,"momentum":"rising","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}}'
```

### Demo Tips

- Open the **Event Stream** page in a second browser window to show real-time topic flow
- Point out the **agent colors** (blue/purple/green) to explain which agent produced each event
- Highlight the **Gemini** badge on risk events — this is the web research agent
- Show the **integration note** on the Actions page to pivot to enterprise discussion
- For the audience: "This is the same event mesh that would connect to SAP, Bloomberg, and your internal tools"
