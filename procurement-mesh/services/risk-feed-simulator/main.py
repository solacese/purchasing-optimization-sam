"""
Risk Feed Simulator for Procurement Intelligence Mesh

Generates realistic weather, geopolitical, logistics, and trade risk events
for raw-material sourcing regions.

Run standalone:
    python main.py

Events published to:
    sam/procurement/risk/weather/{region}
    sam/procurement/risk/geopolitics/{region}
    sam/procurement/risk/logistics/{region}
    sam/procurement/risk/material/{material}
"""

import asyncio
import json
import logging
import os
import random
import uuid
from datetime import datetime, timezone

import httpx

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("risk-feed-simulator")

API_URL = os.getenv("PROCUREMENT_API_URL", "http://localhost:8090")
RISK_INTERVAL_SECONDS = float(os.getenv("RISK_FEED_INTERVAL", "12"))

RISK_SCENARIOS = [
    # Weather risks
    {
        "risk_type": "weather",
        "region": "morocco",
        "affected_materials": ["argan_oil"],
        "severity": "elevated",
        "headline": "Below-average rainfall in Souss-Massa region",
        "narrative": "Precipitation in the Souss-Massa region of Morocco has been 35% below the 10-year average over the past 60 days. Argan tree yields are sensitive to water stress, and cooperative sources report early signs of reduced nut production. If the trend continues through May, expect 10-15% yield reduction.",
        "sources": ["Morocco Meteorological Service", "Cooperative Targanine field report"],
        "recommended_action": "watch",
        "time_horizon": "weeks",
        "confidence": 0.65,
    },
    {
        "risk_type": "weather",
        "region": "morocco",
        "affected_materials": ["argan_oil"],
        "severity": "high",
        "headline": "Drought conditions confirmed in Morocco's argan belt",
        "narrative": "Morocco's meteorological service has officially declared drought conditions in the Souss-Massa-Draa region. Argan cooperatives report 20-25% lower nut yields. Water reservoirs at 40% capacity. The government has activated the agricultural emergency fund. This directly impacts argan oil supply for the next 6-9 months.",
        "sources": ["AFP", "Morocco Met Office", "FAO GIEWS"],
        "recommended_action": "accelerate_purchase",
        "time_horizon": "months",
        "confidence": 0.85,
    },
    {
        "risk_type": "weather",
        "region": "madagascar",
        "affected_materials": ["vanilla"],
        "severity": "high",
        "headline": "Tropical cyclone approaching northeast Madagascar",
        "narrative": "Cyclone Anjalay is tracking toward the SAVA region of Madagascar, the primary vanilla-growing area. Category 2 storm expected to make landfall within 72 hours. Previous cyclones have caused 20-30% crop losses and disrupted port operations in Antsirabe for weeks.",
        "sources": ["NOAA", "Météo-France La Réunion", "Reuters"],
        "recommended_action": "hedge",
        "time_horizon": "immediate",
        "confidence": 0.80,
    },
    {
        "risk_type": "weather",
        "region": "india",
        "affected_materials": ["palmarosa_oil"],
        "severity": "moderate",
        "headline": "Delayed monsoon onset in central India",
        "narrative": "Indian Meteorological Department reports the southwest monsoon is running 10-14 days behind schedule in Madhya Pradesh. Palmarosa grass cultivation depends on monsoon rains for the primary growth cycle. A 2-week delay typically reduces harvest yields by 5-8%.",
        "sources": ["IMD", "India Spice Board"],
        "recommended_action": "watch",
        "time_horizon": "weeks",
        "confidence": 0.60,
    },
    # Geopolitical risks
    {
        "risk_type": "geopolitics",
        "region": "burkina_faso",
        "affected_materials": ["shea_butter"],
        "severity": "elevated",
        "headline": "Security situation deterioration in northern Burkina Faso",
        "narrative": "Armed groups have increased activity near key shea-collection areas in Hauts-Bassins region. Several collection cooperatives have temporarily suspended operations. Road transport from collection points to Ouagadougou is experiencing delays of 3-7 days due to military checkpoints.",
        "sources": ["ACLED", "UN OCHA", "Local supplier reports"],
        "recommended_action": "diversify_supplier",
        "time_horizon": "weeks",
        "confidence": 0.70,
    },
    {
        "risk_type": "geopolitics",
        "region": "madagascar",
        "affected_materials": ["vanilla"],
        "severity": "moderate",
        "headline": "Export regulation changes under review in Madagascar",
        "narrative": "The Malagasy government is reviewing vanilla export regulations, potentially introducing minimum export prices and stricter quality certification requirements. If implemented, this could add 2-3 weeks to export processing times and increase costs by 5-8%.",
        "sources": ["Madagascar Ministry of Trade", "Spice Trade Association"],
        "recommended_action": "watch",
        "time_horizon": "months",
        "confidence": 0.55,
    },
    # Logistics risks
    {
        "risk_type": "logistics",
        "region": "west_africa",
        "affected_materials": ["shea_butter"],
        "severity": "moderate",
        "headline": "Port congestion at Tema, Ghana increasing",
        "narrative": "Container dwell times at Tema port have increased from 5 to 12 days over the past month due to customs system upgrades. This is affecting all West African exports routed through Ghana, including shea butter shipments. Alternative routing through Abidjan adds 4 days but is currently less congested.",
        "sources": ["Maersk advisory", "Ghana Ports Authority"],
        "recommended_action": "watch",
        "time_horizon": "weeks",
        "confidence": 0.75,
    },
    {
        "risk_type": "logistics",
        "region": "indian_ocean",
        "affected_materials": ["vanilla", "palmarosa_oil"],
        "severity": "elevated",
        "headline": "Shipping rate surge on Indian Ocean routes",
        "narrative": "Container shipping rates on Indian Ocean routes have increased 40% in the past 3 weeks due to rerouting around security concerns. Madagascar and India shipments via CIF terms will see cost increases reflected in next month's freight surcharges.",
        "sources": ["Drewry Shipping Index", "Freightos Baltic Index"],
        "recommended_action": "escalate",
        "time_horizon": "weeks",
        "confidence": 0.80,
    },
    # Low-risk / positive signals
    {
        "risk_type": "weather",
        "region": "bulgaria",
        "affected_materials": ["rose_extract"],
        "severity": "low",
        "headline": "Favorable growing conditions in Bulgaria's Rose Valley",
        "narrative": "Spring conditions in the Kazanlak valley are optimal for rosa damascena. Adequate rainfall and mild temperatures suggest a strong 2025 harvest season. Distilleries report normal preparation schedules.",
        "sources": ["Bulgarian Met Service", "Rosa Damascena Ltd"],
        "recommended_action": "watch",
        "time_horizon": "months",
        "confidence": 0.70,
    },
    {
        "risk_type": "trade_policy",
        "region": "usa",
        "affected_materials": ["jojoba_oil"],
        "severity": "low",
        "headline": "US-EU trade relations stable; no tariff changes expected",
        "narrative": "The latest US-EU Trade and Technology Council meeting confirmed continuity of current trade terms. No changes to cosmetic ingredient tariff classifications are anticipated in the current session.",
        "sources": ["USTR", "European Commission DG Trade"],
        "recommended_action": "watch",
        "time_horizon": "months",
        "confidence": 0.85,
    },
]

current_scenario_index = 0


def pick_risk_event() -> dict:
    """Pick a risk event, cycling through scenarios with some randomization."""
    global current_scenario_index
    scenario = RISK_SCENARIOS[current_scenario_index % len(RISK_SCENARIOS)]
    current_scenario_index += 1

    return {
        "risk_id": f"RSK-{uuid.uuid4().hex[:8].upper()}",
        **scenario,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def publish_event(client: httpx.AsyncClient, topic: str, payload: dict):
    try:
        resp = await client.post(
            f"{API_URL}/api/events/publish",
            json={"topic": topic, "payload": payload},
            timeout=5.0,
        )
        if resp.status_code == 200:
            logger.debug("Published risk event to %s", topic)
        else:
            logger.warning("Publish failed %s: %s", topic, resp.status_code)
    except Exception as e:
        logger.warning("Publish error for %s: %s", topic, e)


async def run_risk_feed():
    logger.info("Risk feed simulator started — publishing every %.1fs", RISK_INTERVAL_SECONDS)

    async with httpx.AsyncClient() as client:
        while True:
            event = pick_risk_event()

            topic_type = f"sam/procurement/risk/{event['risk_type']}/{event['region']}"
            await publish_event(client, topic_type, event)

            for mat in event["affected_materials"]:
                topic_mat = f"sam/procurement/risk/material/{mat}"
                await publish_event(client, topic_mat, event)

            if event["severity"] in ("high", "critical"):
                await publish_event(client, "sam/procurement/risk/alerts", event)

            jitter = random.uniform(0.5, 1.5)
            await asyncio.sleep(RISK_INTERVAL_SECONDS * jitter)


# --- Demo scenario injection ---

async def inject_morocco_drought(client: httpx.AsyncClient):
    """Inject the Morocco drought escalation sequence."""
    logger.info("SCENARIO: Injecting Morocco drought sequence")

    events = [e for e in RISK_SCENARIOS if e["region"] == "morocco" and e["risk_type"] == "weather"]
    for event in events:
        payload = {
            "risk_id": f"RSK-{uuid.uuid4().hex[:8].upper()}",
            **event,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await publish_event(client, f"sam/procurement/risk/weather/morocco", payload)
        await publish_event(client, "sam/procurement/risk/material/argan_oil", payload)
        if event["severity"] in ("high", "critical"):
            await publish_event(client, "sam/procurement/risk/alerts", payload)
        await asyncio.sleep(5)


async def inject_shea_stable_risk(client: httpx.AsyncClient):
    """Inject a low/stable risk profile for shea butter — supports HOLD recommendation."""
    logger.info("SCENARIO: Injecting stable Shea risk signal")

    payload = {
        "risk_id": f"RSK-{uuid.uuid4().hex[:8].upper()}",
        "risk_type": "weather",
        "region": "west_africa",
        "affected_materials": ["shea_butter"],
        "severity": "low",
        "headline": "Normal rainfall patterns across West African shea belt",
        "narrative": "Rainfall in Burkina Faso and Ghana's shea-producing regions is within normal range. No significant supply disruptions anticipated. Logistics through Tema port improving after recent congestion.",
        "sources": ["ECOWAS Met", "Ghana Met Agency"],
        "recommended_action": "watch",
        "time_horizon": "months",
        "confidence": 0.75,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await publish_event(client, "sam/procurement/risk/weather/west_africa", payload)
    await publish_event(client, "sam/procurement/risk/material/shea_butter", payload)


if __name__ == "__main__":
    asyncio.run(run_risk_feed())
