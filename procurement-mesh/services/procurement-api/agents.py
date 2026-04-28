"""
LLM-backed agent logic.

Each function calls the LiteLLM proxy (OpenAI-compatible) to simulate
agent processing. In production, Solace Agent Mesh handles this natively.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

import httpx

logger = logging.getLogger("agents")

LITELLM_BASE_URL = os.getenv("LITELLM_BASE_URL", "https://lite-llm.mymaas.net/v1")
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", os.getenv("OPENAI_API_KEY", ""))
GENERAL_MODEL = os.getenv("LITELLM_GENERAL_MODEL", "azure-gpt-4o")
GEMINI_MODEL = os.getenv("LITELLM_GEMINI_MODEL", "gemini-2.5-flash")

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=60.0)
    return _client


async def _chat(model: str, system: str, user: str) -> str:
    client = _get_client()
    try:
        resp = await client.post(
            f"{LITELLM_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.3,
                "max_tokens": 4096,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error("LLM call failed (model=%s): %s", model, e)
        return ""


def _parse_json_from_response(text: str) -> dict | None:
    if not text:
        return None
    original = text.strip()
    # Strategy 1: strip markdown fences then parse
    cleaned = original
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1]
    if "```" in cleaned:
        cleaned = cleaned.split("```")[0]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Strategy 2: find the outermost { ... } in the original text
    start = original.find("{")
    if start != -1:
        depth = 0
        end = -1
        for i in range(start, len(original)):
            if original[i] == "{":
                depth += 1
            elif original[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end > start:
            try:
                return json.loads(original[start:end + 1])
            except json.JSONDecodeError:
                pass
    return None


# ── English buying signal commentary ─────────────────────────────

COMMENTARY_SYSTEM = """You are a senior procurement advisor for NaturaCo.
You analyze market signals and supply-chain risks for natural raw materials.

Give a concise, actionable buying signal in 1-2 sentences for the purchasing team.
Include current price, trend direction, and a clear recommendation (buy, hold, hedge, etc.).
Be direct and professional — this appears on a real-time dashboard.

Material names: argan_oil = Argan Oil, shea_butter = Shea Butter, rose_extract = Rose Extract,
jojoba_oil = Jojoba Oil, vanilla = Vanilla, palmarosa_oil = Palmarosa Oil.

Reply with plain text only (no JSON, no markdown)."""


async def generate_commentary(material: str, price: float, change_pct: float,
                               momentum: str, risk_summary: str | None = None) -> str:
    user_msg = (
        f"Material: {material}\n"
        f"Current price: {price:.2f} EUR/kg\n"
        f"Recent change: {change_pct:+.1f}%\n"
        f"Trend: {momentum}\n"
    )
    if risk_summary:
        user_msg += f"Risk context: {risk_summary}\n"
    user_msg += "\nGive your buying signal for the team."
    result = await _chat(GENERAL_MODEL, COMMENTARY_SYSTEM, user_msg)
    return result.strip() if result else ""


# ── Multi-agent collaboration analysis ───────────────────────────
#
# Three agents collaborate sequentially on a triggering event.
# Each publishes its step as a separate SSE event so the UI can
# render them appearing one by one.

MARKET_COLLAB_SYSTEM = """You are the Market Intelligence Agent for NaturaCo procurement.
Model: GPT-4o via Azure / Solace Agent Mesh

Given a triggering event (news, price alert, or contract event), analyze:
1. FAIR PRICE: What is a fair price for this material right now? Reference 7-day avg, 30-day avg, and current spot.
2. PRICE TREND: Rising/stable/declining? Short-term momentum?
3. FX IMPACT: Any relevant currency effect on EUR-equivalent cost?
4. VOLATILITY: Is the market unusually volatile?

Return JSON:
{
  "fair_price_eur": <number>,
  "current_vs_fair": "above" | "at" | "below",
  "premium_pct": <number, positive = above fair>,
  "trend": "rising" | "stable" | "declining",
  "momentum_strength": "strong" | "moderate" | "weak",
  "volatility": "low" | "normal" | "high" | "extreme",
  "fx_note": "<brief FX impact note>",
  "analysis": "<2-3 sentence market analysis>"
}
Return ONLY the JSON object."""


RISK_COLLAB_SYSTEM = """You are the Risk & Web Intelligence Agent for NaturaCo procurement.
Model: Gemini 2.5 Flash / Solace Agent Mesh

Given a triggering event and the Market Intelligence Agent's analysis, assess:
1. SUPPLY CHAIN RISK: What is the risk to material supply? Score 1-10.
2. SUPPLY DISRUPTION: Estimated % of supply that could be affected.
3. LEAD TIME IMPACT: How many extra days/weeks might deliveries take?
4. SOURCING REGIONS: Which regions are affected and how?
5. ALTERNATIVE SOURCES: Are there viable alternatives?

Return JSON:
{
  "risk_score": <1-10>,
  "risk_level": "low" | "moderate" | "elevated" | "high" | "critical",
  "supply_disruption_pct": <0-100>,
  "lead_time_impact_days": <number>,
  "affected_regions": ["<region>"],
  "alternative_sources": "<brief note on alternatives>",
  "key_risk_factors": ["<factor1>", "<factor2>"],
  "analysis": "<2-3 sentence risk assessment>"
}
Return ONLY the JSON object."""


ADVISOR_COLLAB_SYSTEM = """You are the Procurement Advisor Agent for NaturaCo.
Model: GPT-4o via Azure / Solace Agent Mesh

Given a triggering event, the Market Intelligence analysis, and the Risk assessment, determine:
1. RECOMMENDATION: buy_now | buy_partial | hold | hedge | diversify | escalate
2. QUANTITY: Suggested % of quarterly forecast to secure now
3. MARKET POTENTIAL: Can the market fulfill NaturaCo's order requirements? Score 1-10.
4. FULFILLMENT RISK: What % of the order could face delays or shortfall?
5. TIMING: Best timing window for action
6. RATIONALE: Clear explanation for the purchasing team

Return JSON:
{
  "action": "buy_now" | "buy_partial" | "hold" | "hedge" | "diversify" | "escalate",
  "urgency": "low" | "medium" | "high" | "critical",
  "suggested_pct_of_forecast": <0-100>,
  "target_price_eur": <number or null>,
  "market_fulfillment_score": <1-10>,
  "fulfillment_risk_pct": <0-100>,
  "timing_window": "<e.g. next 5 days>",
  "rationale": "<3-4 sentence recommendation explaining why>"
}
Return ONLY the JSON object."""


async def run_collaboration(trigger_event: dict, material: str,
                             current_price: float, price_history: list,
                             risk_context: dict | None,
                             contracts: list, forecast: dict,
                             step_callback=None) -> dict:
    """
    Run a full 3-agent collaboration on a triggering event.
    step_callback(step_dict) is called after each agent completes,
    so the UI can show steps appearing one by one.
    """
    thread_id = f"COLLAB-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    hist = price_history[-30:] if price_history else []
    avg_7 = round(sum(hist[-7:]) / max(len(hist[-7:]), 1), 2) if hist else current_price
    avg_30 = round(sum(hist) / max(len(hist), 1), 2) if hist else current_price

    trigger_summary = trigger_event.get("headline") or trigger_event.get("summary") or trigger_event.get("event_type", "event")

    context_block = (
        f"Material: {material}\n"
        f"Current price: {current_price:.2f} EUR/kg\n"
        f"7-day avg: {avg_7:.2f} EUR/kg\n"
        f"30-day avg: {avg_30:.2f} EUR/kg\n"
        f"Triggering event: {json.dumps(trigger_event, default=str)}\n"
    )

    thread = {
        "thread_id": thread_id,
        "material": material,
        "trigger": trigger_event,
        "trigger_summary": trigger_summary,
        "started_at": now.isoformat(),
        "steps": [],
        "status": "running",
    }

    # ── Step 1: Market Intelligence Agent (GPT-4o) ──────────────
    step1_start = datetime.now(timezone.utc)
    raw1 = await _chat(GENERAL_MODEL, MARKET_COLLAB_SYSTEM, f"Analyze this event:\n\n{context_block}")
    market_analysis = _parse_json_from_response(raw1) or {"analysis": raw1[:300]}
    step1 = {
        "step": 1,
        "agent": "Market Intelligence Agent",
        "model": GENERAL_MODEL,
        "model_provider": "Azure OpenAI (via LiteLLM)",
        "started_at": step1_start.isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "output": market_analysis,
    }
    thread["steps"].append(step1)
    if step_callback:
        await step_callback(thread_id, step1, thread)

    # ── Step 2: Risk & Web Intelligence Agent (Gemini) ──────────
    step2_start = datetime.now(timezone.utc)
    risk_context_str = json.dumps(risk_context, default=str) if risk_context else "No specific risk context available."
    raw2 = await _chat(
        GEMINI_MODEL, RISK_COLLAB_SYSTEM,
        f"Assess risk for this event:\n\n{context_block}\n\n"
        f"Market Intelligence analysis:\n{json.dumps(market_analysis, default=str)}\n\n"
        f"Current risk context: {risk_context_str}"
    )
    risk_analysis = _parse_json_from_response(raw2) or {"analysis": raw2[:300]}
    step2 = {
        "step": 2,
        "agent": "Risk & Web Intelligence Agent",
        "model": GEMINI_MODEL,
        "model_provider": "Google Gemini (via LiteLLM)",
        "started_at": step2_start.isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "output": risk_analysis,
    }
    thread["steps"].append(step2)
    if step_callback:
        await step_callback(thread_id, step2, thread)

    # ── Step 3: Procurement Advisor Agent (GPT-4o) ──────────────
    step3_start = datetime.now(timezone.utc)
    active_contracts = [c for c in contracts if c.get("material") == material and c.get("status") == "active"]
    raw3 = await _chat(
        GENERAL_MODEL, ADVISOR_COLLAB_SYSTEM,
        f"Generate final recommendation:\n\n{context_block}\n\n"
        f"Market analysis:\n{json.dumps(market_analysis, default=str)}\n\n"
        f"Risk assessment:\n{json.dumps(risk_analysis, default=str)}\n\n"
        f"Active contracts:\n{json.dumps(active_contracts, default=str)}\n\n"
        f"Demand forecast:\n{json.dumps(forecast, default=str)}"
    )
    advisor_output = _parse_json_from_response(raw3) or {"rationale": raw3[:300]}
    step3 = {
        "step": 3,
        "agent": "Procurement Advisor Agent",
        "model": GENERAL_MODEL,
        "model_provider": "Azure OpenAI (via LiteLLM)",
        "started_at": step3_start.isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "output": advisor_output,
    }
    thread["steps"].append(step3)
    if step_callback:
        await step_callback(thread_id, step3, thread)

    thread["status"] = "complete"
    thread["completed_at"] = datetime.now(timezone.utc).isoformat()
    return thread


# ── Invoice / Price Fairness Check ───────────────────────────────
#
# Three agents collaborate to assess whether an invoiced price is fair.

INVOICE_MARKET_SYSTEM = """You are the Market Intelligence Agent for NaturaCo procurement.
Model: GPT-4o via Azure / Solace Agent Mesh

A buyer has received an invoice or price quote. Your job: determine the FAIR MARKET PRICE
for this material right now and compare it to the invoiced price.

Consider:
- Current spot market price
- 7-day and 30-day moving averages
- Seasonal patterns (e.g., rose extract is expensive during harvest)
- Currency effects if the supplier trades in local currency
- Quality tiers (organic, fair trade, conventional)

Return JSON:
{
  "fair_price_eur": <number — your best estimate of fair market price>,
  "invoiced_price_eur": <number — the price being checked>,
  "price_gap_pct": <number — (invoiced - fair) / fair * 100>,
  "price_verdict": "fair" | "slightly_high" | "overpriced" | "significantly_overpriced" | "below_market" | "good_deal",
  "spot_price_eur": <number — current spot price>,
  "avg_30d_eur": <number — 30-day average>,
  "seasonal_factor": "peak" | "normal" | "off_peak",
  "quality_premium_pct": <number — justified premium for quality/certs>,
  "analysis": "<3-4 sentences explaining the fair price determination>"
}
Return ONLY the JSON object."""


INVOICE_RISK_SYSTEM = """You are the Risk & Web Intelligence Agent for NaturaCo procurement.
Model: Gemini 2.5 Flash / Solace Agent Mesh

A buyer is checking whether a supplier price is fair. Given the market analysis,
assess what RISK FACTORS might justify a premium (or suggest the price should be lower).

Consider:
- Current supply chain disruptions in the sourcing region
- Weather events affecting yields
- Logistics bottlenecks or freight surcharges
- Geopolitical instability
- Currency instability
- Whether the supplier has pricing power (monopoly position, certification scarcity)

Return JSON:
{
  "risk_adjusted_fair_price_eur": <number — fair price adjusted for current risks>,
  "justifiable_premium_pct": <number — how much premium above base fair price is justified by risk>,
  "risk_factors_supporting_premium": ["<factor that justifies higher price>"],
  "risk_factors_against_premium": ["<factor suggesting price should be lower>"],
  "supplier_leverage": "low" | "moderate" | "high",
  "supply_scarcity": "abundant" | "normal" | "tight" | "scarce",
  "analysis": "<3-4 sentences on whether the premium is justified by risk conditions>"
}
Return ONLY the JSON object."""


INVOICE_ADVISOR_SYSTEM = """You are the Procurement Advisor Agent for NaturaCo.
Model: GPT-4o via Azure / Solace Agent Mesh

A buyer is reviewing a price from a supplier. Given the market fair price analysis and
the risk-adjusted assessment, give a FINAL VERDICT and negotiation guidance.

Return JSON:
{
  "verdict": "ACCEPT" | "NEGOTIATE" | "REJECT" | "GREAT_DEAL",
  "verdict_confidence": <0.0-1.0>,
  "fairness_score": <1-100 — 100 = perfectly fair, below 50 = overpriced>,
  "suggested_counter_price_eur": <number or null — what to counter-offer if negotiating>,
  "max_acceptable_price_eur": <number — highest price that is still reasonable>,
  "savings_potential_eur_per_kg": <number — gap between invoiced and suggested counter>,
  "negotiation_points": ["<argument the buyer can use to negotiate>"],
  "timing_advice": "<should they accept now or wait?>",
  "rationale": "<4-5 sentence verdict explaining the full picture: market price, risk context, supplier position, and recommended action>"
}
Return ONLY the JSON object."""


async def run_invoice_check(material: str, invoiced_price: float, supplier: str | None,
                             quantity_kg: float | None,
                             current_market_price: float, price_history: list,
                             risk_context: dict | None, contracts: list, forecast: dict,
                             step_callback=None) -> dict:
    """Run 3-agent invoice fairness check."""
    thread_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    hist = price_history[-30:] if price_history else []
    avg_7 = round(sum(hist[-7:]) / max(len(hist[-7:]), 1), 2) if hist else current_market_price
    avg_30 = round(sum(hist) / max(len(hist), 1), 2) if hist else current_market_price

    invoice_context = (
        f"Material: {material}\n"
        f"Invoiced price: {invoiced_price:.2f} EUR/kg\n"
        f"Supplier: {supplier or 'not specified'}\n"
        f"Quantity: {f'{quantity_kg:.0f} kg' if quantity_kg else 'not specified'}\n"
        f"Current market spot: {current_market_price:.2f} EUR/kg\n"
        f"7-day average: {avg_7:.2f} EUR/kg\n"
        f"30-day average: {avg_30:.2f} EUR/kg\n"
    )

    thread = {
        "thread_id": thread_id,
        "type": "invoice_check",
        "material": material,
        "invoiced_price": invoiced_price,
        "supplier": supplier,
        "quantity_kg": quantity_kg,
        "started_at": now.isoformat(),
        "steps": [],
        "status": "running",
    }

    # Step 1: Market fair price (GPT-4o)
    s1_start = datetime.now(timezone.utc)
    raw1 = await _chat(GENERAL_MODEL, INVOICE_MARKET_SYSTEM, f"Check this invoice:\n\n{invoice_context}")
    market_out = _parse_json_from_response(raw1) or {"analysis": raw1[:400]}
    step1 = {
        "step": 1, "agent": "Market Intelligence Agent",
        "model": GENERAL_MODEL, "model_provider": "Azure OpenAI (via LiteLLM)",
        "started_at": s1_start.isoformat(), "completed_at": datetime.now(timezone.utc).isoformat(),
        "output": market_out,
    }
    thread["steps"].append(step1)
    if step_callback:
        await step_callback(thread_id, step1, thread)

    # Step 2: Risk-adjusted assessment (Gemini)
    s2_start = datetime.now(timezone.utc)
    risk_str = json.dumps(risk_context, default=str) if risk_context else "No active risk alerts."
    raw2 = await _chat(
        GEMINI_MODEL, INVOICE_RISK_SYSTEM,
        f"Assess risk context for this invoice:\n\n{invoice_context}\n\n"
        f"Market analysis:\n{json.dumps(market_out, default=str)}\n\n"
        f"Current risk context: {risk_str}"
    )
    risk_out = _parse_json_from_response(raw2) or {"analysis": raw2[:400]}
    step2 = {
        "step": 2, "agent": "Risk & Web Intelligence Agent",
        "model": GEMINI_MODEL, "model_provider": "Google Gemini (via LiteLLM)",
        "started_at": s2_start.isoformat(), "completed_at": datetime.now(timezone.utc).isoformat(),
        "output": risk_out,
    }
    thread["steps"].append(step2)
    if step_callback:
        await step_callback(thread_id, step2, thread)

    # Step 3: Final verdict + negotiation guidance (GPT-4o)
    s3_start = datetime.now(timezone.utc)
    active_contracts = [c for c in contracts if c.get("material") == material and c.get("status") == "active"]
    raw3 = await _chat(
        GENERAL_MODEL, INVOICE_ADVISOR_SYSTEM,
        f"Give final verdict on this invoice:\n\n{invoice_context}\n\n"
        f"Market analysis:\n{json.dumps(market_out, default=str)}\n\n"
        f"Risk assessment:\n{json.dumps(risk_out, default=str)}\n\n"
        f"Active contracts:\n{json.dumps(active_contracts, default=str)}\n\n"
        f"Demand forecast:\n{json.dumps(forecast, default=str)}"
    )
    advisor_out = _parse_json_from_response(raw3) or {"rationale": raw3[:400]}
    step3 = {
        "step": 3, "agent": "Procurement Advisor Agent",
        "model": GENERAL_MODEL, "model_provider": "Azure OpenAI (via LiteLLM)",
        "started_at": s3_start.isoformat(), "completed_at": datetime.now(timezone.utc).isoformat(),
        "output": advisor_out,
    }
    thread["steps"].append(step3)
    if step_callback:
        await step_callback(thread_id, step3, thread)

    thread["status"] = "complete"
    thread["completed_at"] = datetime.now(timezone.utc).isoformat()
    return thread
