const URGENCY_STYLES = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-900 ring-1 ring-red-400",
};

export default function UrgencyBadge({ urgency }) {
  if (!urgency) return null;
  const cls = URGENCY_STYLES[urgency] || "bg-gray-100 text-gray-700";
  return <span className={`badge ${cls}`}>{urgency}</span>;
}
