import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Rows3,
  AlignJustify,
  CheckSquare,
  Trash2,
  Copy,
  Archive,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  X,
} from "lucide-react";

type SortDir = "asc" | "desc" | null;
type Density = "compact" | "comfortable";
type Status =
  | "draft"
  | "drawings"
  | "takeoff"
  | "pricing"
  | "review"
  | "approved"
  | "submitted"
  | "won"
  | "lost";

interface Project {
  id: string;
  name: string;
  number: string;
  gc: string;
  location: string;
  estimator: string;
  bidDue: string;
  bidDueRaw: number;
  status: Status;
  value: number;
  lastUpdated: string;
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#6B7280", bg: "#F3F4F6" },
  drawings: { label: "Drawings processing", color: "#2563EB", bg: "#EFF6FF" },
  takeoff: { label: "Takeoff in progress", color: "#7C3AED", bg: "#F5F3FF" },
  pricing: { label: "Pricing required", color: "#D97706", bg: "#FFFBEB" },
  review: { label: "Ready for review", color: "#0284C7", bg: "#F0F9FF" },
  approved: { label: "Approved", color: "#16A34A", bg: "#F0FDF4" },
  submitted: { label: "Submitted", color: "#6B7280", bg: "#F3F4F6" },
  won: { label: "Won", color: "#16A34A", bg: "#F0FDF4" },
  lost: { label: "Lost", color: "#DC2626", bg: "#FEF2F2" },
};

/**
 * Lifecycle is the coarse state an estimator filters by; the detailed status
 * above stays on the row chip so no granularity is lost. Active covers
 * everything still being worked, which is why the list defaults to it.
 */
type Lifecycle = "active" | "submitted" | "won" | "lost";

const LIFECYCLE_OF: Record<Status, Lifecycle> = {
  draft: "active",
  drawings: "active",
  takeoff: "active",
  pricing: "active",
  review: "active",
  approved: "active",
  submitted: "submitted",
  won: "won",
  lost: "lost",
};

const LIFECYCLE_CFG: Record<Lifecycle | "all", { label: string; color: string; bg: string }> = {
  all:       { label: "All projects", color: "#6B7280", bg: "#F3F4F6" },
  active:    { label: "Active",       color: "#2563EB", bg: "#EFF6FF" },
  submitted: { label: "Submitted",    color: "#6B7280", bg: "#F3F4F6" },
  won:       { label: "Won",          color: "#16A34A", bg: "#F0FDF4" },
  lost:      { label: "Lost",         color: "#DC2626", bg: "#FEF2F2" },
};

const LIFECYCLE_ORDER: (Lifecycle | "all")[] = ["active", "submitted", "won", "lost", "all"];

const AVATAR_COLORS: Record<string, string> = {
  "James Mitchell": "#2563EB",
  "Sarah Reynolds": "#7C3AED",
  "Tom Chen": "#16A34A",
};

const ALL_PROJECTS: Project[] = [
  { id: "BP-025", name: "Dollar Tree Retail Fit-Out — Store 1842", number: "BP-025", gc: "Summit Commercial Builders", location: "Wollongong NSW", estimator: "James Mitchell", bidDue: "24 Jul 2026", bidDueRaw: 20260724, status: "takeoff", value: 148000, lastUpdated: "2h ago" },
  { id: "BP-024", name: "Northgate Industrial Complex — Phase 2", number: "BP-024", gc: "Northgate Developments", location: "Parramatta NSW", estimator: "James Mitchell", bidDue: "28 Jul 2026", bidDueRaw: 20260728, status: "takeoff", value: 412000, lastUpdated: "4h ago" },
  { id: "BP-023", name: "Riverside Medical Center Fit-Out", number: "BP-023", gc: "RMC Holdings", location: "Camperdown NSW", estimator: "Sarah Reynolds", bidDue: "1 Aug 2026", bidDueRaw: 20260801, status: "pricing", value: 285000, lastUpdated: "Yesterday" },
  { id: "BP-026", name: "Eastfield Shopping Center — Tenancy 4B", number: "BP-026", gc: "Mirvac Construction", location: "Eastfield VIC", estimator: "James Mitchell", bidDue: "4 Aug 2026", bidDueRaw: 20260804, status: "drawings", value: 224000, lastUpdated: "Yesterday" },
  { id: "BP-022", name: "Greenfield Warehouse Distribution Hub", number: "BP-022", gc: "LogiCo Pty Ltd", location: "Erskine Park NSW", estimator: "James Mitchell", bidDue: "12 Aug 2026", bidDueRaw: 20260812, status: "review", value: 198000, lastUpdated: "3 days ago" },
  { id: "BP-027", name: "Parramatta Council Depot Upgrade", number: "BP-027", gc: "Direct to client", location: "Parramatta NSW", estimator: "Tom Chen", bidDue: "18 Aug 2026", bidDueRaw: 20260818, status: "draft", value: 390000, lastUpdated: "3 days ago" },
  { id: "BP-021", name: "CBD Office Tower — Levels 14–22", number: "BP-021", gc: "Pinnacle Property Group", location: "Sydney NSW", estimator: "Tom Chen", bidDue: "—", bidDueRaw: 0, status: "submitted", value: 740000, lastUpdated: "1 week ago" },
  { id: "BP-028", name: "Woolworths Distribution Hub — Stage 3", number: "BP-028", gc: "John Holland Group", location: "Eastern Creek NSW", estimator: "Sarah Reynolds", bidDue: "12 Aug 2026", bidDueRaw: 20260812, status: "drawings", value: 715000, lastUpdated: "5 days ago" },
  { id: "BP-020", name: "Suburb Retail Strip Upgrade", number: "BP-020", gc: "Main Street Retail", location: "Hurstville NSW", estimator: "Sarah Reynolds", bidDue: "—", bidDueRaw: 0, status: "lost", value: 67000, lastUpdated: "2 weeks ago" },
  { id: "BP-019", name: "Airport Terminal Expansion", number: "BP-019", gc: "City Airport Authority", location: "Mascot NSW", estimator: "James Mitchell", bidDue: "—", bidDueRaw: 0, status: "won", value: 1250000, lastUpdated: "2 weeks ago" },
  { id: "BP-018", name: "Bunnings Warehouse — Penrith", number: "BP-018", gc: "Bunnings Group Ltd", location: "Penrith NSW", estimator: "Tom Chen", bidDue: "—", bidDueRaw: 0, status: "won", value: 345000, lastUpdated: "1 month ago" },
  { id: "BP-017", name: "Gosford TAFE Campus Upgrade", number: "BP-017", gc: "NSW TAFE Commission", location: "Gosford NSW", estimator: "Sarah Reynolds", bidDue: "—", bidDueRaw: 0, status: "lost", value: 520000, lastUpdated: "1 month ago" },
];

const PAGE_SIZE = 8;

interface ProjectsListProps {
  onOpenProject?: (id: string) => void;
  onNewProject?: () => void;
}

export function ProjectsList({ onOpenProject, onNewProject }: ProjectsListProps) {
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<Lifecycle | "all">("active");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [estimatorFilter, setEstimatorFilter] = useState("all");
  const [sortCol, setSortCol] = useState<keyof Project | null>("bidDueRaw");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>("comfortable");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [listState] = useState<"populated" | "empty" | "error">("populated");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  function toggleSort(col: keyof Project) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let rows = ALL_PROJECTS.filter((p) => {
      const q = search.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.number.toLowerCase().includes(q) && !p.gc.toLowerCase().includes(q)) return false;
      if (lifecycle !== "all" && LIFECYCLE_OF[p.status] !== lifecycle) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (estimatorFilter !== "all" && p.estimator !== estimatorFilter) return false;
      return true;
    });
    if (sortCol && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [search, lifecycle, statusFilter, estimatorFilter, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allOnPageSelected) {
      const next = new Set(selected);
      pageRows.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageRows.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const rowH = density === "compact" ? 40 : 52;

  function SortIcon({ col }: { col: keyof Project }) {
    if (sortCol !== col) return <ChevronsUpDown size={12} style={{ color: "#D1D5DB" }} />;
    return sortDir === "asc" ? <ChevronUp size={12} style={{ color: "#2563EB" }} /> : <ChevronDown size={12} style={{ color: "#2563EB" }} />;
  }

  return (
    <div style={{ padding: 24, backgroundColor: "#F6F7F9", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#111827" }}>Projects</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            {lifecycle !== "all" ? ` · ${LIFECYCLE_CFG[lifecycle].label}` : ""}
            {statusFilter !== "all" ? ` · ${STATUS_CFG[statusFilter].label}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => toast.success("Projects exported", { description: "projects_export.csv downloaded." })} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}>
            <Download size={14} />
            Export
          </button>
          <button
            onClick={onNewProject}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white" }}
          >
            <Plus size={14} />
            New project
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search projects…"
              style={{ width: "100%", height: 34, paddingLeft: 32, paddingRight: 12, borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Lifecycle tabs — Active is the default view */}
          <div style={{ display: "flex", border: "1px solid #D1D5DB", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
            {LIFECYCLE_ORDER.map((lc) => {
              const active = lifecycle === lc;
              const count = lc === "all" ? ALL_PROJECTS.length : ALL_PROJECTS.filter((p) => LIFECYCLE_OF[p.status] === lc).length;
              return (
                <button
                  key={lc}
                  onClick={() => { setLifecycle(lc); setStatusFilter("all"); setPage(1); }}
                  style={{
                    height: 34, padding: "0 11px", border: "none",
                    background: active ? LIFECYCLE_CFG[lc].bg : "white",
                    color: active ? LIFECYCLE_CFG[lc].color : "#6B7280",
                    fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                  }}
                >
                  {LIFECYCLE_CFG[lc].label}
                  <span style={{ fontSize: 10, color: active ? LIFECYCLE_CFG[lc].color : "#9CA3AF", opacity: 0.75 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Detailed status filter — inactive and completed work stays searchable */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as Status | "all"); setPage(1); }}
            style={{ height: 34, padding: "0 28px 0 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#374151", backgroundColor: "white", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Estimator filter */}
          <select
            value={estimatorFilter}
            onChange={(e) => { setEstimatorFilter(e.target.value); setPage(1); }}
            style={{ height: 34, padding: "0 28px 0 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#374151", backgroundColor: "white", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            <option value="all">All estimators</option>
            {["James Mitchell", "Sarah Reynolds", "Tom Chen"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(search || lifecycle !== "active" || statusFilter !== "all" || estimatorFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setLifecycle("active"); setStatusFilter("all"); setEstimatorFilter("all"); }}
              style={{ display: "flex", alignItems: "center", gap: 4, height: 34, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 12, color: "#6B7280" }}
            >
              <X size={12} />
              Clear
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Density toggle */}
          <div style={{ display: "flex", gap: 2, border: "1px solid #E5E7EB", borderRadius: 6, overflow: "hidden" }}>
            {([["comfortable", AlignJustify], ["compact", Rows3]] as const).map(([d, Icon]) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: density === d ? "#EFF6FF" : "white", border: "none", cursor: "pointer", color: density === d ? "#2563EB" : "#9CA3AF" }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #E5E7EB", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#2563EB" }}>{selected.size} selected</span>
            <div style={{ width: 1, height: 16, backgroundColor: "#BFDBFE" }} />
            {[["Duplicate", Copy], ["Archive", Archive], ["Delete", Trash2]].map(([label, Icon]) => (
              <button
                key={label as string}
                onClick={() => {
                  const n = selected.size;
                  if (label === "Delete") {
                    if (!confirm(`Delete ${n} project${n > 1 ? "s" : ""}? This cannot be undone.`)) return;
                    toast.success(`${n} project${n > 1 ? "s" : ""} deleted`);
                  } else if (label === "Archive") {
                    toast.success(`${n} project${n > 1 ? "s" : ""} archived`);
                  } else {
                    toast.success(`${n} project${n > 1 ? "s" : ""} duplicated`);
                  }
                  setSelected(new Set());
                }}
                style={{ display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px", border: "1px solid #BFDBFE", borderRadius: 5, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: label === "Delete" ? "#DC2626" : "#1D4ED8" }}
              >
                <Icon size={12} />
                {label as string}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setSelected(new Set())}
              style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <X size={12} />
              Clear selection
            </button>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                <th style={{ width: 40, padding: "0 12px" }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    style={{ accentColor: "#2563EB", cursor: "pointer" }}
                  />
                </th>
                {([
                  ["name", "Project name"],
                  ["number", "No."],
                  ["gc", "General contractor"],
                  ["location", "Location"],
                  ["estimator", "Estimator"],
                  ["bidDue", "Bid due"],
                  ["status", "Status"],
                  ["value", "Value"],
                  ["lastUpdated", "Last updated"],
                ] as [keyof Project, string][]).map(([col, label]) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {label}
                      <SortIcon col={col} />
                    </div>
                  </th>
                ))}
                <th style={{ width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 48 }}>
                    <FolderOpen size={28} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#6B7280" }}>No projects match your search</p>
                    <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                pageRows.map((p) => {
                  const isSelected = selected.has(p.id);
                  const cfg = STATUS_CFG[p.status];
                  const initials = p.estimator.split(" ").map((w) => w[0]).join("").slice(0, 2);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: isSelected ? "#F0F9FF" : "transparent", height: rowH }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#F0F9FF" : "transparent"; }}
                    >
                      <td style={{ padding: "0 12px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: "#2563EB", cursor: "pointer" }}
                        />
                      </td>
                      <td
                        style={{ padding: "0 12px", cursor: "pointer" }}
                        onClick={() => onOpenProject?.(p.id)}
                      >
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#6B7280" }}>{p.number}</span>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 13, color: "#4B5563", whiteSpace: "nowrap" }}>{p.gc}</span>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 13, color: "#4B5563", whiteSpace: "nowrap" }}>{p.location}</span>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: AVATAR_COLORS[p.estimator] ?? "#6B7280", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "white" }}>
                            {initials}
                          </span>
                          <span style={{ fontSize: 13, color: "#4B5563", whiteSpace: "nowrap" }}>{p.estimator.split(" ")[0]} {p.estimator.split(" ")[1]?.[0]}.</span>
                        </div>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: p.bidDue === "—" ? "#9CA3AF" : "#111827", whiteSpace: "nowrap" }}>{p.bidDue}</span>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "#111827", fontWeight: 500, whiteSpace: "nowrap" }}>
                          ${p.value.toLocaleString("en-AU")}
                        </span>
                      </td>
                      <td style={{ padding: "0 12px" }}>
                        <span style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{p.lastUpdated}</span>
                      </td>
                      <td style={{ padding: "0 10px", position: "relative" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                          style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid transparent", borderRadius: 5, backgroundColor: "transparent", cursor: "pointer", color: "#9CA3AF" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F3F4F6"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpenId === p.id && (
                          <>
                            <div onClick={() => setMenuOpenId(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                            <div style={{ position: "absolute", right: 8, top: "100%", zIndex: 41, background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}>
                              {[
                                { label: "Open project", action: () => { onOpenProject?.(p.id); setMenuOpenId(null); } },
                                { label: "Duplicate", action: () => { toast.success(`${p.name} duplicated`); setMenuOpenId(null); } },
                                { label: "Archive", action: () => { toast.success(`${p.name} archived`); setMenuOpenId(null); } },
                                { label: "Delete project", action: () => { if (confirm(`Delete "${p.name}"?`)) { toast.success("Project deleted"); } setMenuOpenId(null); }, danger: true },
                              ].map((item) => (
                                <button key={item.label} onClick={item.action} style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "white", fontSize: 12, color: (item as { danger?: boolean }).danger ? "#DC2626" : "#374151", cursor: "pointer" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = (item as { danger?: boolean }).danger ? "#FEF2F2" : "#F9FAFB"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}>
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#D1D5DB" : "#374151" }}
              >
                <ChevronLeft size={14} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${page === i + 1 ? "#2563EB" : "#D1D5DB"}`, borderRadius: 6, backgroundColor: page === i + 1 ? "#2563EB" : "white", cursor: "pointer", fontSize: 13, fontWeight: page === i + 1 ? 600 : 400, color: page === i + 1 ? "white" : "#374151" }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#D1D5DB" : "#374151" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
