"""
Pre-loaded sample data and agent-generated recommendations
for the demo. In production, all this comes live from the event mesh.
"""

from datetime import datetime, timezone, timedelta
import json
import os

DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "data"))


def load_json(path: str):
    with open(path) as f:
        return json.load(f)


def load_contracts():
    return load_json(os.path.join(DATA_DIR, "contracts", "historical_contracts.json"))


def load_suppliers():
    return load_json(os.path.join(DATA_DIR, "suppliers", "suppliers.json"))


def load_volumes():
    return load_json(os.path.join(DATA_DIR, "volumes", "monthly_volumes.json"))


def load_forecasts():
    return load_json(os.path.join(DATA_DIR, "forecasts", "demand_forecast_2025.json"))


MATERIAL_DISPLAY_NAMES = {
    "argan_oil": "Argan Oil",
    "shea_butter": "Shea Butter",
    "rose_extract": "Rose Extract",
    "jojoba_oil": "Jojoba Oil",
    "vanilla": "Vanilla",
    "palmarosa_oil": "Palmarosa Oil",
}

INITIAL_PRICES = {
    "argan_oil": 45.00,
    "shea_butter": 8.80,
    "rose_extract": 385.00,
    "jojoba_oil": 18.50,
    "vanilla": 310.00,
    "palmarosa_oil": 32.00,
}


def seed_recommendations():
    """Pre-generated sample recommendations for demo startup."""
    now = datetime.now(timezone.utc)
    return [
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
            "rationale": "Buy 35% of forecast Argan requirement now. Morocco drought risk is elevated (severity: high, confidence: 0.85) and price momentum is rising (+4.2% over 7 days). Current inventory covers 5.3 weeks against 4-week safety stock — adequate but thinning given supply risk. Recommend locking volume before further price increases.",
            "signals_used": [
                {"source": "MarketIntelligenceAgent", "signal_type": "price_shock", "summary": "Argan oil price up 12% in 10 days"},
                {"source": "RiskWebIntelligenceAgent", "signal_type": "weather_risk", "summary": "Morocco drought — high severity, 0.85 confidence"},
            ],
            "risk_factors": ["Morocco drought reducing argan nut yields by 20-25%", "EUR/MAD movement adding 1.5% cost pressure"],
            "contract_context": "Active contract CTR-2025-001: 14,000 kg at EUR 45.00/kg, 9,800 kg remaining",
            "inventory_context": "Current inventory 3,200 kg = 5.3 weeks coverage (safety stock: 4 weeks)",
            "created_at": (now - timedelta(minutes=12)).isoformat(),
        },
        {
            "recommendation_id": "REC-002",
            "material": "shea_butter",
            "action": "hold",
            "urgency": "low",
            "suggested_quantity_kg": None,
            "suggested_quantity_pct_of_forecast": None,
            "price_target_eur": None,
            "timing_window": "reassess in 10 days",
            "confidence": 0.72,
            "rationale": "Hold Shea butter purchases for 10 days. Market is softening (-3.1% over 7 days) with stable risk profile. Current inventory at 8.8 weeks coverage significantly exceeds 6-week safety stock. Active contract CTR-2025-002 still has 21,000 kg remaining at EUR 8.80/kg. No urgency to add spot volume — let the price decline play out.",
            "signals_used": [
                {"source": "MarketIntelligenceAgent", "signal_type": "price_update", "summary": "Shea butter price declining -3.1% over 7 days"},
                {"source": "RiskWebIntelligenceAgent", "signal_type": "weather_risk", "summary": "West Africa rainfall normal — low risk"},
            ],
            "risk_factors": ["Port congestion at Tema (moderate) — monitoring"],
            "contract_context": "Active contract CTR-2025-002: 28,000 kg at EUR 8.80/kg, 21,000 kg remaining",
            "inventory_context": "Current inventory 9,500 kg = 8.8 weeks coverage (safety stock: 6 weeks)",
            "created_at": (now - timedelta(minutes=8)).isoformat(),
        },
        {
            "recommendation_id": "REC-003",
            "material": "rose_extract",
            "action": "escalate",
            "urgency": "medium",
            "suggested_quantity_kg": None,
            "suggested_quantity_pct_of_forecast": None,
            "price_target_eur": None,
            "timing_window": "within 2 weeks",
            "confidence": 0.65,
            "rationale": "Escalate Rose extract contract review. Active contract CTR-2024-003 expires April 30 with only 180 kg remaining against 900 kg annual forecast. Bulgarian harvest season begins in May — optimal time to negotiate a new contract. Growing conditions are favorable, so pricing power should be reasonable. Flag to commodity manager for renewal negotiation.",
            "signals_used": [
                {"source": "MarketIntelligenceAgent", "signal_type": "price_update", "summary": "Rose extract prices stable, +0.5% over 30 days"},
                {"source": "RiskWebIntelligenceAgent", "signal_type": "weather_risk", "summary": "Bulgaria growing conditions favorable — low risk"},
            ],
            "risk_factors": ["Contract expiry in 14 days", "Single-source dependency on Rosa Damascena Ltd"],
            "contract_context": "Contract CTR-2024-003 expires 2025-04-30. 180 kg remaining of 800 kg.",
            "inventory_context": "Current inventory 180 kg = 10.4 weeks coverage (safety stock: 8 weeks) — adequate for now",
            "created_at": (now - timedelta(minutes=5)).isoformat(),
        },
        {
            "recommendation_id": "REC-004",
            "material": "vanilla",
            "action": "hedge",
            "urgency": "high",
            "suggested_quantity_kg": 600,
            "suggested_quantity_pct_of_forecast": 33,
            "price_target_eur": 315.00,
            "timing_window": "next 7 days",
            "confidence": 0.70,
            "rationale": "Hedge 33% of vanilla forecast via forward contract. Cyclone approaching Madagascar's SAVA region creates immediate supply risk. Vanilla prices already volatile (+2.8% this week). Active contract has 1,350 kg remaining but delivery could be disrupted. Lock additional volume at current levels as insurance against post-cyclone price spikes.",
            "signals_used": [
                {"source": "RiskWebIntelligenceAgent", "signal_type": "weather_risk", "summary": "Cyclone approaching Madagascar — high severity"},
                {"source": "MarketIntelligenceAgent", "signal_type": "price_update", "summary": "Vanilla +2.8% this week, high volatility"},
            ],
            "risk_factors": ["Cyclone Anjalay — Category 2, landfall in 72h", "Historical precedent: 20-30% crop loss from similar events"],
            "contract_context": "Active contract CTR-2025-003: 1,800 kg at EUR 310/kg, 1,350 kg remaining",
            "inventory_context": "Current inventory 420 kg = 6.1 weeks coverage (safety stock: 6 weeks) — at minimum threshold",
            "created_at": (now - timedelta(minutes=3)).isoformat(),
        },
    ]


def seed_risk_events():
    """Pre-generated risk events for demo startup."""
    now = datetime.now(timezone.utc)
    return [
        {
            "risk_id": "RSK-DEMO-001",
            "risk_type": "weather",
            "region": "morocco",
            "affected_materials": ["argan_oil"],
            "severity": "high",
            "confidence": 0.85,
            "headline": "Drought conditions confirmed in Morocco's argan belt",
            "narrative": "Morocco's meteorological service has officially declared drought conditions in the Souss-Massa-Draa region. Argan cooperatives report 20-25% lower nut yields. Water reservoirs at 40% capacity.",
            "sources": ["AFP", "Morocco Met Office", "FAO GIEWS"],
            "recommended_action": "accelerate_purchase",
            "time_horizon": "months",
            "updated_at": (now - timedelta(minutes=15)).isoformat(),
        },
        {
            "risk_id": "RSK-DEMO-002",
            "risk_type": "weather",
            "region": "madagascar",
            "affected_materials": ["vanilla"],
            "severity": "high",
            "confidence": 0.80,
            "headline": "Tropical cyclone approaching northeast Madagascar",
            "narrative": "Cyclone Anjalay is tracking toward the SAVA region. Category 2 storm expected to make landfall within 72 hours. Previous cyclones caused 20-30% crop losses.",
            "sources": ["NOAA", "Météo-France La Réunion", "Reuters"],
            "recommended_action": "hedge",
            "time_horizon": "immediate",
            "updated_at": (now - timedelta(minutes=10)).isoformat(),
        },
        {
            "risk_id": "RSK-DEMO-003",
            "risk_type": "weather",
            "region": "west_africa",
            "affected_materials": ["shea_butter"],
            "severity": "low",
            "confidence": 0.75,
            "headline": "Normal rainfall patterns across West African shea belt",
            "narrative": "Rainfall in Burkina Faso and Ghana is within normal range. No significant supply disruptions anticipated.",
            "sources": ["ECOWAS Met", "Ghana Met Agency"],
            "recommended_action": "watch",
            "time_horizon": "months",
            "updated_at": (now - timedelta(minutes=8)).isoformat(),
        },
        {
            "risk_id": "RSK-DEMO-004",
            "risk_type": "logistics",
            "region": "indian_ocean",
            "affected_materials": ["vanilla", "palmarosa_oil"],
            "severity": "elevated",
            "confidence": 0.80,
            "headline": "Shipping rate surge on Indian Ocean routes",
            "narrative": "Container shipping rates up 40% in 3 weeks due to rerouting. Madagascar and India CIF shipments will see cost increases.",
            "sources": ["Drewry Shipping Index", "Freightos Baltic Index"],
            "recommended_action": "escalate",
            "time_horizon": "weeks",
            "updated_at": (now - timedelta(minutes=5)).isoformat(),
        },
    ]


def seed_market_events():
    """Pre-generated market events for demo startup."""
    now = datetime.now(timezone.utc)
    return [
        {
            "event_type": "price_shock",
            "material": "argan_oil",
            "price_eur_per_kg": 50.40,
            "previous_price_eur": 45.00,
            "change_pct": 12.0,
            "avg_7_tick": 48.50,
            "avg_30_tick": 46.20,
            "momentum": "rising",
            "confidence": 0.88,
            "summary": "Argan oil price up 12% in 10 days — classified as price shock. Rising momentum driven by Morocco drought concerns.",
            "timestamp": (now - timedelta(minutes=10)).isoformat(),
        },
        {
            "event_type": "price_update",
            "material": "shea_butter",
            "price_eur_per_kg": 8.53,
            "previous_price_eur": 8.80,
            "change_pct": -3.1,
            "avg_7_tick": 8.60,
            "avg_30_tick": 8.75,
            "momentum": "declining",
            "confidence": 0.72,
            "summary": "Shea butter softening -3.1% over 7 days. Stable supply outlook supporting price decline.",
            "timestamp": (now - timedelta(minutes=8)).isoformat(),
        },
        {
            "event_type": "price_update",
            "material": "vanilla",
            "price_eur_per_kg": 318.70,
            "previous_price_eur": 310.00,
            "change_pct": 2.8,
            "avg_7_tick": 314.50,
            "avg_30_tick": 311.20,
            "momentum": "rising",
            "confidence": 0.65,
            "summary": "Vanilla +2.8% this week. Cyclone risk adding upward pressure. Historically volatile.",
            "timestamp": (now - timedelta(minutes=6)).isoformat(),
        },
        {
            "event_type": "price_update",
            "material": "rose_extract",
            "price_eur_per_kg": 386.90,
            "previous_price_eur": 385.00,
            "change_pct": 0.5,
            "avg_7_tick": 385.80,
            "avg_30_tick": 385.30,
            "momentum": "stable",
            "confidence": 0.80,
            "summary": "Rose extract prices stable. Pre-harvest period — pricing typically firm until June distillation.",
            "timestamp": (now - timedelta(minutes=4)).isoformat(),
        },
    ]
