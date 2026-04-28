import { useState } from "react";
import {
  FileCheck, TrendingUp, Shield, ShoppingCart, Loader2, ArrowDown,
  CheckCircle, XCircle, AlertTriangle, ThumbsUp, Scale, Sparkles,
  Upload, FileText, X,
} from "lucide-react";

const SUGGESTIONS = [
  "Argan Oil", "Shea Butter", "Rose Extract", "Jojoba Oil", "Vanilla",
  "Palmarosa Oil", "Coconut Oil", "Almond Oil", "Lavender Oil",
  "Tea Tree Oil", "Cocoa Butter", "Beeswax", "Olive Oil", "Castor Oil",
  "Avocado Oil", "Rosemary Extract", "Chamomile Extract", "Aloe Vera",
  "Sunflower Oil", "Sesame Oil", "Macadamia Oil", "Hemp Seed Oil",
];

const VERDICT_CONFIG = {
  ACCEPT: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Accept" },
  GREAT_DEAL: { icon: ThumbsUp, color: "text-green-700", bg: "bg-green-100", border: "border-green-300", label: "Great Deal" },
  NEGOTIATE: { icon: Scale, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", label: "Negotiate" },
  REJECT: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Reject" },
};

const PRICE_VERDICT_CLS = {
  fair: "text-green-600", good_deal: "text-green-700", below_market: "text-green-700",
  slightly_high: "text-yellow-600", overpriced: "text-orange-600", significantly_overpriced: "text-red-600",
};

function FairnessGauge({ score }) {
  if (score == null) return null;
  const clamp = Math.max(0, Math.min(100, score));
  const color = clamp >= 70 ? "#22c55e" : clamp >= 50 ? "#eab308" : clamp >= 30 ? "#f97316" : "#ef4444";
  const label = clamp >= 80 ? "Fair" : clamp >= 60 ? "Acceptable" : clamp >= 40 ? "Overpriced" : "Significantly Overpriced";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 120 60" className="w-full h-full">
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${clamp * 1.57} 157`} />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-0">
          <span className="text-2xl font-bold" style={{ color }}>{clamp}</span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

function ModelBadge({ model }) {
  const isGemini = model?.includes("gemini");
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isGemini ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{isGemini ? "Gemini 2.5 Flash" : "GPT-4o"}</span>;
}

function StepCard({ step, stepNum }) {
  const ICONS = { 1: TrendingUp, 2: Shield, 3: ShoppingCart };
  const COLORS = {
    1: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
    2: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-800" },
    3: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800" },
  };
  const Icon = ICONS[stepNum] || TrendingUp;
  const c = COLORS[stepNum] || COLORS[1];
  const o = step.output || {};
  const elapsed = step.completed_at && step.started_at ? ((new Date(step.completed_at) - new Date(step.started_at)) / 1000).toFixed(1) : null;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${c.badge} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{step.agent}</p>
            <div className="flex items-center gap-2"><ModelBadge model={step.model} /><span className="text-[10px] text-gray-400">{step.model_provider}</span></div>
          </div>
        </div>
        {elapsed && <span className="text-[10px] text-green-600 font-medium">{elapsed}s</span>}
      </div>

      {stepNum === 1 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            {o.fair_price_eur != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Fair Market Price</p><p className="text-2xl font-bold text-gray-900">{o.fair_price_eur?.toFixed(2)}<span className="text-sm font-normal text-gray-400"> €</span></p></div>}
            {o.invoiced_price_eur != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Invoiced Price</p><p className="text-2xl font-bold text-gray-900">{o.invoiced_price_eur?.toFixed(2)}<span className="text-sm font-normal text-gray-400"> €</span></p></div>}
            {o.price_gap_pct != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Gap vs. Fair</p><p className={`text-2xl font-bold ${o.price_gap_pct > 5 ? "text-red-600" : o.price_gap_pct > 0 ? "text-yellow-600" : "text-green-600"}`}>{o.price_gap_pct > 0 ? "+" : ""}{o.price_gap_pct?.toFixed(1)}%</p></div>}
          </div>
          {o.price_verdict && <div className="flex items-center gap-2"><span className="text-xs font-medium text-gray-500">Price verdict:</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRICE_VERDICT_CLS[o.price_verdict] || "text-gray-600"} bg-white`}>{o.price_verdict?.replace(/_/g, " ")}</span>{o.seasonal_factor && <span className="text-[10px] text-gray-400">Season: {o.seasonal_factor}</span>}</div>}
          {o.analysis && <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg p-3">{o.analysis}</p>}
        </div>
      )}

      {stepNum === 2 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            {o.risk_adjusted_fair_price_eur != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Risk-Adjusted Fair Price</p><p className="text-2xl font-bold text-gray-900">{o.risk_adjusted_fair_price_eur?.toFixed(2)}<span className="text-sm font-normal text-gray-400"> €</span></p></div>}
            {o.justifiable_premium_pct != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Justifiable Premium</p><p className="text-xl font-bold text-gray-900">+{o.justifiable_premium_pct?.toFixed(1)}%</p></div>}
            {o.supply_scarcity && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Supply Status</p><p className={`text-sm font-bold ${o.supply_scarcity === "scarce" ? "text-red-600" : o.supply_scarcity === "tight" ? "text-orange-600" : "text-green-600"}`}>{o.supply_scarcity}</p></div>}
          </div>
          {o.risk_factors_supporting_premium?.length > 0 && <div className="bg-white rounded-lg p-3 space-y-1"><p className="text-[10px] font-medium text-orange-600">Factors supporting a premium:</p>{o.risk_factors_supporting_premium.map((f, i) => <p key={i} className="text-xs text-gray-700 flex items-start gap-1"><AlertTriangle className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />{f}</p>)}</div>}
          {o.risk_factors_against_premium?.length > 0 && <div className="bg-white rounded-lg p-3 space-y-1"><p className="text-[10px] font-medium text-green-600">Factors against a premium:</p>{o.risk_factors_against_premium.map((f, i) => <p key={i} className="text-xs text-gray-700 flex items-start gap-1"><CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />{f}</p>)}</div>}
          {o.analysis && <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg p-3">{o.analysis}</p>}
        </div>
      )}

      {stepNum === 3 && (
        <div className="space-y-3">
          {o.verdict && (() => {
            const vc = VERDICT_CONFIG[o.verdict] || VERDICT_CONFIG.NEGOTIATE;
            const VIcon = vc.icon;
            return (
              <div className={`${vc.bg} ${vc.border} border-2 rounded-xl p-4 flex items-center gap-4`}>
                <VIcon className={`w-10 h-10 ${vc.color}`} />
                <div className="flex-1">
                  <p className={`text-xl font-bold ${vc.color}`}>{vc.label}</p>
                  <p className="text-xs text-gray-500">Confidence: {((o.verdict_confidence || 0) * 100).toFixed(0)}%</p>
                </div>
                <FairnessGauge score={o.fairness_score} />
              </div>
            );
          })()}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {o.suggested_counter_price_eur != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Suggested Counter</p><p className="text-xl font-bold text-green-700">{o.suggested_counter_price_eur?.toFixed(2)}<span className="text-sm font-normal text-gray-400"> €</span></p></div>}
            {o.max_acceptable_price_eur != null && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Max Acceptable</p><p className="text-xl font-bold text-gray-900">{o.max_acceptable_price_eur?.toFixed(2)}<span className="text-sm font-normal text-gray-400"> €</span></p></div>}
            {o.savings_potential_eur_per_kg != null && o.savings_potential_eur_per_kg > 0 && <div className="bg-white rounded-lg p-3 text-center"><p className="text-gray-400 text-[10px] mb-1">Savings Potential</p><p className="text-xl font-bold text-green-600">{o.savings_potential_eur_per_kg?.toFixed(2)}<span className="text-sm font-normal text-gray-400"> €/kg</span></p></div>}
          </div>
          {o.negotiation_points?.length > 0 && <div className="bg-white rounded-lg p-3 space-y-1.5"><p className="text-[10px] font-semibold text-gray-500 uppercase">Negotiation points:</p>{o.negotiation_points.map((p, i) => <p key={i} className="text-sm text-gray-800 flex items-start gap-2"><span className="text-brand-600 font-bold shrink-0">{i + 1}.</span>{p}</p>)}</div>}
          {o.timing_advice && <p className="text-xs text-gray-500 bg-white rounded-lg p-2 italic">{o.timing_advice}</p>}
          {o.rationale && <div className="bg-white rounded-xl p-4 border border-green-200"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Full Rationale</p><p className="text-sm text-gray-800 leading-relaxed">{o.rationale}</p></div>}
        </div>
      )}
    </div>
  );
}

export default function InvoiceCheck() {
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadItems, setUploadItems] = useState(null);

  const filteredSuggestions = material
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(material.toLowerCase())).slice(0, 6)
    : SUGGESTIONS.slice(0, 6);

  async function handleCheck(e) {
    e.preventDefault();
    if (!price || !material) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/invoice-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, invoiced_price: parseFloat(price), supplier: supplier || null, quantity_kg: quantity ? parseFloat(quantity) : null }),
      });
      const data = await res.json();
      setResult(data.thread);
      setHistory((prev) => [data.thread, ...prev].slice(0, 10));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadItems(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/invoice-upload", { method: "POST", body: form });
      const data = await res.json();
      setUploadItems(data);
      if (data.items?.length > 0) {
        const first = data.items[0];
        setMaterial(first.material || "");
        setPrice(first.price_eur_per_kg?.toString() || "");
        setSupplier(first.supplier || "");
        setQuantity(first.quantity_kg?.toString() || "");
      }
    } catch (err) { console.error(err); }
    finally { setUploadLoading(false); e.target.value = ""; }
  }

  function selectUploadItem(item) {
    setMaterial(item.material || "");
    setPrice(item.price_eur_per_kg?.toString() || "");
    setSupplier(item.supplier || "");
    setQuantity(item.quantity_kg?.toString() || "");
    setUploadItems(null);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-brand-700" />
          Invoice Fairness Check
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Enter any substance and price, or upload an invoice document. Three AI agents analyze whether the price is fair.
        </p>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-xl shadow-sm p-4 border-2 border-dashed border-gray-200 hover:border-brand-300 transition-colors">
        <label className="flex items-center gap-4 cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
            {uploadLoading ? <Loader2 className="w-6 h-6 text-gray-400 animate-spin" /> : <Upload className="w-6 h-6 text-gray-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Upload an invoice or quote</p>
            <p className="text-xs text-gray-400">PDF, TXT, or CSV — AI will extract materials, prices, and quantities</p>
          </div>
          <input type="file" accept=".pdf,.txt,.csv,.doc,.docx" onChange={handleUpload} className="hidden" />
          <span className="btn-secondary text-xs">Browse files</span>
        </label>
      </div>

      {/* Extracted items from upload */}
      {uploadItems && uploadItems.items?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase">Extracted from {uploadItems.filename}</p>
            <button onClick={() => setUploadItems(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {uploadItems.items.map((item, i) => (
            <button key={i} onClick={() => selectUploadItem(item)}
              className="w-full text-left bg-gray-50 hover:bg-brand-50 rounded-lg p-3 transition-colors flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.material}</p>
                <p className="text-xs text-gray-500">{item.supplier || "Unknown supplier"}{item.quantity_kg ? ` · ${item.quantity_kg} kg` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{item.price_eur_per_kg?.toFixed(2)} <span className="text-xs font-normal text-gray-400">€/kg</span></p>
                <p className="text-[10px] text-brand-600">Click to check fairness</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Manual input form */}
      <form onSubmit={handleCheck} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Material / Substance *</label>
            <input type="text" value={material} onChange={(e) => { setMaterial(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type any material — e.g. Argan Oil, Coconut Oil, Beeswax..." required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <button key={s} type="button" onMouseDown={() => { setMaterial(s); setShowSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 text-gray-700">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoiced Price (EUR/kg) *</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 52.80" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplier (optional)</label>
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Cooperative Targanine"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (kg, optional)</label>
            <input type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Works with any raw material or ingredient — not limited to tracked materials
          </p>
          <button type="submit" disabled={loading || !price || !material}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><FileCheck className="w-4 h-4" />Check Fairness</>}
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-600 font-medium">Three agents analyzing your invoice...</p>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />Market Intel (GPT-4o)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />Risk Agent (Gemini)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Procurement Advisor</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 text-white rounded-lg px-4 py-2 flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{result.material} — {result.invoiced_price?.toFixed(2)} EUR/kg</p>
                {result.supplier && <p className="text-[10px] text-gray-400">{result.supplier}{result.quantity_kg ? ` · ${result.quantity_kg.toLocaleString()} kg` : ""}</p>}
              </div>
            </div>
            <span className="text-[10px] font-mono text-gray-400">{result.thread_id}</span>
          </div>
          {result.steps?.map((step, i) => (
            <div key={step.step}>
              {i > 0 && <div className="flex justify-center py-1"><div className="flex flex-col items-center"><ArrowDown className="w-4 h-4 text-gray-300" /><span className="text-[9px] text-gray-400">Solace Event Mesh</span></div></div>}
              <StepCard step={step} stepNum={step.step} />
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Previous Checks</h3>
          <div className="space-y-2">
            {history.slice(1).map((h) => {
              const advisor = h.steps?.find(s => s.step === 3)?.output;
              const vc = advisor?.verdict ? VERDICT_CONFIG[advisor.verdict] : null;
              return (
                <button key={h.thread_id} onClick={() => setResult(h)}
                  className={`w-full text-left bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-all ${result?.thread_id === h.thread_id ? "ring-2 ring-brand-500" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{h.material}</span>
                      <span className="text-sm text-gray-500">{h.invoiced_price?.toFixed(2)} EUR/kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {vc && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vc.bg} ${vc.color}`}>{vc.label}</span>}
                      {advisor?.fairness_score != null && <span className="text-xs text-gray-400">Score: {advisor.fairness_score}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
