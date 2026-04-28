import { Routes, Route, NavLink } from "react-router-dom";
import { LayoutDashboard, GitBranch, FileCheck, Leaf } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import AgentCollaboration from "./pages/AgentCollaboration";
import InvoiceCheck from "./pages/InvoiceCheck";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/agents", icon: GitBranch, label: "Agent Collaboration" },
  { to: "/invoice", icon: FileCheck, label: "Invoice Check" },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Leaf className="w-6 h-6 text-brand-700" />
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  NaturaCo · Procurement Intelligence
                </h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">
                  Solace Agent Mesh · Gemini · GPT-4o · Real-time
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              3 agents active
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 py-4 w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents" element={<AgentCollaboration />} />
          <Route path="/invoice" element={<InvoiceCheck />} />
        </Routes>
      </main>
    </div>
  );
}
