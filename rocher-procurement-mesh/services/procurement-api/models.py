"""Pydantic models for the Procurement API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Material(str, Enum):
    ARGAN_OIL = "argan_oil"
    SHEA_BUTTER = "shea_butter"
    ROSE_EXTRACT = "rose_extract"
    JOJOBA_OIL = "jojoba_oil"
    VANILLA = "vanilla"
    PALMAROSA_OIL = "palmarosa_oil"


class SignalType(str, Enum):
    PRICE_UPDATE = "price_update"
    PRICE_SHOCK = "price_shock"
    BUY_WINDOW = "buy_window"
    TREND_CHANGE = "trend_change"
    FX_UPDATE = "fx_update"


class RiskSeverity(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    ELEVATED = "elevated"
    HIGH = "high"
    CRITICAL = "critical"


class RecommendedAction(str, Enum):
    BUY_NOW = "buy_now"
    BUY_PARTIAL = "buy_partial"
    HOLD = "hold"
    HEDGE = "hedge"
    RENEGOTIATE = "renegotiate"
    ESCALATE = "escalate"
    DIVERSIFY = "diversify"


class Urgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# --- Event models ---

class EventPublish(BaseModel):
    topic: str
    payload: dict


class MarketEvent(BaseModel):
    event_type: SignalType
    material: str
    price_eur_per_kg: Optional[float] = None
    previous_price_eur: Optional[float] = None
    change_pct: Optional[float] = None
    avg_7_tick: Optional[float] = None
    avg_30_tick: Optional[float] = None
    momentum: Optional[str] = None
    fx_impact: Optional[str] = None
    confidence: Optional[float] = None
    summary: Optional[str] = None
    timestamp: str


class RiskEvent(BaseModel):
    risk_id: str
    risk_type: str
    region: str
    affected_materials: list[str]
    severity: RiskSeverity
    confidence: float
    headline: str
    narrative: str
    sources: list[str]
    recommended_action: str
    time_horizon: str
    updated_at: str


class Recommendation(BaseModel):
    recommendation_id: str
    material: str
    action: RecommendedAction
    urgency: Urgency
    suggested_quantity_kg: Optional[float] = None
    suggested_quantity_pct_of_forecast: Optional[float] = None
    price_target_eur: Optional[float] = None
    timing_window: str
    confidence: float
    rationale: str
    signals_used: list[dict]
    risk_factors: list[str]
    contract_context: Optional[str] = None
    inventory_context: Optional[str] = None
    created_at: str


class MaterialSummary(BaseModel):
    material: str
    display_name: str
    current_price_eur: Optional[float] = None
    price_change_7d_pct: Optional[float] = None
    price_momentum: Optional[str] = None
    risk_severity: Optional[str] = None
    risk_headline: Optional[str] = None
    latest_recommendation: Optional[str] = None
    recommendation_urgency: Optional[str] = None
    inventory_coverage_weeks: Optional[float] = None
    active_contracts: int = 0


class BuyerAction(BaseModel):
    action_type: str  # create_purchase_request | schedule_review | flag_manager | export_summary
    material: str
    details: Optional[dict] = None
    created_by: str = "demo_buyer"
    created_at: Optional[str] = None
