const ACTION_STYLES = {
  buy_now: "bg-green-100 text-green-800",
  buy_partial: "bg-emerald-100 text-emerald-800",
  hold: "bg-blue-100 text-blue-800",
  hedge: "bg-purple-100 text-purple-800",
  renegotiate: "bg-amber-100 text-amber-800",
  escalate: "bg-orange-100 text-orange-800",
  diversify: "bg-indigo-100 text-indigo-800",
};

const ACTION_LABELS = {
  buy_now: "Buy Now",
  buy_partial: "Buy Partial",
  hold: "Hold",
  hedge: "Hedge",
  renegotiate: "Renegotiate",
  escalate: "Escalate",
  diversify: "Diversify",
};

export default function ActionBadge({ action }) {
  if (!action) return null;
  const cls = ACTION_STYLES[action] || "bg-gray-100 text-gray-700";
  const label = ACTION_LABELS[action] || action;
  return <span className={`badge ${cls}`}>{label}</span>;
}
