#!/usr/bin/env bash
set -euo pipefail

# ── Procurement Intelligence Mesh — Demo Scenario Script ────────────
# Plays two scripted scenarios against the running system.
# Prerequisites: API running on http://localhost:8090
#
# Usage: ./scripts/run_demo_scenario.sh

API="http://localhost:8090"

publish() {
  curl -s -X POST "$API/api/events/publish" \
    -H "Content-Type: application/json" \
    -d "$1" >/dev/null
}

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "═══════════════════════════════════════════════════"
echo "  Demo Scenario Script"
echo "  Open http://localhost:5173 to watch live"
echo "═══════════════════════════════════════════════════"
echo ""

# ────────────────────────────────────────────────────────────────
echo "▶ SCENARIO 1: Argan Oil — Price Spike + Morocco Drought"
echo "  Expected outcome: BUY_PARTIAL recommendation"
echo ""

echo "  [1/8] Argan oil price rising: EUR 45.00 → 46.50..."
publish '{"topic":"sam/procurement/market/raw-material/argan_oil","payload":{"event_type":"price_update","material":"argan_oil","price_eur_per_kg":46.50,"previous_price_eur":45.00,"change_pct":3.33,"avg_7_tick":45.80,"avg_30_tick":45.20,"momentum":"rising","local_currency":"MAD","unit":"EUR/kg","timestamp":"'"$NOW"'"}}'
sleep 3

echo "  [2/8] Price continues: EUR 46.50 → 48.20..."
publish '{"topic":"sam/procurement/market/raw-material/argan_oil","payload":{"event_type":"price_update","material":"argan_oil","price_eur_per_kg":48.20,"previous_price_eur":46.50,"change_pct":3.66,"avg_7_tick":46.90,"avg_30_tick":45.50,"momentum":"rising","local_currency":"MAD","unit":"EUR/kg","timestamp":"'"$NOW"'"}}'
sleep 3

echo "  [3/8] Price spike: EUR 48.20 → 50.40 (total +12%)..."
publish '{"topic":"sam/procurement/market/raw-material/argan_oil","payload":{"event_type":"price_shock","material":"argan_oil","price_eur_per_kg":50.40,"previous_price_eur":48.20,"change_pct":4.56,"avg_7_tick":48.50,"avg_30_tick":46.20,"momentum":"rising","confidence":0.88,"summary":"Argan oil price up 12% in 10 days — classified as price shock. Rising momentum driven by Morocco drought concerns.","timestamp":"'"$NOW"'"}}'
sleep 3

echo "  [4/8] Morocco weather alert: below-average rainfall..."
publish '{"topic":"sam/procurement/risk/weather/morocco","payload":{"risk_id":"RSK-SCENARIO-001","risk_type":"weather","region":"morocco","affected_materials":["argan_oil"],"severity":"elevated","confidence":0.65,"headline":"Below-average rainfall in Souss-Massa region","narrative":"Precipitation in the Souss-Massa region of Morocco has been 35% below the 10-year average over the past 60 days. Argan tree yields are sensitive to water stress.","sources":["Morocco Meteorological Service","Cooperative Targanine field report"],"recommended_action":"watch","time_horizon":"weeks","updated_at":"'"$NOW"'"}}'
sleep 4

echo "  [5/8] ESCALATION: Morocco drought confirmed — severity HIGH..."
publish '{"topic":"sam/procurement/risk/weather/morocco","payload":{"risk_id":"RSK-SCENARIO-002","risk_type":"weather","region":"morocco","affected_materials":["argan_oil"],"severity":"high","confidence":0.85,"headline":"Drought conditions confirmed in Morocco argan belt","narrative":"Morocco meteorological service has officially declared drought conditions in the Souss-Massa-Draa region. Argan cooperatives report 20-25% lower nut yields. Water reservoirs at 40% capacity. Government activated agricultural emergency fund.","sources":["AFP","Morocco Met Office","FAO GIEWS"],"recommended_action":"accelerate_purchase","time_horizon":"months","updated_at":"'"$NOW"'"}}'
sleep 2

echo "  [6/8] Risk alert published..."
publish '{"topic":"sam/procurement/risk/alerts","payload":{"risk_id":"RSK-SCENARIO-002","risk_type":"weather","region":"morocco","affected_materials":["argan_oil"],"severity":"high","confidence":0.85,"headline":"Drought conditions confirmed in Morocco argan belt","recommended_action":"accelerate_purchase","updated_at":"'"$NOW"'"}}'
sleep 2

echo "  [7/8] Risk assessment per material..."
publish '{"topic":"sam/procurement/risk/material/argan_oil","payload":{"risk_id":"RSK-SCENARIO-002","risk_type":"weather","region":"morocco","affected_materials":["argan_oil"],"severity":"high","confidence":0.85,"headline":"Drought conditions confirmed in Morocco argan belt","narrative":"Morocco meteorological service has officially declared drought conditions. Argan cooperatives report 20-25% lower nut yields.","sources":["AFP","Morocco Met Office","FAO GIEWS"],"recommended_action":"accelerate_purchase","time_horizon":"months","updated_at":"'"$NOW"'"}}'
sleep 3

echo "  [8/8] Procurement Advisor: BUY_PARTIAL recommendation..."
publish '{"topic":"sam/procurement/advice/recommendations","payload":{"recommendation_id":"REC-LIVE-001","material":"argan_oil","action":"buy_partial","urgency":"high","suggested_quantity_kg":4900,"suggested_quantity_pct_of_forecast":35,"price_target_eur":50.40,"timing_window":"next 5 days","confidence":0.78,"rationale":"Buy 35% of forecast Argan requirement now. Morocco drought risk is elevated (severity: high, confidence: 0.85) and price momentum is rising (+12% over 10 days). Current inventory covers 5.3 weeks against 4-week safety stock — adequate but thinning given confirmed supply risk. Recommend locking 4,900 kg at current EUR 50.40/kg before further price increases.","signals_used":[{"source":"MarketIntelligenceAgent","signal_type":"price_shock","summary":"Argan oil price up 12% in 10 days"},{"source":"RiskWebIntelligenceAgent","signal_type":"weather_risk","summary":"Morocco drought — high severity, 0.85 confidence"}],"risk_factors":["Morocco drought reducing argan nut yields by 20-25%","EUR/MAD movement adding cost pressure","Supply shortage expected for 6-9 months"],"contract_context":"Active contract CTR-2025-001: 14,000 kg at EUR 45.00/kg, 9,800 kg remaining","inventory_context":"Current inventory 3,200 kg = 5.3 weeks coverage (safety stock: 4 weeks)","created_at":"'"$NOW"'"}}'

echo ""
echo "  ✓ Scenario 1 complete — check the UI!"
echo ""
sleep 5

# ────────────────────────────────────────────────────────────────
echo "▶ SCENARIO 2: Shea Butter — Price Softening + Stable Risk"
echo "  Expected outcome: HOLD recommendation"
echo ""

echo "  [1/5] Shea butter price softening: EUR 8.80 → 8.60..."
publish '{"topic":"sam/procurement/market/raw-material/shea_butter","payload":{"event_type":"price_update","material":"shea_butter","price_eur_per_kg":8.60,"previous_price_eur":8.80,"change_pct":-2.27,"avg_7_tick":8.68,"avg_30_tick":8.75,"momentum":"declining","local_currency":"XOF","unit":"EUR/kg","timestamp":"'"$NOW"'"}}'
sleep 3

echo "  [2/5] Price continues declining: EUR 8.60 → 8.53..."
publish '{"topic":"sam/procurement/market/raw-material/shea_butter","payload":{"event_type":"price_update","material":"shea_butter","price_eur_per_kg":8.53,"previous_price_eur":8.60,"change_pct":-0.81,"avg_7_tick":8.60,"avg_30_tick":8.73,"momentum":"declining","confidence":0.72,"summary":"Shea butter softening -3.1% over 7 days. Stable supply outlook supporting price decline.","timestamp":"'"$NOW"'"}}'
sleep 3

echo "  [3/5] West Africa risk: stable, low severity..."
publish '{"topic":"sam/procurement/risk/weather/west_africa","payload":{"risk_id":"RSK-SCENARIO-003","risk_type":"weather","region":"west_africa","affected_materials":["shea_butter"],"severity":"low","confidence":0.75,"headline":"Normal rainfall patterns across West African shea belt","narrative":"Rainfall in Burkina Faso and Ghana producing regions is within normal range. No significant supply disruptions anticipated. Port congestion at Tema improving.","sources":["ECOWAS Met","Ghana Met Agency"],"recommended_action":"watch","time_horizon":"months","updated_at":"'"$NOW"'"}}'
sleep 2

echo "  [4/5] Risk per material — stable..."
publish '{"topic":"sam/procurement/risk/material/shea_butter","payload":{"risk_id":"RSK-SCENARIO-003","risk_type":"weather","region":"west_africa","affected_materials":["shea_butter"],"severity":"low","confidence":0.75,"headline":"Normal rainfall patterns across West African shea belt","narrative":"Rainfall in Burkina Faso and Ghana producing regions is within normal range. No significant supply disruptions anticipated.","sources":["ECOWAS Met","Ghana Met Agency"],"recommended_action":"watch","time_horizon":"months","updated_at":"'"$NOW"'"}}'
sleep 3

echo "  [5/5] Procurement Advisor: HOLD recommendation..."
publish '{"topic":"sam/procurement/advice/recommendations","payload":{"recommendation_id":"REC-LIVE-002","material":"shea_butter","action":"hold","urgency":"low","suggested_quantity_kg":null,"suggested_quantity_pct_of_forecast":null,"price_target_eur":null,"timing_window":"reassess in 10 days","confidence":0.72,"rationale":"Hold Shea butter purchases for 10 days. Market is softening (-3.1% over 7 days) with stable risk profile. Current inventory at 8.8 weeks coverage significantly exceeds 6-week safety stock. Active contract CTR-2025-002 still has 21,000 kg remaining at EUR 8.80/kg. No urgency to add spot volume — let the price decline play out.","signals_used":[{"source":"MarketIntelligenceAgent","signal_type":"price_update","summary":"Shea butter price declining -3.1% over 7 days"},{"source":"RiskWebIntelligenceAgent","signal_type":"weather_risk","summary":"West Africa rainfall normal — low risk"}],"risk_factors":["Port congestion at Tema (moderate) — monitoring but improving"],"contract_context":"Active contract CTR-2025-002: 28,000 kg at EUR 8.80/kg, 21,000 kg remaining","inventory_context":"Current inventory 9,500 kg = 8.8 weeks coverage (safety stock: 6 weeks)","created_at":"'"$NOW"'"}}'

echo ""
echo "  ✓ Scenario 2 complete — check the UI!"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Both scenarios complete."
echo "  Review results at http://localhost:5173"
echo "═══════════════════════════════════════════════════"
