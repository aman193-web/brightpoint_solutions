import { useState } from "react";
import { toast } from "sonner";
import { DemoStateBar } from "./common/DemoStateBar";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Circle,
  MoreHorizontal,
  TrendingUp,
  FileText,
  Send,
  Trophy,
  FolderOpen,
  CalendarClock,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type DashboardState = "populated" | "empty" | "loading" | "error" | "partial";

const PIPELINE_DATA = [
  { month: "Feb", value: 2.8 },
  { month: "Mar", value: 3.4 },
  { month: "Apr", value: 3.1 },
  { month: "May", value: 3.9 },
  { month: "Jun", value: 4.2 },
  { month: "Jul", value: 4.85 },
];

const STATUS_BAR_DATA = [
  { label: "Takeoff", value: 4, color: "#3B82F6" },
  { label: "Pricing", value: 3, color: "#D97706" },
  { label: "Review", value: 2, color: "#7C3AED" },
  { label: "Submitted", value: 8, color: "#6B7280" },
  { label: "Won", value: 5, color: "#16A34A" },
  { label: "Lost", value: 2, color: "#DC2626" },
];

const BID_DEADLINES = [
  { id: "BP-025", name: "Dollar Tree Retail Fit-Out — Store 1842", gc: "Summit Commercial Builders", due: "Jul 24", daysLeft: 11, status: "takeoff", value: 148000 },
  { id: "BP-026", name: "Eastfield Shopping Center — Tenancy 4B", gc: "Mirvac Construction", due: "Jul 28", daysLeft: 15, status: "pricing", value: 224000 },
  { id: "BP-027", name: "Parramatta Council Depot Upgrade", gc: "Direct to client", due: "Aug 4", daysLeft: 22, status: "draft", value: 390000 },
  { id: "BP-028", name: "Woolworths Distribution Hub — Stage 3", gc: "John Holland Group", due: "Aug 12", daysLeft: 30, status: "drawings", value: 715000 },
];

const ATTENTION_ITEMS = [
  { id: "BP-023", name: "Riverside Medical Center Fit-Out", issue: "Supplier pricing not updated in 14 days", severity: "warning", action: "Update pricing" },
  { id: "BP-022", name: "Greenfield Warehouse Distribution Hub", issue: "Awaiting review — assigned to TC since Monday", severity: "info", action: "Follow up" },
  { id: "BP-024", name: "Northgate Industrial Complex Phase 2", issue: "3 drawing sheets unprocessed", severity: "warning", action: "Process drawings" },
];

const RECENT_PROJECTS = [
  { id: "BP-025", name: "Dollar Tree Retail Fit-Out — Store 1842", status: "takeoff", value: 148000, modified: "2h ago", estimator: "JM" },
  { id: "BP-023", name: "Riverside Medical Center Fit-Out", status: "pricing", value: 285000, modified: "Yesterday", estimator: "SR" },
  { id: "BP-024", name: "Northgate Industrial Complex — Phase 2", status: "takeoff", value: 412000, modified: "Yesterday", estimator: "JM" },
  { id: "BP-021", name: "CBD Office Tower — Levels 14–22", status: "submitted", value: 740000, modified: "3 days ago", estimator: "TC" },
  { id: "BP-022", name: "Greenfield Warehouse Distribution Hub", status: "review", value: 198000, modified: "3 days ago", estimator: "JM" },
];

const ACTIVITY = [
  { text: "Estimate updated — Northgate Phase 2", time: "2h ago", user: "JM", color: "#2563EB" },
  { text: "Quote #Q-089 sent to Pinnacle Property", time: "5h ago", user: "TC", color: "#16A34A" },
  { text: "3 drawings uploaded to Riverside Medical", time: "Yesterday", user: "SR", color: "#7C3AED" },
  { text: "Supplier pricing imported — 1,240 items", time: "Yesterday", user: "SY", color: "#9CA3AF" },
  { text: "Takeoff completed — Greenfield Warehouse", time: "3d ago", user: "JM", color: "#2563EB" },
  { text: "CBD Office Tower estimate marked as Won", time: "1w ago", user: "TC", color: "#16A34A" },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#6B7280", bg: "#F3F4F6" },
  drawings: { label: "Processing", color: "#2563EB", bg: "#EFF6FF" },
  takeoff: { label: "Takeoff", color: "#7C3AED", bg: "#F5F3FF" },
  pricing: { label: "Pricing req.", color: "#D97706", bg: "#FFFBEB" },
  review: { label: "In review", color: "#2563EB", bg: "#EFF6FF" },
  submitted: { label: "Submitted", color: "#6B7280", bg: "#F3F4F6" },
  won: { label: "Won", color: "#16A34A", bg: "#F0FDF4" },
  lost: { label: "Lost", color: "#DC2626", bg: "#FEF2F2" },
};

function fmt(n: number) {
  return "$" + n.toLocaleString("en-AU");
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function Avatar({ initials, color = "#2563EB" }: { initials: string; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", backgroundColor: color, fontSize: 10, fontWeight: 600, color: "white", flexShrink: 0 }}>
      {initials}
    </span>
  );
}

const AVATAR_COLORS: Record<string, string> = { JM: "#2563EB", SR: "#7C3AED", TC: "#16A34A", SY: "#9CA3AF" };

function DaysBadge({ days }: { days: number }) {
  const urgent = days <= 7;
  const soon = days <= 14;
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: urgent ? "#DC2626" : soon ? "#D97706" : "#4B5563", backgroundColor: urgent ? "#FEF2F2" : soon ? "#FFFBEB" : "#F3F4F6", padding: "2px 7px", borderRadius: 4, fontFamily: "IBM Plex Mono, monospace" }}>
      {days}d
    </span>
  );
}

// Loading skeleton block
function Skeleton({ w = "100%", h = 14 }: { w?: string | number; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, backgroundColor: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />;
}

interface DashboardViewProps {
  onOpenProject?: (id: string) => void;
  onNewProject?: () => void;
  onNavigateTo?: (page: string) => void;
  projectStatus?: string;
}

export function DashboardView({ onOpenProject, onNewProject, onNavigateTo }: DashboardViewProps) {
  const [dashState, setDashState] = useState<DashboardState>("populated");

  return (
    <div style={{ backgroundColor: "#F6F7F9", minHeight: "100%" }}>
      <DemoStateBar
        label="Dashboard state"
        states={["populated", "empty", "loading", "error", "partial"] as DashboardState[]}
        value={dashState}
        onChange={setDashState}
      />

      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#111827" }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Monday, 13 July 2026 — Acme Electrical Co.</p>
          </div>
          {dashState !== "empty" && (
            <button
              onClick={onNewProject}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", borderRadius: 6, backgroundColor: "#2563EB", color: "white", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              <Plus size={14} />
              New project
            </button>
          )}
        </div>

        {/* --- LOADING STATE --- */}
        {dashState === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <Skeleton w="60%" h={12} />
                  <Skeleton w="40%" h={22} />
                  <Skeleton w="80%" h={10} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
              <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <Skeleton w="30%" h={16} />
                {[...Array(4)].map((_, i) => <Skeleton key={i} h={40} />)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: 20, flex: 1 }}>
                  <Skeleton w="50%" h={16} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- EMPTY STATE --- */}
        {dashState === "empty" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderOpen size={28} color="#2563EB" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 6 }}>No projects yet</h2>
              <p style={{ fontSize: 14, color: "#6B7280", maxWidth: 340, lineHeight: "20px" }}>
                Create your first project to start tracking bids, building estimates, and generating quotes.
              </p>
            </div>
            <button
              onClick={onNewProject}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 20px", borderRadius: 6, backgroundColor: "#2563EB", color: "white", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
            >
              <Plus size={15} />
              Create your first project
            </button>
            <p style={{ fontSize: 12, color: "#9CA3AF" }}>Or import projects from a CSV file</p>
          </div>
        )}

        {/* --- ERROR STATE --- */}
        {dashState === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 360, textAlign: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={28} color="#DC2626" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Couldn't load dashboard</h2>
              <p style={{ fontSize: 14, color: "#6B7280", maxWidth: 340, lineHeight: "20px" }}>
                We had trouble fetching your data. Check your connection and try again.
              </p>
            </div>
            <button
              onClick={() => setDashState("populated")}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", borderRadius: 6, backgroundColor: "white", color: "#374151", border: "1px solid #D1D5DB", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* --- POPULATED / PARTIAL STATE --- */}
        {(dashState === "populated" || dashState === "partial") && (
          <>
            {/* Partial data warning */}
            {dashState === "partial" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, marginBottom: 16 }}>
                <AlertTriangle size={15} color="#D97706" />
                <p style={{ fontSize: 13, color: "#92400E" }}>
                  <strong>Partial data:</strong> Supplier pricing could not be loaded. Some estimate values may be incomplete.
                  <button onClick={() => { toast.loading("Retrying…"); setTimeout(() => { toast.dismiss(); toast.success("Pricing data loaded"); setDashState("populated"); }, 1800); }} style={{ marginLeft: 8, fontSize: 13, color: "#D97706", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Retry</button>
                </p>
              </div>
            )}

            {/* KPI strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Active estimates", value: "11", change: "+2", up: true },
                { label: "Bids due this week", value: "3", change: "Urgent", up: false, urgent: true },
                { label: "Pipeline value", value: "$4.85M", change: "+$0.65M", up: true },
                { label: "Submitted bids", value: "8", change: "+1", up: true },
                { label: "Won bids", value: "5", change: "62.5% rate", up: true },
                { label: "Win rate", value: "62.5%", change: "+5%", up: true },
              ].map((kpi) => (
                <div key={kpi.label} style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", marginBottom: 6, lineHeight: "14px" }}>{kpi.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 600, color: "#111827", lineHeight: 1, marginBottom: 4, fontFamily: kpi.value.includes("$") ? "IBM Plex Mono, monospace" : undefined }}>{kpi.value}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {kpi.urgent ? (
                      <AlertTriangle size={11} color="#DC2626" />
                    ) : kpi.up ? (
                      <ArrowUpRight size={11} color="#16A34A" />
                    ) : (
                      <ArrowDownRight size={11} color="#DC2626" />
                    )}
                    <span style={{ fontSize: 11, color: kpi.urgent ? "#DC2626" : kpi.up ? "#16A34A" : "#DC2626" }}>{kpi.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Bid deadlines */}
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CalendarClock size={15} color="#6B7280" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Upcoming bid deadlines</span>
                    </div>
                    <button onClick={() => onNavigateTo?.("projects")} style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>View all</button>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                        {["Project", "General contractor", "Due", "Days", "Status", "Value"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "7px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {BID_DEADLINES.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => onOpenProject?.(p.id)}
                          style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                            <p style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#9CA3AF" }}>{p.id}</p>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 12, color: "#4B5563", whiteSpace: "nowrap" }}>{p.gc}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#111827", whiteSpace: "nowrap" }}>{p.due}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <DaysBadge days={p.daysLeft} />
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <StatusBadge status={p.status} />
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#111827", fontWeight: 500 }}>{fmt(p.value)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Estimates requiring attention */}
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={15} color="#D97706" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Estimates requiring attention</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706", backgroundColor: "#FFFBEB", padding: "1px 6px", borderRadius: 999 }}>{ATTENTION_ITEMS.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {ATTENTION_ITEMS.map((item, i) => (
                      <div
                        key={item.id}
                        style={{ padding: "12px 16px", borderBottom: i < ATTENTION_ITEMS.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: item.severity === "warning" ? "#D97706" : "#2563EB", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.name}</p>
                          <p style={{ fontSize: 12, color: "#6B7280" }}>{item.issue}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (item.action === "Update pricing") onNavigateTo?.("pricing");
                            else if (item.action === "Process drawings") onNavigateTo?.("drawings-upload");
                            else toast.info(`${item.action} — opening project`);
                          }}
                          style={{ height: 28, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 5, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#374151", whiteSpace: "nowrap" }}
                        >
                          {item.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent projects */}
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Recently modified</span>
                    <button onClick={() => onNavigateTo?.("projects")} style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>All projects</button>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                        {["Project", "Status", "Value", "Modified", ""].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "7px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RECENT_PROJECTS.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => onOpenProject?.(p.id)}
                          style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                            <p style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#9CA3AF" }}>{p.id}</p>
                          </td>
                          <td style={{ padding: "10px 12px" }}><StatusBadge status={p.status} /></td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "#111827", fontWeight: 500 }}>{fmt(p.value)}</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Avatar initials={p.estimator} color={AVATAR_COLORS[p.estimator] ?? "#6B7280"} />
                              <span style={{ fontSize: 12, color: "#6B7280" }}>{p.modified}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <button onClick={() => onOpenProject?.(p.id)} style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Pipeline trend chart */}
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Pipeline trend</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>Feb – Jul 2026</span>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={PIPELINE_DATA} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                      <defs key="defs">
                        <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="10%" stopColor="#2563EB" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} domain={[0, 6]} />
                      <Tooltip
                        key="tooltip"
                        formatter={(v: number) => [`$${v}M`, "Pipeline"]}
                        contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                      />
                      <Area key="area" type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fill="url(#pipelineGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bid status breakdown */}
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", display: "block", marginBottom: 12 }}>Bid status breakdown</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {STATUS_BAR_DATA.map((s) => {
                      const total = STATUS_BAR_DATA.reduce((a, b) => a + b.value, 0);
                      const pct = Math.round((s.value / total) * 100);
                      return (
                        <div key={s.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: "#4B5563" }}>{s.label}</span>
                            <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#111827", fontWeight: 500 }}>{s.value}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 999, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: s.color, transition: "width 500ms ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team activity */}
                <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Team activity</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", padding: "8px 0" }}>
                    {ACTIVITY.map((item, i) => (
                      <div key={i} style={{ padding: "8px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Avatar initials={item.user} color={item.color} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: "#4B5563", lineHeight: "15px" }}>{item.text}</p>
                          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
