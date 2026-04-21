import { useEffect, useState } from "react";
import {
  Package,
  Users,
  Flag,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { createBuyerAction, getBuyerActions, getRecommendations } from "../lib/api";
import ActionBadge from "../components/ActionBadge";

const MATERIAL_OPTIONS = [
  { value: "argan_oil", label: "Argan Oil" },
  { value: "shea_butter", label: "Shea Butter" },
  { value: "rose_extract", label: "Rose Extract" },
  { value: "jojoba_oil", label: "Jojoba Oil" },
  { value: "vanilla", label: "Vanilla" },
  { value: "palmarosa_oil", label: "Palmarosa Oil" },
];

const ACTION_TYPES = [
  {
    type: "create_purchase_request",
    label: "Create Purchase Request",
    description: "Generate a purchase request for SAP / ERP integration",
    icon: Package,
    color: "text-rocher-700",
  },
  {
    type: "schedule_review",
    label: "Schedule Supplier Review",
    description: "Set up a supplier performance review meeting",
    icon: Users,
    color: "text-blue-700",
  },
  {
    type: "flag_manager",
    label: "Flag for Commodity Manager",
    description: "Escalate to the commodity manager for decision",
    icon: Flag,
    color: "text-orange-600",
  },
  {
    type: "export_summary",
    label: "Export Recommendation Summary",
    description: "Generate a PDF summary for stakeholder review",
    icon: FileText,
    color: "text-gray-600",
  },
];

export default function Actions() {
  const [selectedMaterial, setSelectedMaterial] = useState("argan_oil");
  const [actions, setActions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getBuyerActions()
      .then((res) => setActions(res.actions || []))
      .catch(console.error);
    getRecommendations()
      .then((res) => setRecommendations(res.recommendations || []))
      .catch(console.error);
  }, []);

  async function handleAction(actionType) {
    try {
      const result = await createBuyerAction({
        action_type: actionType,
        material: selectedMaterial,
        details: {
          triggered_from: "action_panel",
          recommendation_id:
            recommendations.find((r) => r.material === selectedMaterial)
              ?.recommendation_id || null,
        },
      });
      setStatus({ type: "success", message: `${actionType} created` });
      setActions((prev) => [result.action, ...prev]);
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ type: "error", message: "Action failed" });
      setTimeout(() => setStatus(null), 3000);
    }
  }

  const currentRec = recommendations.find(
    (r) => r.material === selectedMaterial
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Buyer Actions</h2>
        <p className="text-sm text-gray-500 mt-1">
          Take action on AI recommendations — integrates with procurement
          workflows
        </p>
      </div>

      {/* Material selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Material
        </label>
        <select
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {MATERIAL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {currentRec && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">
                Current AI Recommendation:
              </span>
              <ActionBadge action={currentRec.action} />
            </div>
            <p className="text-sm text-gray-600">{currentRec.rationale}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACTION_TYPES.map(({ type, label, description, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => handleAction(type)}
            className="card text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 group-hover:text-rocher-700 transition-colors">
                  {label}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div
          className={`card ${
            status.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`w-4 h-4 ${
                status.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            />
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        </div>
      )}

      {/* Action history */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Actions
        </h3>
        {actions.length > 0 ? (
          <div className="card p-0 divide-y divide-gray-100">
            {actions.map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {a.action_type?.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.material?.replace(/_/g, " ")} — {a.created_by}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {a.created_at
                    ? new Date(a.created_at).toLocaleTimeString()
                    : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 card text-center py-8">
            No actions taken yet. Use the buttons above to trigger procurement
            actions.
          </p>
        )}
      </section>

      {/* Integration note */}
      <div className="card bg-gray-50 border-dashed">
        <p className="text-sm text-gray-500">
          <strong>Integration point:</strong> In production, these actions
          connect to SAP MM (purchase requisitions), Ariba (supplier management),
          and the procurement team's workflow tools. The event is published to
          the Solace mesh on{" "}
          <code className="text-xs bg-gray-200 px-1 rounded">
            rocher/procurement/actions/*
          </code>{" "}
          so any downstream system can subscribe.
        </p>
      </div>
    </div>
  );
}
