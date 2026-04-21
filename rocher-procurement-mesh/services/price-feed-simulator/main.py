"""
Price Feed Simulator for Procurement Intelligence Mesh

Generates realistic commodity price updates and FX rate changes,
publishing them to Solace topics for the Market Intelligence Agent.

Run standalone:
    python main.py

Events published to:
    sam/procurement/market/raw-material/{material}
    sam/procurement/market/fx/{pair}
"""

import asyncio
import json
import logging
import os
import random
import time
from datetime import datetime, timezone
from dataclasses import dataclass, asdict

import httpx

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("price-feed-simulator")

API_URL = os.getenv("PROCUREMENT_API_URL", "http://localhost:8090")

PUBLISH_INTERVAL_SECONDS = float(os.getenv("PRICE_FEED_INTERVAL", "5"))


@dataclass
class MaterialPrice:
    material: str
    base_price_eur: float
    currency: str
    volatility: float  # daily vol as fraction, e.g. 0.02 = 2%
    trend: float       # daily drift, e.g. 0.001 = +0.1%/day
    unit: str


MATERIALS: list[MaterialPrice] = [
    MaterialPrice("argan_oil",     45.00,  "MAD", 0.025, 0.0008, "EUR/kg"),
    MaterialPrice("shea_butter",    8.80,  "XOF", 0.018, -0.0003, "EUR/kg"),
    MaterialPrice("rose_extract", 385.00,  "BGN", 0.015, 0.0005, "EUR/kg"),
    MaterialPrice("jojoba_oil",    18.50,  "USD", 0.012, 0.0001, "EUR/kg"),
    MaterialPrice("vanilla",      310.00,  "MGA", 0.040, 0.0010, "EUR/kg"),
    MaterialPrice("palmarosa_oil", 32.00,  "INR", 0.020, 0.0002, "EUR/kg"),
]

FX_PAIRS = {
    "EUR_USD": {"rate": 1.085, "vol": 0.003},
    "EUR_MAD": {"rate": 10.85, "vol": 0.004},
    "EUR_XOF": {"rate": 655.96, "vol": 0.001},
    "EUR_BGN": {"rate": 1.956, "vol": 0.001},
    "EUR_MGA": {"rate": 4950.0, "vol": 0.008},
    "EUR_INR": {"rate": 90.5, "vol": 0.005},
}

# Track current prices (simulate walk)
current_prices: dict[str, float] = {}
current_fx: dict[str, float] = {}
price_history: dict[str, list[float]] = {}


def init_prices():
    for m in MATERIALS:
        current_prices[m.material] = m.base_price_eur
        price_history[m.material] = [m.base_price_eur]
    for pair, info in FX_PAIRS.items():
        current_fx[pair] = info["rate"]


def simulate_price_tick(mat: MaterialPrice) -> dict:
    """GBM-style price tick with trend and volatility."""
    price = current_prices[mat.material]
    shock = random.gauss(0, 1)
    change = price * (mat.trend + mat.volatility * shock)
    new_price = max(price + change, price * 0.5)  # floor at 50% of current
    current_prices[mat.material] = round(new_price, 2)
    price_history[mat.material].append(new_price)

    # Keep last 200 ticks
    if len(price_history[mat.material]) > 200:
        price_history[mat.material] = price_history[mat.material][-200:]

    hist = price_history[mat.material]
    avg_7 = sum(hist[-7:]) / min(len(hist), 7) if len(hist) >= 2 else new_price
    avg_30 = sum(hist[-30:]) / min(len(hist), 30) if len(hist) >= 2 else new_price

    return {
        "event_type": "price_update",
        "material": mat.material,
        "price_eur_per_kg": round(new_price, 2),
        "previous_price_eur": round(price, 2),
        "change_pct": round((new_price - price) / price * 100, 3),
        "avg_7_tick": round(avg_7, 2),
        "avg_30_tick": round(avg_30, 2),
        "local_currency": mat.currency,
        "unit": mat.unit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def simulate_fx_tick(pair: str) -> dict:
    info = FX_PAIRS[pair]
    rate = current_fx[pair]
    shock = random.gauss(0, 1)
    change = rate * info["vol"] * shock
    new_rate = round(rate + change, 4)
    current_fx[pair] = new_rate

    return {
        "event_type": "fx_update",
        "pair": pair,
        "rate": new_rate,
        "previous_rate": round(rate, 4),
        "change_pct": round((new_rate - rate) / rate * 100, 4),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def publish_event(client: httpx.AsyncClient, topic: str, payload: dict):
    """Publish event to the procurement API which fans out to Solace."""
    try:
        resp = await client.post(
            f"{API_URL}/api/events/publish",
            json={"topic": topic, "payload": payload},
            timeout=5.0,
        )
        if resp.status_code == 200:
            logger.debug("Published to %s", topic)
        else:
            logger.warning("Publish failed %s: %s", topic, resp.status_code)
    except Exception as e:
        logger.warning("Publish error for %s: %s", topic, e)


async def run_price_feed():
    init_prices()
    logger.info("Price feed simulator started — publishing every %.1fs", PUBLISH_INTERVAL_SECONDS)

    async with httpx.AsyncClient() as client:
        tick = 0
        while True:
            tasks = []

            # Publish price updates for all materials
            for mat in MATERIALS:
                event = simulate_price_tick(mat)
                topic = f"sam/procurement/market/raw-material/{mat.material}"
                tasks.append(publish_event(client, topic, event))

            # Publish FX updates (less frequently)
            if tick % 3 == 0:
                for pair in FX_PAIRS:
                    event = simulate_fx_tick(pair)
                    topic = f"sam/procurement/market/fx/{pair}"
                    tasks.append(publish_event(client, topic, event))

            await asyncio.gather(*tasks)
            tick += 1
            await asyncio.sleep(PUBLISH_INTERVAL_SECONDS)


# --- Demo scenario injection ---

async def inject_argan_spike(client: httpx.AsyncClient):
    """Simulate a 12% argan oil price spike over several ticks."""
    logger.info("SCENARIO: Injecting Argan oil price spike")
    mat = next(m for m in MATERIALS if m.material == "argan_oil")

    for i in range(8):
        price = current_prices["argan_oil"]
        bump = price * random.uniform(0.012, 0.020)
        current_prices["argan_oil"] = round(price + bump, 2)
        price_history["argan_oil"].append(current_prices["argan_oil"])

        event = {
            "event_type": "price_update",
            "material": "argan_oil",
            "price_eur_per_kg": current_prices["argan_oil"],
            "previous_price_eur": round(price, 2),
            "change_pct": round(bump / price * 100, 3),
            "avg_7_tick": round(sum(price_history["argan_oil"][-7:]) / min(len(price_history["argan_oil"]), 7), 2),
            "avg_30_tick": round(sum(price_history["argan_oil"][-30:]) / min(len(price_history["argan_oil"]), 30), 2),
            "local_currency": mat.currency,
            "unit": mat.unit,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await publish_event(client, "sam/procurement/market/raw-material/argan_oil", event)
        await asyncio.sleep(2)


async def inject_shea_softening(client: httpx.AsyncClient):
    """Simulate shea butter price decline — supports 'HOLD' recommendation."""
    logger.info("SCENARIO: Injecting Shea butter softening")
    mat = next(m for m in MATERIALS if m.material == "shea_butter")

    for i in range(6):
        price = current_prices["shea_butter"]
        drop = price * random.uniform(0.005, 0.012)
        current_prices["shea_butter"] = round(price - drop, 2)
        price_history["shea_butter"].append(current_prices["shea_butter"])

        event = {
            "event_type": "price_update",
            "material": "shea_butter",
            "price_eur_per_kg": current_prices["shea_butter"],
            "previous_price_eur": round(price, 2),
            "change_pct": round(-drop / price * 100, 3),
            "avg_7_tick": round(sum(price_history["shea_butter"][-7:]) / min(len(price_history["shea_butter"]), 7), 2),
            "avg_30_tick": round(sum(price_history["shea_butter"][-30:]) / min(len(price_history["shea_butter"]), 30), 2),
            "local_currency": mat.currency,
            "unit": mat.unit,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await publish_event(client, "sam/procurement/market/raw-material/shea_butter", event)
        await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(run_price_feed())
