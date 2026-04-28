import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { getMaterialDetail, createBuyerAction } from "../lib/api";
import RecommendationCard from "../components/RecommendationCard";
import RiskAlert from "../components/RiskAlert";
import SeverityBadge from "../components/SeverityBadge";
import MomentumIndicator from "../components/MomentumIndicator";

const DISPLAY_NAMES = {
  argan_oil: "Argan Oil",
  shea_butter: "Shea Butter",
  rose_extract: "Rose Extract",
  jojoba_oil: "Jojoba Oil",
  vanilla: "Vanilla",
  palmarosa_oil: "Palmarosa Oil",
};

export default function MaterialDetail() {
  const { materialId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState(null);

  useEffect(() => {
    setLoading(true);
    getMaterialDetail(materialId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [materialId]);

  async function handleAction(actionType) {
    try {
      await createBuyerAction({
        action_type: actionType,
        material: materialId,
        details: { triggered_from: "material_detail" },
      });
      setActionStatus(`${actionType} created successfully`);
      setTimeout(() => setActionStatus(null), 3000);
    } catch (err) {
      setActionStatus("Action failed");
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">Material not found</div>
    );
  }

  const displayName = DISPLAY_NAMES[materialId] || materialId;
  const priceHistory = data.price_history || [];
  const lastPrice = priceHistory[priceHistory.length - 1];
  const firstPrice = priceHistory[0];
  const priceChange =
    firstPrice && lastPrice
      ? (
          ((lastPrice.price - firstPrice.price) / firstPrice.price) *
          100
        ).toFixed(2)
      : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Material detail — contracts, risk, and AI recommendation
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">
            EUR {data.current_price_eur?.toFixed(2)}
            <span className="text-sm font-normal text-gray-400">/kg</span>
          </p>
          {priceChange && (
            <MomentumIndicator
              momentum={parseFloat(priceChange) > 0 ? "rising" : parseFloat(priceChange) < 0 ? "declining" : "stable"}
              changePct={priceChange}
            />
          )}
        </div>
      </div>

      {/* Price mini-chart (text-based) */}
      {priceHistory.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Recent Price Ticks
          </h3>
          <div className="flex items-end gap-1 h-24">
            {priceHistory.slice(-40).map((p, i) => {
              const min = Math.min(...priceHistory.slice(-40).map((x) => x.price));
              const max = Math.max(...priceHistory.slice(-40).map((x) => x.price));
              const range = max - min || 1;
              const height = ((p.price - min) / range) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-brand-400 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`EUR ${p.price?.toFixed(2)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Older</span>
            <span>Recent</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Recommendation + Risks */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Recommendation */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              AI Recommendation
            </h3>
            {data.recommendation ? (
              <RecommendationCard rec={data.recommendation} />
            ) : (
              <p className="text-sm text-gray-400 card">
                No recommendation available yet.
              </p>
            )}
          </section>

          {/* Risk Events */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Risk Events
            </h3>
            <div className="space-y-3">
              {data.recent_risk_events?.map((risk) => (
                <RiskAlert key={risk.risk_id} risk={risk} />
              ))}
              {(!data.recent_risk_events ||
                data.recent_risk_events.length === 0) && (
                <p className="text-sm text-gray-400 card">
                  No risk events for this material.
                </p>
              )}
            </div>
          </section>

          {/* Market Events */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recent Market Events
            </h3>
            <div className="card max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Change</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_market_events
                    ?.slice()
                    .reverse()
                    .map((evt, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5">
                          <span className="badge bg-blue-50 text-blue-700">
                            {evt.event_type}
                          </span>
                        </td>
                        <td className="py-1.5 font-medium">
                          {evt.price_eur_per_kg
                            ? `EUR ${evt.price_eur_per_kg.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="py-1.5">
                          <span
                            className={
                              evt.change_pct > 0
                                ? "text-red-600"
                                : evt.change_pct < 0
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            {evt.change_pct > 0 ? "+" : ""}
                            {evt.change_pct?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-1.5 text-gray-400 text-xs">
                          {evt.timestamp
                            ? new Date(evt.timestamp).toLocaleTimeString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {(!data.recent_market_events ||
                data.recent_market_events.length === 0) && (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No market events yet.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right column: Context + Actions */}
        <div className="space-y-6">
          {/* Buyer Actions */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Buyer Actions
            </h3>
            <div className="card space-y-2">
              <button
                onClick={() => handleAction("create_purchase_request")}
                className="btn-primary w-full justify-center"
              >
                <Package className="w-4 h-4" />
                Create Purchase Request
              </button>
              <button
                onClick={() => handleAction("schedule_review")}
                className="btn-secondary w-full justify-center"
              >
                <Users className="w-4 h-4" />
                Schedule Supplier Review
              </button>
              <button
                onClick={() => handleAction("flag_manager")}
                className="btn-secondary w-full justify-center"
              >
                Flag for Commodity Manager
              </button>
              <button
                onClick={() => handleAction("export_summary")}
                className="btn-secondary w-full justify-center"
              >
                <FileText className="w-4 h-4" />
                Export Summary
              </button>
              {actionStatus && (
                <p className="text-xs text-center text-brand-700 font-medium">
                  {actionStatus}
                </p>
              )}
            </div>
          </section>

          {/* Forecast */}
          {data.forecast && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                2025 Forecast
              </h3>
              <div className="card text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Annual forecast</span>
                  <span className="font-medium">
                    {data.forecast.annual_forecast_kg?.toLocaleString()} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Growth vs 2024</span>
                  <span className="font-medium">
                    {data.forecast.growth_vs_2024}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current inventory</span>
                  <span className="font-medium">
                    {data.forecast.current_inventory_kg?.toLocaleString()} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coverage</span>
                  <span className="font-medium">
                    {data.forecast.coverage_weeks_at_forecast?.toFixed(1)} weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Safety stock</span>
                  <span className="font-medium">
                    {data.forecast.safety_stock_weeks} weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reorder point</span>
                  <span className="font-medium">
                    {data.forecast.reorder_point_kg?.toLocaleString()} kg
                  </span>
                </div>
                {data.forecast.driver && (
                  <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
                    {data.forecast.driver}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Active Contracts */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Contracts
            </h3>
            <div className="space-y-2">
              {data.contracts?.map((c) => (
                <div key={c.contract_id} className="card text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{c.contract_id}</span>
                    <span
                      className={`badge ${
                        c.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-gray-600">{c.supplier}</p>
                  <p className="text-gray-500 text-xs">
                    {c.volume_kg?.toLocaleString()} kg @ EUR{" "}
                    {c.price_eur_per_kg?.toFixed(2)}/kg
                  </p>
                  <p className="text-gray-400 text-xs">
                    {c.contract_start} → {c.contract_end}
                  </p>
                </div>
              ))}
              {(!data.contracts || data.contracts.length === 0) && (
                <p className="text-sm text-gray-400 card">No contracts.</p>
              )}
            </div>
          </section>

          {/* Suppliers */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Suppliers
            </h3>
            <div className="space-y-2">
              {data.suppliers?.map((s) => (
                <div key={s.supplier_id} className="card text-sm">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-gray-500 text-xs">
                    {s.country} — {s.region}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      Lead: {s.lead_time_days}d
                    </span>
                    <span className="text-xs text-gray-400">
                      Reliability: {s.reliability_score}/5
                    </span>
                    <SeverityBadge severity={s.risk_profile} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
