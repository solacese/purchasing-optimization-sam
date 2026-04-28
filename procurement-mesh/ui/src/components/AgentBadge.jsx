const AGENT_STYLES = {
  MarketIntelligenceAgent: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    label: "Market Intel",
  },
  RiskWebIntelligenceAgent: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    label: "Risk Intel (Gemini)",
  },
  ProcurementAdvisorAgent: {
    bg: "bg-brand-100",
    text: "text-brand-800",
    label: "Procurement Advisor",
  },
  BuyerUI: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    label: "Buyer Action",
  },
};

export default function AgentBadge({ source }) {
  const style = AGENT_STYLES[source] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: source || "Unknown",
  };
  return (
    <span className={`badge ${style.bg} ${style.text}`}>{style.label}</span>
  );
}
