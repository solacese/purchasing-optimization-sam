import ActionBadge from "./ActionBadge";
import UrgencyBadge from "./UrgencyBadge";
import { Clock, BarChart3, Shield } from "lucide-react";

export default function RecommendationCard({ rec, compact = false }) {
  if (!rec) return null;

  const timeAgo = rec.created_at
    ? formatTimeAgo(rec.created_at)
    : "";

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActionBadge action={rec.action} />
          <UrgencyBadge urgency={rec.urgency} />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
      </div>

      {rec.suggested_quantity_kg && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            <strong>{rec.suggested_quantity_kg.toLocaleString()} kg</strong>
            {rec.suggested_quantity_pct_of_forecast &&
              ` (${rec.suggested_quantity_pct_of_forecast}% of forecast)`}
          </span>
          {rec.price_target_eur && (
            <span className="text-gray-600">
              Target: <strong>EUR {rec.price_target_eur.toFixed(2)}/kg</strong>
            </span>
          )}
        </div>
      )}

      {rec.timing_window && (
        <p className="text-xs text-gray-500">
          Timing: {rec.timing_window}
        </p>
      )}

      <p className="text-sm text-gray-700 leading-relaxed">{rec.rationale}</p>

      {!compact && (
        <>
          {rec.signals_used && rec.signals_used.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Signals used
              </p>
              {rec.signals_used.map((s, i) => (
                <p key={i} className="text-xs text-gray-600 pl-4">
                  <span className="font-medium">{s.source}:</span> {s.summary}
                </p>
              ))}
            </div>
          )}

          {rec.risk_factors && rec.risk_factors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Risk factors
              </p>
              {rec.risk_factors.map((r, i) => (
                <p key={i} className="text-xs text-gray-600 pl-4">
                  {r}
                </p>
              ))}
            </div>
          )}

          {(rec.contract_context || rec.inventory_context) && (
            <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
              {rec.contract_context && <p>{rec.contract_context}</p>}
              {rec.inventory_context && <p>{rec.inventory_context}</p>}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
        <span>Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
        <span>{rec.recommendation_id}</span>
      </div>
    </div>
  );
}

function formatTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
