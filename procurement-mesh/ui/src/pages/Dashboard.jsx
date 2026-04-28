import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Zap, Bot, Globe,
} from "lucide-react";
import { getDashboardSummary, getNews } from "../lib/api";
import useEventStream from "../hooks/useEventStream";

const MAT_NAMES = {
  argan_oil: "Argan Oil", shea_butter: "Shea Butter", rose_extract: "Rose Extract",
  jojoba_oil: "Jojoba Oil", vanilla: "Vanilla", palmarosa_oil: "Palmarosa Oil",
};
const MAT_FLAGS = {
  argan_oil: "\u{1F1F2}\u{1F1E6}", shea_butter: "\u{1F1E7}\u{1F1EB}", rose_extract: "\u{1F1E7}\u{1F1EC}",
  jojoba_oil: "\u{1F1FA}\u{1F1F8}", vanilla: "\u{1F1F2}\u{1F1EC}", palmarosa_oil: "\u{1F1EE}\u{1F1F3}",
};
const ACTION_LABELS = {
  buy_now: "Buy Now", buy_partial: "Buy Partial", hold: "Hold", hedge: "Hedge",
  renegotiate: "Renegotiate", escalate: "Escalate", diversify: "Diversify",
};
const SEVERITY_CLS = {
  low: "text-green-600 bg-green-50", moderate: "text-yellow-700 bg-yellow-50",
  elevated: "text-orange-700 bg-orange-50", high: "text-red-700 bg-red-50",
  critical: "text-red-900 bg-red-100",
};
const URGENCY_CLS = {
  low: "border-green-300", medium: "border-yellow-400", high: "border-red-400", critical: "border-red-600",
};

function MiniSparkline({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120, h = 32;
  const pts = data.slice(-30).map((v, i, a) => `${(i / (a.length - 1)) * w},${h - ((v - min) / range) * h}`);
  const rising = data[data.length - 1] > data[data.length - 2];
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke={rising ? "#ef4444" : "#22c55e"} strokeWidth="1.5" points={pts.join(" ")} />
    </svg>
  );
}

function Momentum({ value }) {
  if (value > 0.5) return <span className="text-red-600 flex items-center gap-0.5 text-xs font-semibold"><TrendingUp className="w-3 h-3" />+{value.toFixed(1)}%</span>;
  if (value < -0.5) return <span className="text-green-600 flex items-center gap-0.5 text-xs font-semibold"><TrendingDown className="w-3 h-3" />{value.toFixed(1)}%</span>;
  return <span className="text-gray-400 flex items-center gap-0.5 text-xs"><Minus className="w-3 h-3" />stable</span>;
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [news, setNews] = useState([]);
  const { events, connected } = useEventStream(300);

  useEffect(() => {
    const load = () => Promise.all([getDashboardSummary(), getNews(30)]).then(([s, n]) => { setSummary(s); setNews(n.news || []); }).catch(console.error);
    load();
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  }, []);

  const liveNews = events.filter((e) => e.event_type === "news").slice(0, 20);
  const liveCommentary = events.filter((e) => e.event_type === "commentary").slice(0, 12);
  const seenIds = new Set();
  const allNews = [...liveNews, ...news].filter((n) => { const id = n.news_id || n.headline; if (seenIds.has(id)) return false; seenIds.add(id); return true; }).slice(0, 25);
  const materials = summary?.materials || [];

  return (
    <div className="space-y-4">
      {/* PRICE TICKER */}
      <div className="bg-gray-900 text-white rounded-lg px-4 py-2.5 flex items-center gap-6 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0"><Zap className="w-3.5 h-3.5 text-yellow-400" />LIVE PRICES</div>
        {materials.map((m) => (
          <div key={m.material} className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-gray-400">{MAT_FLAGS[m.material]}</span>
            <span className="text-xs font-medium">{MAT_NAMES[m.material]}</span>
            <span className="text-sm font-bold tabular-nums">{m.current_price_eur?.toFixed(2)}€</span>
            <Momentum value={m.price_change_pct || 0} />
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          {connected ? "connected" : "reconnecting..."}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Material Cards */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Raw Materials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {materials.map((m) => (
                <div key={m.material} className={`bg-white rounded-lg border-l-4 ${URGENCY_CLS[m.recommendation_urgency] || "border-gray-200"} shadow-sm p-3.5 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{MAT_FLAGS[m.material]}</span>
                      <span className="font-semibold text-sm text-gray-900">{MAT_NAMES[m.material]}</span>
                    </div>
                    {m.risk_severity && m.risk_severity !== "low" && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_CLS[m.risk_severity] || ""}`}>{m.risk_severity}</span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xl font-bold text-gray-900 tabular-nums">{m.current_price_eur?.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 ml-0.5">€/kg</span>
                      <div className="mt-0.5"><Momentum value={m.price_change_pct || 0} /></div>
                    </div>
                    <MiniSparkline data={m.price_history} />
                  </div>
                  {m.latest_recommendation && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                      m.latest_recommendation === "hold" ? "bg-blue-100 text-blue-700" :
                      m.latest_recommendation.startsWith("buy") ? "bg-green-100 text-green-700" :
                      m.latest_recommendation === "hedge" ? "bg-purple-100 text-purple-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>{ACTION_LABELS[m.latest_recommendation] || m.latest_recommendation}</span>
                  )}
                  <div className="text-[11px] text-gray-400 flex justify-between">
                    <span>Coverage: {m.inventory_coverage_weeks?.toFixed(1) || "—"} wks</span>
                    <span>Contracts: {m.active_contracts}</span>
                  </div>
                  {m.risk_headline && (
                    <p className="text-[10px] text-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{m.risk_headline.length > 80 ? m.risk_headline.slice(0, 80) + "…" : m.risk_headline}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Buying Signals */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> AI Buying Signals</h2>
            <div className="space-y-2">
              {materials.filter(m => m.commentary).map((m) => (
                <div key={m.material} className="bg-white rounded-lg shadow-sm p-3 flex items-start gap-3 event-enter">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-4 h-4 text-brand-700" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900">{MAT_NAMES[m.material]}</span>
                      <span className="text-[10px] text-gray-400 tabular-nums">{m.commentary_timestamp ? new Date(m.commentary_timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{m.commentary}</p>
                  </div>
                </div>
              ))}
              {liveCommentary.filter(c => !materials.find(m => m.material === c.material && m.commentary)).map((c, i) => (
                <div key={`live-${i}`} className="bg-white rounded-lg shadow-sm p-3 flex items-start gap-3 event-enter">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-4 h-4 text-purple-700" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900">{MAT_NAMES[c.material] || c.material}</span>
                      <span className="text-[10px] text-gray-400 tabular-nums">{c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{c.commentary}</p>
                  </div>
                </div>
              ))}
              {materials.filter(m => m.commentary).length === 0 && liveCommentary.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">AI agent generating buying signals — first signal in ~25 seconds...</p>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT: News + Events */}
        <div className="space-y-4">
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> World News</h2>
            <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {allNews.map((n, i) => (
                <div key={`${n.news_id}-${i}`} className="px-3 py-2.5 event-enter">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_CLS[n.severity] || "text-gray-500 bg-gray-50"}`}>{n.category || n.severity}</span>
                    <span className="text-[10px] text-gray-400">{n.source}</span>
                    <span className="ml-auto text-[10px] text-gray-300 tabular-nums">{n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : ""}</span>
                  </div>
                  <p className="text-xs text-gray-800 leading-snug">{n.headline}</p>
                </div>
              ))}
              {allNews.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Loading news feed...</p>}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Solace Event Stream</h2>
            <div className="bg-white rounded-lg shadow-sm max-h-[350px] overflow-y-auto divide-y divide-gray-50">
              {events.slice(0, 40).map((evt, i) => {
                const isM = evt.source === "MarketIntelligenceAgent";
                const isR = evt.source === "RiskWebIntelligenceAgent";
                const isA = evt.source === "ProcurementAdvisorAgent";
                const isO = evt.source === "OrchestrationEngine";
                const dot = isM ? "bg-blue-400" : isR ? "bg-purple-400" : isA ? "bg-green-400" : isO ? "bg-yellow-400" : "bg-gray-300";
                const label = isM ? "Market" : isR ? "Risk" : isA ? "Advisor" : isO ? "Collab" : "Action";
                const ts = evt.timestamp || evt.updated_at || evt.created_at;
                let text = "";
                if (evt.event_type === "news") text = evt.headline || "";
                else if (evt.event_type === "commentary") text = evt.commentary?.slice(0, 80) + "…";
                else if (evt.event_type === "collaboration_step") text = `${evt.agent}: step ${evt.step}`;
                else if (evt.event_type === "collaboration_start") text = `Collaboration started: ${evt.trigger_summary?.slice(0, 60)}`;
                else if (evt.event_type === "collaboration_complete") text = `Collaboration ${evt.thread_id} complete`;
                else if (evt.event_type === "price_update") text = `${MAT_NAMES[evt.material] || evt.material} ${evt.price_eur_per_kg?.toFixed(2)}€ (${evt.change_pct > 0 ? "+" : ""}${evt.change_pct?.toFixed(2)}%)`;
                else text = evt.summary || evt.headline || evt.topic?.split("/").pop() || "";
                return (
                  <div key={i} className="px-3 py-1.5 flex items-center gap-2 event-enter">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <span className="text-[10px] text-gray-400 font-medium w-12 shrink-0">{label}</span>
                    <span className="text-[11px] text-gray-700 truncate flex-1">{text}</span>
                    <span className="text-[10px] text-gray-300 tabular-nums shrink-0">{ts ? new Date(ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}) : ""}</span>
                  </div>
                );
              })}
              {events.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Waiting for events...</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
