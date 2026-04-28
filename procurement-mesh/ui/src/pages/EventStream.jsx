import { useEffect, useState } from "react";
import { Zap, Filter, Pause, Play } from "lucide-react";
import { getEventHistory } from "../lib/api";
import useEventStream from "../hooks/useEventStream";
import AgentBadge from "../components/AgentBadge";

export default function EventStream() {
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const { events: liveEvents, connected } = useEventStream(300);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getEventHistory(200)
      .then((res) => setHistoricalEvents(res.events || []))
      .catch(console.error);
  }, []);

  const allEvents = paused
    ? historicalEvents
    : [...liveEvents, ...historicalEvents];

  const filtered =
    filter === "all"
      ? allEvents
      : allEvents.filter((e) => {
          if (filter === "market") return e.topic?.includes("/market/");
          if (filter === "risk") return e.topic?.includes("/risk/");
          if (filter === "advice") return e.topic?.includes("/advice/");
          if (filter === "actions") return e.source === "BuyerUI";
          return true;
        });

  const FILTERS = [
    { key: "all", label: "All Events" },
    { key: "market", label: "Market" },
    { key: "risk", label: "Risk" },
    { key: "advice", label: "Recommendations" },
    { key: "actions", label: "Buyer Actions" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Event Stream
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Solace topic events flowing through the agent mesh
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1 text-xs ${
              connected ? "text-green-600" : "text-red-500"
            }`}
          >
            <Zap className="w-3 h-3" />
            {connected ? "Connected" : "Disconnected"}
          </span>
          <button
            onClick={() => setPaused(!paused)}
            className="btn-secondary"
          >
            {paused ? (
              <>
                <Play className="w-4 h-4" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? "bg-brand-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Agent legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          Market Intelligence Agent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          Risk & Web Intelligence Agent (Gemini)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          Procurement Advisor Agent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          Buyer Action
        </span>
      </div>

      {/* Event list */}
      <div className="card p-0 divide-y divide-gray-100 max-h-[calc(100vh-320px)] overflow-y-auto">
        {filtered.slice(0, 200).map((evt, i) => {
          const ts = evt.timestamp || evt.updated_at || evt.created_at;
          return (
            <div
              key={i}
              className="px-4 py-3 hover:bg-gray-50 transition-colors event-enter"
            >
              <div className="flex items-center gap-3 mb-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    evt.source === "MarketIntelligenceAgent"
                      ? "bg-blue-400"
                      : evt.source === "RiskWebIntelligenceAgent"
                      ? "bg-purple-400"
                      : evt.source === "ProcurementAdvisorAgent"
                      ? "bg-green-400"
                      : "bg-gray-300"
                  }`}
                />
                <AgentBadge source={evt.source} />
                <code className="text-xs text-gray-400 font-mono truncate">
                  {evt.topic}
                </code>
                <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                  {ts ? new Date(ts).toLocaleTimeString() : ""}
                </span>
              </div>

              <div className="pl-6 text-sm text-gray-700">
                {evt.headline && (
                  <p className="font-medium">{evt.headline}</p>
                )}
                {evt.summary && <p>{evt.summary}</p>}
                {evt.rationale && (
                  <p className="text-gray-600">{evt.rationale}</p>
                )}
                {evt.event_type === "price_update" && evt.price_eur_per_kg && (
                  <p>
                    <span className="font-medium">
                      {evt.material?.replace(/_/g, " ")}
                    </span>{" "}
                    — EUR {evt.price_eur_per_kg.toFixed(2)}/kg (
                    <span
                      className={
                        evt.change_pct > 0
                          ? "text-red-600"
                          : evt.change_pct < 0
                          ? "text-green-600"
                          : ""
                      }
                    >
                      {evt.change_pct > 0 ? "+" : ""}
                      {evt.change_pct?.toFixed(3)}%
                    </span>
                    )
                  </p>
                )}
                {evt.event_type === "fx_update" && (
                  <p>
                    {evt.pair}: {evt.rate?.toFixed(4)} (
                    {evt.change_pct > 0 ? "+" : ""}
                    {evt.change_pct?.toFixed(4)}%)
                  </p>
                )}
                {evt.action_type && (
                  <p>
                    Buyer action: <strong>{evt.action_type}</strong> for{" "}
                    {evt.material?.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center py-12 text-gray-400 text-sm">
            No events matching filter. Waiting for agent activity...
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Showing {Math.min(filtered.length, 200)} of {filtered.length} events
        </span>
        <span>Total events in session: {allEvents.length}</span>
      </div>
    </div>
  );
}
