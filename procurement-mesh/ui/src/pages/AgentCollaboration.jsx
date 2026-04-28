import { useEffect, useState } from "react";
import {
  GitBranch, Bot, TrendingUp, Shield, ShoppingCart, Zap, Clock,
  ArrowDown, AlertTriangle, CheckCircle, Loader2, Newspaper,
} from "lucide-react";
import { getCollaborations, getNews } from "../lib/api";
import useEventStream from "../hooks/useEventStream";

const MAT_NAMES = {
  argan_oil: "Argan Oil", shea_butter: "Shea Butter", rose_extract: "Rose Extract",
  jojoba_oil: "Jojoba Oil", vanilla: "Vanilla", palmarosa_oil: "Palmarosa Oil",
};

const SEVERITY_CLS = {
  low: "text-green-700 bg-green-50", moderate: "text-yellow-700 bg-yellow-50",
  elevated: "text-orange-700 bg-orange-50", high: "text-red-700 bg-red-50",
};

const AGENT_CONFIG = {
  1: { name: "Market Intelligence Agent", icon: TrendingUp, color: "blue", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
  2: { name: "Risk & Web Intelligence Agent", icon: Shield, color: "purple", bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-800" },
  3: { name: "Procurement Advisor Agent", icon: ShoppingCart, color: "green", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800" },
};

function ModelBadge({ model, provider }) {
  const isGemini = model?.includes("gemini");
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isGemini ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
      {isGemini ? "Gemini 2.5 Flash" : "GPT-4o"}
    </span>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StepCard({ step }) {
  const cfg = AGENT_CONFIG[step.step] || AGENT_CONFIG[1];
  const Icon = cfg.icon;
  const output = step.output || {};

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full ${cfg.badge} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{step.agent}</p>
            <div className="flex items-center gap-2">
              <ModelBadge model={step.model} provider={step.model_provider} />
              <span className="text-[10px] text-gray-400">{step.model_provider}</span>
            </div>
          </div>
        </div>
        <div className="text-right text-[10px] text-gray-400">
          <p>{formatTime(step.started_at)}</p>
          {step.completed_at && (
            <p className="text-green-600">
              {((new Date(step.completed_at) - new Date(step.started_at)) / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      </div>

      {/* Step 1: Market Analysis */}
      {step.step === 1 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {output.fair_price_eur && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Fair Price</p>
              <p className="font-bold text-lg text-gray-900">{output.fair_price_eur?.toFixed(2)} <span className="text-xs font-normal">€/kg</span></p>
            </div>
          )}
          {output.current_vs_fair && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">vs. Fair Value</p>
              <p className={`font-bold text-lg ${output.current_vs_fair === "above" ? "text-red-600" : output.current_vs_fair === "below" ? "text-green-600" : "text-gray-600"}`}>
                {output.premium_pct != null ? `${output.premium_pct > 0 ? "+" : ""}${output.premium_pct?.toFixed(1)}%` : output.current_vs_fair}
              </p>
            </div>
          )}
          {output.trend && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Trend</p>
              <p className={`font-semibold ${output.trend === "rising" ? "text-red-600" : output.trend === "declining" ? "text-green-600" : "text-gray-600"}`}>
                {output.trend} ({output.momentum_strength || ""})
              </p>
            </div>
          )}
          {output.volatility && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Volatility</p>
              <p className={`font-semibold ${output.volatility === "high" || output.volatility === "extreme" ? "text-red-600" : "text-gray-600"}`}>{output.volatility}</p>
            </div>
          )}
          {output.analysis && <p className="col-span-2 text-gray-700 leading-relaxed bg-white rounded p-2">{output.analysis}</p>}
        </div>
      )}

      {/* Step 2: Risk Assessment */}
      {step.step === 2 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {output.risk_score != null && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Risk Score</p>
              <p className={`font-bold text-2xl ${output.risk_score >= 7 ? "text-red-600" : output.risk_score >= 4 ? "text-orange-600" : "text-green-600"}`}>
                {output.risk_score}<span className="text-sm font-normal text-gray-400">/10</span>
              </p>
            </div>
          )}
          {output.supply_disruption_pct != null && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Supply Disruption</p>
              <p className="font-bold text-2xl text-gray-900">{output.supply_disruption_pct}%</p>
            </div>
          )}
          {output.lead_time_impact_days != null && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Lead Time Impact</p>
              <p className="font-semibold text-gray-900">+{output.lead_time_impact_days} days</p>
            </div>
          )}
          {output.risk_level && (
            <div className="bg-white rounded p-2">
              <p className="text-gray-400 text-[10px]">Risk Level</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_CLS[output.risk_level] || ""}`}>{output.risk_level}</span>
            </div>
          )}
          {output.key_risk_factors && (
            <div className="col-span-2 bg-white rounded p-2 space-y-1">
              <p className="text-gray-400 text-[10px]">Key Risk Factors</p>
              {output.key_risk_factors.map((f, i) => (
                <p key={i} className="text-gray-700 flex items-start gap-1"><AlertTriangle className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />{f}</p>
              ))}
            </div>
          )}
          {output.analysis && <p className="col-span-2 text-gray-700 leading-relaxed bg-white rounded p-2">{output.analysis}</p>}
        </div>
      )}

      {/* Step 3: Procurement Recommendation */}
      {step.step === 3 && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-2">
            {output.action && (
              <div className="bg-white rounded p-2">
                <p className="text-gray-400 text-[10px]">Action</p>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  output.action === "hold" ? "bg-blue-100 text-blue-700" :
                  output.action?.startsWith("buy") ? "bg-green-100 text-green-700" :
                  output.action === "hedge" ? "bg-purple-100 text-purple-700" :
                  "bg-orange-100 text-orange-700"
                }`}>{output.action?.replace("_", " ").toUpperCase()}</span>
              </div>
            )}
            {output.market_fulfillment_score != null && (
              <div className="bg-white rounded p-2">
                <p className="text-gray-400 text-[10px]">Market Fulfillment</p>
                <p className={`font-bold text-2xl ${output.market_fulfillment_score >= 7 ? "text-green-600" : output.market_fulfillment_score >= 4 ? "text-yellow-600" : "text-red-600"}`}>
                  {output.market_fulfillment_score}<span className="text-sm font-normal text-gray-400">/10</span>
                </p>
              </div>
            )}
            {output.fulfillment_risk_pct != null && (
              <div className="bg-white rounded p-2">
                <p className="text-gray-400 text-[10px]">Fulfillment Risk</p>
                <p className="font-bold text-2xl text-gray-900">{output.fulfillment_risk_pct}%</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {output.suggested_pct_of_forecast != null && (
              <div className="bg-white rounded p-2">
                <p className="text-gray-400 text-[10px]">% of Forecast to Secure</p>
                <p className="font-bold text-xl text-gray-900">{output.suggested_pct_of_forecast}%</p>
              </div>
            )}
            {output.timing_window && (
              <div className="bg-white rounded p-2">
                <p className="text-gray-400 text-[10px]">Timing Window</p>
                <p className="font-semibold text-gray-900">{output.timing_window}</p>
              </div>
            )}
          </div>
          {output.rationale && (
            <div className="bg-white rounded p-2.5 border border-green-200">
              <p className="text-gray-400 text-[10px] mb-1">Rationale</p>
              <p className="text-gray-800 leading-relaxed text-sm">{output.rationale}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollaborationThread({ thread }) {
  return (
    <div className="space-y-3">
      {/* Trigger */}
      <div className="bg-gray-900 text-white rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-medium text-gray-300">TRIGGERING EVENT</span>
          <span className="text-[10px] text-gray-500 ml-auto">{formatTime(thread.started_at)}</span>
        </div>
        <p className="text-sm font-medium">{thread.trigger_summary}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded">{MAT_NAMES[thread.material] || thread.material}</span>
          {thread.status === "complete" && <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />}
          {thread.status === "running" && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin ml-auto" />}
        </div>
      </div>

      {/* Agent steps with connecting arrows */}
      {thread.steps?.map((step, i) => (
        <div key={step.step}>
          <div className="flex justify-center py-1">
            <div className="flex flex-col items-center">
              <ArrowDown className="w-4 h-4 text-gray-300" />
              <span className="text-[9px] text-gray-400">Solace Event Mesh</span>
            </div>
          </div>
          <StepCard step={step} />
        </div>
      ))}

      {thread.status === "running" && (
        <div className="flex justify-center py-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Agent processing...
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentCollaboration() {
  const [threads, setThreads] = useState([]);
  const [news, setNews] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const { events, connected } = useEventStream(300);

  useEffect(() => {
    const load = () => Promise.all([getCollaborations(), getNews(20)]).then(([t, n]) => {
      setThreads(t.threads || []);
      setNews(n.news || []);
      if (!selectedThread && t.threads?.length) setSelectedThread(t.threads[t.threads.length - 1]);
    }).catch(console.error);
    load();
    const iv = setInterval(load, 6000);
    return () => clearInterval(iv);
  }, []);

  // Merge SSE collaboration events into threads
  const liveSteps = events.filter(e => e.event_type === "collaboration_step");
  const collabStarts = events.filter(e => e.event_type === "collaboration_start");

  // Build merged thread list
  const allThreads = [...threads];
  // Update selected thread with live steps
  if (selectedThread) {
    const liveForSelected = liveSteps.filter(s => s.thread_id === selectedThread.thread_id);
    if (liveForSelected.length > (selectedThread.steps?.length || 0)) {
      setSelectedThread(prev => ({
        ...prev,
        steps: liveForSelected.map(s => ({ step: s.step, agent: s.agent, model: s.model, model_provider: s.model_provider, started_at: s.started_at, completed_at: s.completed_at, output: s.output })),
      }));
    }
  }

  const triggerEvents = [
    ...events.filter(e => e.event_type === "news" && (e.severity === "high" || e.severity === "elevated")).slice(0, 10),
    ...events.filter(e => e.event_type === "price_update" && Math.abs(e.change_pct || 0) > 2).slice(0, 5),
    ...events.filter(e => e.event_type === "collaboration_start").slice(0, 5),
  ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 15);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-brand-700" />
            Agent Collaboration
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Gemini + GPT-4o agents collaborating over Solace Event Mesh to determine fair price, supply chain risk, and market fulfillment potential for NaturaCo</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          {connected ? "live" : "reconnecting"}
          <span className="text-gray-300">|</span>
          {allThreads.length} analysis threads
        </div>
      </div>

      {/* Agent legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-500 bg-white rounded-lg px-4 py-2 shadow-sm">
        <span className="font-medium text-gray-700">Agents:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Market Intel <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded">GPT-4o</span></span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" />Risk & Web Intel <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded">Gemini 2.5</span></span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400" />Procurement Advisor <span className="text-[9px] bg-green-50 text-green-600 px-1 rounded">GPT-4o</span></span>
        <span className="flex items-center gap-1 ml-auto"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />Orchestration Engine <span className="text-[9px] bg-yellow-50 text-yellow-600 px-1 rounded">Solace</span></span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Trigger events + thread list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trigger events */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" /> Triggering Events</h3>
            <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
              {triggerEvents.map((evt, i) => (
                <div key={i} className="px-3 py-2.5 event-enter hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-0.5">
                    {evt.severity && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_CLS[evt.severity] || "bg-gray-50 text-gray-500"}`}>{evt.severity}</span>}
                    {evt.event_type === "collaboration_start" && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-50 text-yellow-700">analysis started</span>}
                    {evt.event_type === "price_update" && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700">price alert</span>}
                    <span className="text-[10px] text-gray-300 ml-auto tabular-nums">{formatTime(evt.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-800">{evt.headline || evt.trigger_summary || `${MAT_NAMES[evt.material] || evt.material}: ${evt.change_pct?.toFixed(1)}% move`}</p>
                </div>
              ))}
              {triggerEvents.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Waiting for triggering events...</p>}
            </div>
          </section>

          {/* Thread list */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Analysis Threads</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {allThreads.slice().reverse().map((t) => (
                <button
                  key={t.thread_id}
                  onClick={() => setSelectedThread(t)}
                  className={`w-full text-left bg-white rounded-lg shadow-sm p-3 transition-all hover:shadow-md ${
                    selectedThread?.thread_id === t.thread_id ? "ring-2 ring-brand-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-gray-400">{t.thread_id}</span>
                    <div className="flex items-center gap-1">
                      {t.status === "complete" ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />}
                      <span className="text-[10px] text-gray-400">{formatTime(t.started_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">{t.trigger_summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{MAT_NAMES[t.material] || t.material}</span>
                    <span className="text-[10px] text-gray-400">{t.steps?.length || 0}/3 steps</span>
                  </div>
                </button>
              ))}
              {allThreads.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <Loader2 className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">First collaboration analysis starting in ~20 seconds...</p>
                  <p className="text-[10px] text-gray-300 mt-1">Agents will analyze triggering events as they arrive</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT: Selected thread detail */}
        <div className="lg:col-span-3">
          {selectedThread ? (
            <CollaborationThread thread={selectedThread} />
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <GitBranch className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select an analysis thread to see agents collaborating</p>
              <p className="text-xs text-gray-300 mt-1">Each thread shows 3 agents determining fair price, supply chain risk, and market fulfillment potential</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
