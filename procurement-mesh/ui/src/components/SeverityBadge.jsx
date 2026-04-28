const SEVERITY_STYLES = {
  low: "badge-low",
  moderate: "badge-moderate",
  elevated: "badge-elevated",
  high: "badge-high",
  critical: "badge-critical",
};

export default function SeverityBadge({ severity }) {
  if (!severity) return null;
  const cls = SEVERITY_STYLES[severity] || "badge-low";
  return <span className={`badge ${cls}`}>{severity}</span>;
}
