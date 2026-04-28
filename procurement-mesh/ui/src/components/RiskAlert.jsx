import SeverityBadge from "./SeverityBadge";
import { AlertTriangle, ExternalLink } from "lucide-react";

export default function RiskAlert({ risk, compact = false }) {
  if (!risk) return null;

  return (
    <div
      className={`card border-l-4 ${
        risk.severity === "critical"
          ? "border-l-red-500"
          : risk.severity === "high"
          ? "border-l-red-400"
          : risk.severity === "elevated"
          ? "border-l-orange-400"
          : risk.severity === "moderate"
          ? "border-l-yellow-400"
          : "border-l-green-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <SeverityBadge severity={risk.severity} />
            <span className="badge bg-gray-100 text-gray-600">
              {risk.risk_type}
            </span>
            <span className="text-xs text-gray-400">{risk.region}</span>
          </div>

          <p className="text-sm font-medium text-gray-900">{risk.headline}</p>

          {!compact && (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                {risk.narrative}
              </p>

              <div className="flex flex-wrap gap-1">
                {risk.affected_materials?.map((m) => (
                  <span
                    key={m}
                    className="badge bg-gray-100 text-gray-600"
                  >
                    {m.replace(/_/g, " ")}
                  </span>
                ))}
              </div>

              {risk.sources && (
                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {risk.sources.map((s, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      <ExternalLink className="w-3 h-3" />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-right text-xs text-gray-400 whitespace-nowrap">
          <p>{risk.time_horizon}</p>
          <p>{(risk.confidence * 100).toFixed(0)}% conf.</p>
        </div>
      </div>
    </div>
  );
}
