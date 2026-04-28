"""
Procurement API Gateway — with embedded simulators

Self-contained FastAPI service:
- Background price ticker (GBM every 3-4s)
- English news feed (every 8-12s)
- LLM agent buying commentary (every ~25-35s)
- Multi-agent collaboration analysis (every ~45s)
- SSE real-time push to UI

Run:
    uvicorn main:app --reload --port 8090
"""

import asyncio
import json
import logging
import os
import random
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from pydantic import BaseModel
from models import EventPublish, BuyerAction
from sample_data import (
    load_contracts,
    load_suppliers,
    load_volumes,
    load_forecasts,
    seed_recommendations,
    seed_risk_events,
    seed_market_events,
    MATERIAL_DISPLAY_NAMES,
    INITIAL_PRICES,
)
from agents import generate_commentary, run_collaboration, run_invoice_check

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("procurement-api")

app = FastAPI(
    title="NaturaCo Procurement Intelligence API",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ─────────────────────────────────────────────

market_events: deque = deque(maxlen=500)
risk_events: deque = deque(maxlen=200)
recommendations: deque = deque(maxlen=100)
news_items: deque = deque(maxlen=100)
all_events: deque = deque(maxlen=1000)
collaboration_threads: deque = deque(maxlen=50)
buyer_actions: list = []

current_prices: dict[str, float] = dict(INITIAL_PRICES)
price_history: dict[str, list[float]] = {k: [v] for k, v in INITIAL_PRICES.items()}
current_risks: dict[str, dict] = {}
current_recommendations: dict[str, dict] = {}
current_commentary: dict[str, dict] = {}

sse_subscribers: list[asyncio.Queue] = []

# ── Material config for simulator ───────────────────────────────

MATERIALS_SIM = {
    "argan_oil":     {"vol": 0.025, "trend": 0.0012},
    "shea_butter":   {"vol": 0.018, "trend": -0.0005},
    "rose_extract":  {"vol": 0.015, "trend": 0.0005},
    "jojoba_oil":    {"vol": 0.012, "trend": 0.0001},
    "vanilla":       {"vol": 0.040, "trend": 0.0015},
    "palmarosa_oil": {"vol": 0.020, "trend": 0.0002},
}

# ── English news items ──────────────────────────────────────────

NEWS_ITEMS = [
    {"headline": "Record drought in Morocco: argan cooperatives cut yield forecasts by 25%", "region": "morocco", "materials": ["argan_oil"], "severity": "high", "source": "AFP Rabat", "category": "Weather"},
    {"headline": "Ghana's Tema port returns to normal after 3 weeks of congestion", "region": "west_africa", "materials": ["shea_butter"], "severity": "low", "source": "Reuters Accra", "category": "Logistics"},
    {"headline": "Cyclone Anjalay: Madagascar on red alert, vanilla harvest under threat", "region": "madagascar", "materials": ["vanilla"], "severity": "high", "source": "Meteo-France Reunion", "category": "Weather"},
    {"headline": "EUR/USD steady at 1.085 — no notable impact on dollar-denominated purchases", "region": "global", "materials": ["jojoba_oil"], "severity": "low", "source": "Bloomberg FX", "category": "Currency"},
    {"headline": "Bulgaria announces exceptional rosa damascena harvest for 2025", "region": "bulgaria", "materials": ["rose_extract"], "severity": "low", "source": "Novinite Sofia", "category": "Harvest"},
    {"headline": "Political instability in Burkina Faso: roads to Ouagadougou disrupted", "region": "burkina_faso", "materials": ["shea_butter"], "severity": "elevated", "source": "RFI Africa", "category": "Geopolitics"},
    {"headline": "Indian monsoon delayed by 10 days — moderate impact on palmarosa", "region": "india", "materials": ["palmarosa_oil"], "severity": "moderate", "source": "India Met Dept", "category": "Weather"},
    {"headline": "Maritime freight rates up 40% on Indian Ocean routes", "region": "indian_ocean", "materials": ["vanilla", "palmarosa_oil"], "severity": "elevated", "source": "Drewry Shipping", "category": "Logistics"},
    {"headline": "Morocco unlocks 500M MAD agricultural emergency fund for drought relief", "region": "morocco", "materials": ["argan_oil"], "severity": "high", "source": "MAP Rabat", "category": "Geopolitics"},
    {"headline": "New EU quality standard for essential oils — limited impact on certified suppliers", "region": "europe", "materials": ["rose_extract", "palmarosa_oil"], "severity": "low", "source": "European Commission", "category": "Regulation"},
    {"headline": "Global demand for natural ingredients up 8% in Q1 2025", "region": "global", "materials": ["argan_oil", "shea_butter", "jojoba_oil"], "severity": "moderate", "source": "Cosmetics Business", "category": "Market"},
    {"headline": "Ghana tightens quality controls on shea butter exports", "region": "west_africa", "materials": ["shea_butter"], "severity": "low", "source": "Ghana Export Council", "category": "Regulation"},
    {"headline": "Alert: green vanilla theft reported in Madagascar's SAVA region", "region": "madagascar", "materials": ["vanilla"], "severity": "elevated", "source": "Tribune Madagascar", "category": "Security"},
    {"headline": "Arizona sees record rainfall — good news for jojoba yields", "region": "usa", "materials": ["jojoba_oil"], "severity": "low", "source": "Arizona Republic", "category": "Weather"},
    {"headline": "Moroccan dirham depreciates 1.2% against euro this week", "region": "morocco", "materials": ["argan_oil"], "severity": "moderate", "source": "Bank Al-Maghrib", "category": "Currency"},
    {"headline": "EU-Madagascar trade tensions: export agreements under review", "region": "madagascar", "materials": ["vanilla"], "severity": "moderate", "source": "Le Monde", "category": "Geopolitics"},
    {"headline": "FAO report: global shea production down 5% year-on-year", "region": "west_africa", "materials": ["shea_butter"], "severity": "moderate", "source": "FAO Rome", "category": "Market"},
    {"headline": "NaturaCo summer range launch — peak demand expected for argan and shea", "region": "france", "materials": ["argan_oil", "shea_butter"], "severity": "moderate", "source": "LSA Commerce", "category": "Internal"},
    {"headline": "Air freight from India becomes competitive again after fuel surcharge drop", "region": "india", "materials": ["palmarosa_oil"], "severity": "low", "source": "Air Cargo News", "category": "Logistics"},
    {"headline": "Moroccan argan cooperatives report 30% lower nut yields", "region": "morocco", "materials": ["argan_oil"], "severity": "high", "source": "Cooperative Targanine", "category": "Supplier"},
    {"headline": "Political stability in Bulgaria: agricultural exports remain smooth", "region": "bulgaria", "materials": ["rose_extract"], "severity": "low", "source": "BTA Sofia", "category": "Geopolitics"},
    {"headline": "India considers temporary restrictions on essential oil exports", "region": "india", "materials": ["palmarosa_oil"], "severity": "elevated", "source": "Economic Times", "category": "Regulation"},
    {"headline": "Bourbon vanilla hits EUR 320/kg — highest in 6 months", "region": "madagascar", "materials": ["vanilla"], "severity": "high", "source": "Spice Trade Weekly", "category": "Market"},
    {"headline": "Improved growing conditions in the Sahel — positive outlook for shea", "region": "west_africa", "materials": ["shea_butter"], "severity": "low", "source": "CILSS Ouagadougou", "category": "Weather"},
    {"headline": "Contract CTR-2024-003 for rose extract expires in 14 days", "region": "europe", "materials": ["rose_extract"], "severity": "elevated", "source": "Internal — Contract Mgmt", "category": "Contract"},
    {"headline": "Vanilla forward contracts trading at 8% premium to spot", "region": "madagascar", "materials": ["vanilla"], "severity": "moderate", "source": "Spice Futures Desk", "category": "Market"},
    {"headline": "New argan processing facility opens in Agadir — capacity +15%", "region": "morocco", "materials": ["argan_oil"], "severity": "low", "source": "Morocco World News", "category": "Supplier"},
    {"headline": "Suez Canal transit delays add 3-5 days to Indian Ocean shipments", "region": "indian_ocean", "materials": ["vanilla", "palmarosa_oil"], "severity": "elevated", "source": "Maersk Advisory", "category": "Logistics"},
]

news_cycle_index = 0


# ── SSE fan-out helper ──────────────────────────────────────────

async def _fan_out(event: dict):
    all_events.append(event)
    for queue in sse_subscribers:
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            pass


# ── Background: price ticker ────────────────────────────────────

async def _background_price_ticker():
    logger.info("Background price ticker started")
    while True:
        for mat, cfg in MATERIALS_SIM.items():
            price = current_prices[mat]
            shock = random.gauss(0, 1)
            change = price * (cfg["trend"] + cfg["vol"] * shock)
            new_price = max(round(price + change, 2), price * 0.5)
            current_prices[mat] = new_price
            price_history[mat].append(new_price)
            if len(price_history[mat]) > 200:
                price_history[mat] = price_history[mat][-200:]

            change_pct = round((new_price - price) / price * 100, 3)
            event = {
                "event_type": "price_update",
                "material": mat,
                "price_eur_per_kg": new_price,
                "previous_price_eur": round(price, 2),
                "change_pct": change_pct,
                "avg_7": round(sum(price_history[mat][-7:]) / min(len(price_history[mat]), 7), 2),
                "avg_30": round(sum(price_history[mat][-30:]) / min(len(price_history[mat]), 30), 2),
                "momentum": "rising" if change_pct > 0.5 else ("declining" if change_pct < -0.5 else "stable"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            market_events.append(event)
            await _fan_out({"source": "MarketIntelligenceAgent", "topic": f"sam/procurement/market/raw-material/{mat}", **event})

        await asyncio.sleep(random.uniform(3.0, 4.5))


# ── Background: news feed ───────────────────────────────────────

async def _background_news_feed():
    global news_cycle_index
    logger.info("Background news feed started")
    await asyncio.sleep(5)
    while True:
        item = NEWS_ITEMS[news_cycle_index % len(NEWS_ITEMS)]
        news_cycle_index += 1

        news_event = {
            "news_id": f"NEWS-{uuid.uuid4().hex[:6].upper()}",
            "headline": item["headline"],
            "category": item["category"],
            "region": item["region"],
            "affected_materials": item["materials"],
            "severity": item["severity"],
            "source": item["source"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        news_items.append(news_event)
        await _fan_out({"source": "RiskWebIntelligenceAgent", "topic": f"sam/procurement/risk/news/{item['region']}", "event_type": "news", **news_event})

        if item["severity"] in ("high", "elevated"):
            for mat in item["materials"]:
                current_risks[mat] = {"severity": item["severity"], "headline": item["headline"], "region": item["region"], "source": item["source"]}

        await asyncio.sleep(random.uniform(8.0, 12.0))


# ── Background: commentary ──────────────────────────────────────

async def _background_commentary():
    logger.info("Background commentary agent started")
    await asyncio.sleep(12)
    materials_list = list(MATERIALS_SIM.keys())
    idx = 0
    while True:
        mat = materials_list[idx % len(materials_list)]
        idx += 1
        price = current_prices[mat]
        hist = price_history[mat]
        recent_change = round((hist[-1] - hist[-5]) / hist[-5] * 100, 1) if len(hist) >= 5 else 0.0
        momentum = "rising" if recent_change > 1 else ("declining" if recent_change < -1 else "stable")
        risk = current_risks.get(mat)
        risk_summary = f"{risk['severity']} — {risk['headline']}" if risk else None

        try:
            comment = await generate_commentary(mat, price, recent_change, momentum, risk_summary)
            if comment:
                evt = {"material": mat, "commentary": comment, "price_at_comment": price, "momentum": momentum, "timestamp": datetime.now(timezone.utc).isoformat()}
                current_commentary[mat] = evt
                await _fan_out({"source": "ProcurementAdvisorAgent", "topic": f"sam/procurement/advice/commentary/{mat}", "event_type": "commentary", **evt})
                logger.info("Commentary for %s: %s", mat, comment[:80])
        except Exception as e:
            logger.error("Commentary failed for %s: %s", mat, e)

        await asyncio.sleep(random.uniform(25.0, 35.0))


# ── Background: multi-agent collaboration ───────────────────────

async def _collaboration_step_callback(thread_id: str, step: dict, thread: dict):
    """Push each agent step as a separate SSE event."""
    await _fan_out({
        "source": step["agent"],
        "topic": f"sam/procurement/collaboration/{thread_id}/step/{step['step']}",
        "event_type": "collaboration_step",
        "thread_id": thread_id,
        "material": thread["material"],
        **step,
    })


async def _background_collaboration():
    logger.info("Background collaboration engine started")
    await asyncio.sleep(20)
    while True:
        # Pick a trigger: recent high-severity news or largest price move
        recent_news = [n for n in list(news_items)[-10:] if n.get("severity") in ("high", "elevated")]
        if recent_news:
            trigger = random.choice(recent_news)
            mat = trigger["affected_materials"][0] if trigger.get("affected_materials") else random.choice(list(MATERIALS_SIM.keys()))
        else:
            # Use largest recent price move as trigger
            mat = max(MATERIALS_SIM.keys(), key=lambda m: abs(
                (price_history[m][-1] - price_history[m][-5]) / price_history[m][-5] * 100
            ) if len(price_history[m]) >= 5 else 0)
            trigger = {
                "event_type": "price_alert",
                "material": mat,
                "headline": f"{MATERIAL_DISPLAY_NAMES.get(mat, mat)} significant price movement detected",
                "price_eur_per_kg": current_prices[mat],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        # Announce collaboration start
        await _fan_out({
            "source": "OrchestrationEngine",
            "topic": f"sam/procurement/collaboration/start",
            "event_type": "collaboration_start",
            "material": mat,
            "trigger_summary": trigger.get("headline", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        try:
            forecasts = load_forecasts().get("materials", {}).get(mat, {})
            contracts = load_contracts()

            thread = await run_collaboration(
                trigger_event=trigger,
                material=mat,
                current_price=current_prices[mat],
                price_history=price_history.get(mat, []),
                risk_context=current_risks.get(mat),
                contracts=contracts,
                forecast=forecasts,
                step_callback=_collaboration_step_callback,
            )
            collaboration_threads.append(thread)

            # Publish completion
            await _fan_out({
                "source": "OrchestrationEngine",
                "topic": f"sam/procurement/collaboration/complete",
                "event_type": "collaboration_complete",
                "thread_id": thread["thread_id"],
                "material": mat,
                "status": thread["status"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Collaboration %s complete for %s", thread["thread_id"], mat)
        except Exception as e:
            logger.error("Collaboration failed for %s: %s", mat, e)

        await asyncio.sleep(random.uniform(40.0, 55.0))


# ── Startup ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    for evt in seed_market_events():
        market_events.append(evt)
        all_events.append({"source": "MarketIntelligenceAgent", "topic": f"sam/procurement/market/signals/{evt['material']}", **evt})
        if evt.get("price_eur_per_kg"):
            current_prices[evt["material"]] = evt["price_eur_per_kg"]
    for evt in seed_risk_events():
        risk_events.append(evt)
        all_events.append({"source": "RiskWebIntelligenceAgent", "topic": f"sam/procurement/risk/{evt['risk_type']}/{evt['region']}", **evt})
        for mat in evt.get("affected_materials", []):
            current_risks[mat] = evt
    for rec in seed_recommendations():
        recommendations.append(rec)
        all_events.append({"source": "ProcurementAdvisorAgent", "topic": "sam/procurement/advice/recommendations", **rec})
        current_recommendations[rec["material"]] = rec

    logger.info("Seeded data loaded — starting background tasks")
    asyncio.create_task(_background_price_ticker())
    asyncio.create_task(_background_news_feed())
    asyncio.create_task(_background_commentary())
    asyncio.create_task(_background_collaboration())


# ── SSE ─────────────────────────────────────────────────────────

async def _sse_generator(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    try:
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event, default=str)}\n\n"
    except asyncio.CancelledError:
        pass


@app.get("/api/events/stream")
async def event_stream(request: Request):
    queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    sse_subscribers.append(queue)
    async def generate():
        try:
            async for chunk in _sse_generator(queue):
                yield chunk
        finally:
            sse_subscribers.remove(queue)
    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


@app.post("/api/events/publish")
async def publish_event(event: EventPublish):
    topic, payload = event.topic, event.payload
    if "/market/" in topic:
        market_events.append(payload)
        mat = payload.get("material")
        if mat and payload.get("price_eur_per_kg"):
            current_prices[mat] = payload["price_eur_per_kg"]
        source = "MarketIntelligenceAgent"
    elif "/risk/" in topic:
        risk_events.append(payload)
        for mat in payload.get("affected_materials", []):
            current_risks[mat] = payload
        source = "RiskWebIntelligenceAgent"
    elif "/advice/" in topic:
        recommendations.append(payload)
        mat = payload.get("material")
        if mat: current_recommendations[mat] = payload
        source = "ProcurementAdvisorAgent"
    else:
        source = "unknown"
    await _fan_out({"source": source, "topic": topic, **payload})
    return {"status": "ok"}


# ── Dashboard ───────────────────────────────────────────────────

@app.get("/api/dashboard/summary")
async def dashboard_summary():
    forecasts = load_forecasts().get("materials", {})
    summaries = []
    for mat_key, display_name in MATERIAL_DISPLAY_NAMES.items():
        forecast = forecasts.get(mat_key, {})
        risk = current_risks.get(mat_key)
        rec = current_recommendations.get(mat_key)
        commentary = current_commentary.get(mat_key)
        hist = price_history.get(mat_key, [])
        recent_change = round((hist[-1] - hist[-5]) / hist[-5] * 100, 2) if len(hist) >= 5 else 0.0
        summaries.append({
            "material": mat_key,
            "display_name": display_name,
            "current_price_eur": current_prices.get(mat_key),
            "price_change_pct": recent_change,
            "price_momentum": "rising" if recent_change > 1 else ("declining" if recent_change < -1 else "stable"),
            "price_history": hist[-50:],
            "risk_severity": risk.get("severity") if risk else "low",
            "risk_headline": risk.get("headline") if risk else None,
            "latest_recommendation": rec.get("action") if rec else None,
            "recommendation_urgency": rec.get("urgency") if rec else None,
            "commentary": commentary.get("commentary") if commentary else None,
            "commentary_timestamp": commentary.get("timestamp") if commentary else None,
            "inventory_coverage_weeks": forecast.get("coverage_weeks_at_forecast"),
            "active_contracts": len([c for c in load_contracts() if c["material"] == mat_key and c["status"] == "active"]),
        })
    return {"materials": summaries, "updated_at": datetime.now(timezone.utc).isoformat()}


# ── Collaboration ───────────────────────────────────────────────

@app.get("/api/collaborations")
async def get_collaborations():
    return {"threads": list(collaboration_threads)}

@app.get("/api/collaborations/latest")
async def get_latest_collaboration():
    if collaboration_threads:
        return {"thread": collaboration_threads[-1]}
    return {"thread": None}


# ── Invoice Fairness Check ──────────────────────────────────────

from fastapi import UploadFile, File, Form
from agents import _chat, GENERAL_MODEL as _GM

invoice_checks: deque = deque(maxlen=50)


class InvoiceCheckRequest(BaseModel):
    material: str
    invoiced_price: float
    supplier: str | None = None
    quantity_kg: float | None = None


@app.post("/api/invoice-check")
async def check_invoice(req: InvoiceCheckRequest):
    """Run multi-agent fairness analysis on an invoiced price."""
    mat = req.material
    # For known materials use live price, for unknown use the invoiced price as baseline
    mat_key = mat.lower().replace(" ", "_").replace("-", "_")
    market_price = current_prices.get(mat_key, INITIAL_PRICES.get(mat_key, req.invoiced_price))
    hist = price_history.get(mat_key, [market_price])
    risk_ctx = current_risks.get(mat_key)
    contracts = load_contracts()
    forecast = load_forecasts().get("materials", {}).get(mat_key, {})

    async def step_cb(thread_id, step, thread):
        await _fan_out({
            "source": step["agent"],
            "topic": f"sam/procurement/invoice-check/{thread_id}/step/{step['step']}",
            "event_type": "invoice_check_step",
            "thread_id": thread_id,
            "material": mat,
            **step,
        })

    thread = await run_invoice_check(
        material=mat,
        invoiced_price=req.invoiced_price,
        supplier=req.supplier,
        quantity_kg=req.quantity_kg,
        current_market_price=market_price,
        price_history=hist,
        risk_context=risk_ctx,
        contracts=contracts,
        forecast=forecast,
        step_callback=step_cb,
    )
    invoice_checks.append(thread)
    return {"thread": thread}


@app.post("/api/invoice-upload")
async def upload_invoice(file: UploadFile = File(...)):
    """Upload a PDF/text invoice. Extract line items via LLM, return structured data."""
    content = await file.read()

    # Try PDF extraction
    text = ""
    if file.filename and file.filename.lower().endswith(".pdf"):
        try:
            import io
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            logger.warning("PDF extraction failed: %s", e)
            text = content.decode("utf-8", errors="replace")
    else:
        text = content.decode("utf-8", errors="replace")

    if not text.strip():
        return {"error": "Could not extract text from file", "items": []}

    # Use LLM to extract invoice line items
    extract_prompt = """Extract all line items from this invoice/document.
For each item, return: material name, unit price (EUR/kg or best conversion), quantity, supplier name.
Return a JSON array:
[{"material": "...", "price_eur_per_kg": <number>, "quantity_kg": <number or null>, "supplier": "..." or null}]
If you cannot determine price per kg, estimate based on the units given.
Return ONLY the JSON array."""

    raw = await _chat(_GM, extract_prompt, f"Invoice text:\n\n{text[:4000]}")
    from agents import _parse_json_from_response
    items = None
    if raw:
        raw = raw.strip()
        # Try parsing as array
        try:
            if raw.startswith("["):
                items = json.loads(raw)
            elif "```" in raw:
                cleaned = raw.split("```json", 1)[-1].split("```")[0].strip() if "```json" in raw else raw.split("```", 1)[1].split("```")[0].strip()
                items = json.loads(cleaned)
        except json.JSONDecodeError:
            start = raw.find("[")
            end = raw.rfind("]")
            if start != -1 and end > start:
                try:
                    items = json.loads(raw[start:end + 1])
                except json.JSONDecodeError:
                    pass

    if items is None:
        items = []

    return {"items": items, "raw_text": text[:2000], "filename": file.filename}


@app.get("/api/invoice-checks")
async def get_invoice_checks():
    return {"checks": list(invoice_checks)}




# ── Other endpoints ─────────────────────────────────────────────

@app.get("/api/news")
async def get_news(limit: int = 30):
    return {"news": list(news_items)[-limit:]}

@app.get("/api/commentary")
async def get_commentary():
    return {"commentary": current_commentary}

@app.get("/api/recommendations")
async def get_recommendations():
    return {"recommendations": list(recommendations)}

@app.get("/api/risks")
async def get_risks():
    return {"risks": list(risk_events)}

@app.get("/api/market")
async def get_market_events():
    return {"events": list(market_events)}

@app.get("/api/events/history")
async def get_event_history(limit: int = 100):
    return {"events": list(all_events)[-limit:], "total": len(all_events)}

@app.get("/api/contracts")
async def get_contracts():
    return {"contracts": load_contracts()}

@app.get("/api/suppliers")
async def get_suppliers():
    return {"suppliers": load_suppliers()}

@app.get("/api/forecasts")
async def get_forecasts():
    return load_forecasts()

@app.get("/api/materials/{material}")
async def material_detail(material: str):
    return {
        "material": material,
        "display_name": MATERIAL_DISPLAY_NAMES.get(material, material),
        "current_price_eur": current_prices.get(material),
        "price_history": price_history.get(material, [])[-100:],
        "recent_market_events": [e for e in market_events if e.get("material") == material][-20:],
        "recent_risk_events": [e for e in risk_events if material in e.get("affected_materials", [])][-10:],
        "recommendation": current_recommendations.get(material),
        "commentary": current_commentary.get(material),
        "contracts": [c for c in load_contracts() if c["material"] == material],
        "suppliers": [s for s in load_suppliers() if material in s["materials"]],
        "forecast": load_forecasts().get("materials", {}).get(material, {}),
    }

@app.post("/api/actions")
async def create_buyer_action(action: BuyerAction):
    rec = action.model_dump()
    rec["action_id"] = f"ACT-{uuid.uuid4().hex[:8].upper()}"
    rec["created_at"] = datetime.now(timezone.utc).isoformat()
    buyer_actions.append(rec)
    await _fan_out({"source": "BuyerUI", "topic": f"sam/procurement/actions/{action.action_type}", **rec})
    return {"status": "ok", "action": rec}

@app.get("/api/actions")
async def get_buyer_actions():
    return {"actions": buyer_actions}

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "agents": {"market_intelligence": "active (GPT-4o)", "risk_web_intelligence": "active (Gemini 2.5 Flash)", "procurement_advisor": "active (GPT-4o)"},
        "event_counts": {"market": len(market_events), "risk": len(risk_events), "news": len(news_items), "recommendations": len(recommendations), "commentary": len(current_commentary), "collaborations": len(collaboration_threads), "total": len(all_events)},
        "sse_subscribers": len(sse_subscribers),
    }


# ── Static file serving (for Docker deployment) ────────────────

_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(_static_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_static_dir, "index.html"))
