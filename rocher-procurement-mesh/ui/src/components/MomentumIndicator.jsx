import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function MomentumIndicator({ momentum, changePct }) {
  if (momentum === "rising") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
        <TrendingUp className="w-4 h-4" />
        {changePct != null ? `+${changePct}%` : "Rising"}
      </span>
    );
  }
  if (momentum === "declining") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
        <TrendingDown className="w-4 h-4" />
        {changePct != null ? `${changePct}%` : "Declining"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-gray-500 text-sm font-medium">
      <Minus className="w-4 h-4" />
      Stable
    </span>
  );
}
