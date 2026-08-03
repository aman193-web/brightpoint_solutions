import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Check,
  ChevronRight,
  MoreHorizontal,
  Grid3X3,
  List,
  Edit2,
  Wand2,
  AlertTriangle,
  CheckCircle,
  X,
  LayoutGrid,
  Filter,
  Download,
  SlidersHorizontal,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  Info,
  Copy,
  Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Confidence = "high" | "medium" | "low" | "needs-review";
type Discipline =
  | "cover" | "architectural" | "electrical" | "lighting" | "power"
  | "fire-alarm" | "low-voltage" | "mechanical" | "plumbing" | "structural"
  | "demolition" | "details" | "schedules" | "unknown";
type ViewMode = "list" | "grid";
type SheetStatus = "processed" | "error" | "needs-review";

interface AIValue<T> {
  value: T;
  confidence: Confidence;
  ai: boolean;
  sourceText?: string;
}

interface DrawingSheet {
  id: string;
  pageIndex: number;
  fileName: string;
  sheetNumber: AIValue<string>;
  title: AIValue<string>;
  discipline: AIValue<Discipline>;
  scale: AIValue<string>;
  included: boolean;
  status: SheetStatus;
  hasDuplicateNumber?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DISCIPLINE_CFG: Record<Discipline, { label: string; color: string; bg: string; border: string }> = {
  cover:        { label: "Cover",        color: "#374151", bg: "#F9FAFB", border: "#D1D5DB" },
  architectural:{ label: "Architectural",color: "#374151", bg: "#F3F4F6", border: "#D1D5DB" },
  electrical:   { label: "Electrical",   color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  lighting:     { label: "Lighting",     color: "#5B21B6", bg: "#F5F3FF", border: "#C4B5FD" },
  power:        { label: "Power",        color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  "fire-alarm": { label: "Fire alarm",   color: "#991B1B", bg: "#FEF2F2", border: "#FCA5A5" },
  "low-voltage":{ label: "Low voltage",  color: "#065F46", bg: "#ECFDF5", border: "#6EE7B7" },
  mechanical:   { label: "Mechanical",   color: "#0C4A6E", bg: "#F0F9FF", border: "#BAE6FD" },
  plumbing:     { label: "Plumbing",     color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
  structural:   { label: "Structural",   color: "#78350F", bg: "#FFF7ED", border: "#FED7AA" },
  demolition:   { label: "Demolition",   color: "#374151", bg: "#F3F4F6", border: "#D1D5DB" },
  details:      { label: "Details",      color: "#374151", bg: "#F9FAFB", border: "#D1D5DB" },
  schedules:    { label: "Schedules",    color: "#374151", bg: "#F9FAFB", border: "#D1D5DB" },
  unknown:      { label: "Unknown",      color: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB" },
};

const CONFIDENCE_CFG: Record<Confidence, { label: string; color: string; bg: string }> = {
  high:           { label: "High",         color: "#16A34A", bg: "#F0FDF4" },
  medium:         { label: "Medium",       color: "#D97706", bg: "#FFFBEB" },
  low:            { label: "Low",          color: "#DC2626", bg: "#FEF2F2" },
  "needs-review": { label: "Needs review", color: "#7C3AED", bg: "#F5F3FF" },
};

const ALL_DISCIPLINES = Object.entries(DISCIPLINE_CFG).map(([k, v]) => ({ value: k as Discipline, label: v.label }));

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_SHEETS: DrawingSheet[] = [
  {
    id: "s1", pageIndex: 1, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-601", confidence: "high", ai: true, sourceText: "E-601" },
    title: { value: "Cover Sheet", confidence: "high", ai: true, sourceText: "COVER SHEET" },
    discipline: { value: "cover", confidence: "high", ai: true },
    scale: { value: "N/A", confidence: "high", ai: true, sourceText: "NOT TO SCALE" },
    included: true, status: "processed",
  },
  {
    id: "s2", pageIndex: 2, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-001", confidence: "high", ai: true, sourceText: "E-001" },
    title: { value: "Electrical Site Plan", confidence: "high", ai: true, sourceText: "ELECTRICAL SITE PLAN" },
    discipline: { value: "electrical", confidence: "high", ai: true },
    scale: { value: "1:100", confidence: "high", ai: true, sourceText: "1:100" },
    included: true, status: "processed",
  },
  {
    id: "s3", pageIndex: 3, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-101", confidence: "high", ai: true, sourceText: "E-101" },
    title: { value: "Lighting — Level 1", confidence: "high", ai: true, sourceText: "LIGHTING PLAN - LEVEL 1" },
    discipline: { value: "lighting", confidence: "high", ai: true },
    scale: { value: "1:50", confidence: "high", ai: true, sourceText: "1:50" },
    included: true, status: "processed",
  },
  {
    id: "s4", pageIndex: 4, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-102", confidence: "medium", ai: true, sourceText: "E102" },
    title: { value: "Lighting — Level 2", confidence: "medium", ai: true, sourceText: "LTNG LEVEL 2" },
    discipline: { value: "lighting", confidence: "high", ai: true },
    scale: { value: "1:50", confidence: "medium", ai: true, sourceText: "SCALE 1:50 APPROX" },
    included: true, status: "processed",
  },
  {
    id: "s5", pageIndex: 5, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-201", confidence: "high", ai: true, sourceText: "E-201" },
    title: { value: "Power — Level 1", confidence: "high", ai: true, sourceText: "POWER PLAN - LEVEL 1" },
    discipline: { value: "power", confidence: "high", ai: true },
    scale: { value: "1:50", confidence: "high", ai: true, sourceText: "1:50" },
    included: true, status: "processed",
  },
  {
    id: "s6", pageIndex: 6, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-202", confidence: "medium", ai: true, sourceText: "E202" },
    title: { value: "Power — Level 2", confidence: "medium", ai: true, sourceText: "POWER LVL 2" },
    discipline: { value: "power", confidence: "high", ai: true },
    scale: { value: "1:100", confidence: "low", ai: true, sourceText: "REFER TO DRAWINGS" },
    included: true, status: "needs-review",
  },
  {
    id: "s7", pageIndex: 7, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-301", confidence: "high", ai: true, sourceText: "E-301" },
    title: { value: "Panel Schedule A", confidence: "high", ai: true, sourceText: "PANEL SCHEDULE A" },
    discipline: { value: "schedules", confidence: "high", ai: true },
    scale: { value: "N/A", confidence: "high", ai: true, sourceText: "N/A" },
    included: true, status: "processed",
  },
  {
    id: "s8", pageIndex: 8, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-302", confidence: "high", ai: true, sourceText: "E-302" },
    title: { value: "Panel Schedule B", confidence: "medium", ai: true, sourceText: "PANEL SCHED B" },
    discipline: { value: "schedules", confidence: "high", ai: true },
    scale: { value: "N/A", confidence: "high", ai: true, sourceText: "N/A" },
    included: true, status: "processed",
  },
  {
    id: "s9", pageIndex: 9, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-401", confidence: "high", ai: true, sourceText: "E-401" },
    title: { value: "Fire Alarm Riser Diagram", confidence: "high", ai: true, sourceText: "FIRE ALARM RISER DIAGRAM" },
    discipline: { value: "fire-alarm", confidence: "high", ai: true },
    scale: { value: "1:100", confidence: "medium", ai: true, sourceText: "DIAGRAMMATIC" },
    included: true, status: "processed",
  },
  {
    id: "s10", pageIndex: 10, fileName: "Dollar-Tree-1842-E-Drawings-Rev2.pdf",
    sheetNumber: { value: "E-501", confidence: "medium", ai: true, sourceText: "E501" },
    title: { value: "Low Voltage Layout", confidence: "medium", ai: true, sourceText: "LV LAYOUT" },
    discipline: { value: "low-voltage", confidence: "medium", ai: true },
    scale: { value: "1:50", confidence: "medium", ai: true, sourceText: "1:50 NOM." },
    included: true, status: "processed",
  },
  {
    id: "s11", pageIndex: 1, fileName: "DT1842-Architectural-Drawings.pdf",
    sheetNumber: { value: "A-101", confidence: "low", ai: true, sourceText: "A101" },
    title: { value: "Architectural Floor Plan", confidence: "medium", ai: true, sourceText: "FLOOR PLAN" },
    discipline: { value: "architectural", confidence: "low", ai: true },
    scale: { value: "1:100", confidence: "medium", ai: true, sourceText: "1:100" },
    included: false, status: "needs-review",
  },
  {
    id: "s12", pageIndex: 2, fileName: "DT1842-Architectural-Drawings.pdf",
    sheetNumber: { value: "", confidence: "needs-review", ai: true, sourceText: "" },
    title: { value: "Specification Division 26 Electrical", confidence: "needs-review", ai: true, sourceText: "DIV 26 - ELEC" },
    discipline: { value: "unknown", confidence: "needs-review", ai: true },
    scale: { value: "N/A", confidence: "high", ai: true, sourceText: "N/A" },
    included: false, status: "needs-review",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AIBadge({ confidence }: { confidence: Confidence }) {
  const cfg = CONFIDENCE_CFG[confidence];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>
      <Sparkles size={8} />
      {cfg.label}
    </span>
  );
}

function DisciplinePill({ discipline, onClick }: { discipline: Discipline; onClick?: () => void }) {
  const cfg = DISCIPLINE_CFG[discipline];
  return (
    <button
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: 4, cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap" }}
    >
      {cfg.label}
      {onClick && <ChevronDown size={10} />}
    </button>
  );
}

function DrawingThumb({ discipline, sheetNumber, width = 56, height = 42 }: { discipline: Discipline; sheetNumber: string; width?: number; height?: number }) {
  const cfg = DISCIPLINE_CFG[discipline];
  return (
    <svg width={width} height={height} style={{ borderRadius: 4, border: "1px solid #E5E7EB", flexShrink: 0, display: "block" }} viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill={cfg.bg} />
      <rect y={height * 0.72} width={width} height={height * 0.28} fill="white" opacity={0.85} />
      <line x1={4} y1={8} x2={width - 4} y2={8} stroke={cfg.border} strokeWidth={0.7} />
      <line x1={4} y1={13} x2={width * 0.6} y2={13} stroke={cfg.border} strokeWidth={0.7} />
      <line x1={4} y1={18} x2={width - 8} y2={18} stroke={cfg.border} strokeWidth={0.5} />
      <line x1={4} y1={23} x2={width * 0.8} y2={23} stroke={cfg.border} strokeWidth={0.5} />
      <line x1={4} y1={28} x2={width - 4} y2={28} stroke={cfg.border} strokeWidth={0.5} />
      <line x1={0} y1={height * 0.72} x2={width} y2={height * 0.72} stroke={cfg.border} strokeWidth={0.7} />
      <text x={3} y={height - 4} style={{ fontSize: 7, fill: cfg.color, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{sheetNumber || "?"}</text>
    </svg>
  );
}

function LargeThumb({ discipline, sheetNumber, highlightField }: { discipline: Discipline; sheetNumber: string; highlightField?: "sheetNumber" | "title" | "discipline" | "scale" }) {
  const cfg = DISCIPLINE_CFG[discipline];
  const W = 280, H = 210;

  const highlights: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
    sheetNumber: { x: 8, y: 150, w: 80, h: 16, label: "Sheet no." },
    title:       { x: 8, y: 130, w: 200, h: 14, label: "Title" },
    scale:       { x: 200, y: 150, w: 70, h: 14, label: "Scale" },
    discipline:  { x: 0, y: 0, w: W, h: 40, label: "Discipline area" },
  };

  const hl = highlightField ? highlights[highlightField] : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 6, border: "1px solid #E5E7EB", display: "block", backgroundColor: cfg.bg }}>
      {/* Background */}
      <rect width={W} height={H} fill={cfg.bg} />
      {/* Content lines */}
      <rect y={H * 0.7} width={W} height={H * 0.3} fill="white" opacity={0.9} />
      {[20, 32, 44, 56, 68, 80, 92, 104].map((y) => (
        <line key={y} x1={10} y1={y} x2={W - 10} y2={y} stroke={cfg.border} strokeWidth={0.8} />
      ))}
      {[14, 26, 38, 50].map((y) => (
        <line key={y} x1={10} y1={y} x2={W * 0.5 + Math.random() * 60} y2={y} stroke={cfg.border} strokeWidth={0.5} opacity={0.6} />
      ))}
      {/* Title block */}
      <line x1={0} y1={H * 0.7} x2={W} y2={H * 0.7} stroke={cfg.border} strokeWidth={1} />
      <line x1={W * 0.35} y1={H * 0.7} x2={W * 0.35} y2={H} stroke={cfg.border} strokeWidth={0.7} />
      <line x1={W * 0.65} y1={H * 0.7} x2={W * 0.65} y2={H} stroke={cfg.border} strokeWidth={0.7} />
      {/* Text in title block */}
      <text x={6} y={H * 0.7 + 12} style={{ fontSize: 7, fill: cfg.color, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{sheetNumber || "?"}</text>
      <text x={W * 0.37} y={H * 0.7 + 12} style={{ fontSize: 6, fill: "#374151", fontFamily: "sans-serif" }}>Dollar Tree Store 1842</text>
      <text x={W * 0.67} y={H * 0.7 + 12} style={{ fontSize: 6, fill: "#374151", fontFamily: "sans-serif" }}>Brightpoint</text>
      {/* Highlight region */}
      {hl && (
        <>
          <rect x={hl.x} y={hl.y} width={hl.w} height={hl.h} fill="#2563EB" opacity={0.15} rx={2} />
          <rect x={hl.x} y={hl.y} width={hl.w} height={hl.h} fill="none" stroke="#2563EB" strokeWidth={1.5} rx={2} />
        </>
      )}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DrawingsOrganizeProps {
  onContinue: () => void;
  onBack: () => void;
}

export function DrawingsOrganize({ onContinue, onBack }: DrawingsOrganizeProps) {
  const [sheets, setSheets] = useState<DrawingSheet[]>(INITIAL_SHEETS);
  const [selectedId, setSelectedId] = useState<string | null>("s6");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | "all">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence | "all">("all");
  const [showIncludedOnly, setShowIncludedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<"sheetNumber" | "title" | "discipline" | "scale" | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [highlightField, setHighlightField] = useState<"sheetNumber" | "title" | "discipline" | "scale" | undefined>(undefined);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);

  const selectedSheet = sheets.find((s) => s.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    return sheets.filter((s) => {
      if (showIncludedOnly && !s.included) return false;
      if (disciplineFilter !== "all" && s.discipline.value !== disciplineFilter) return false;
      if (confidenceFilter !== "all") {
        const worst = worstConfidence(s);
        if (worst !== confidenceFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!s.sheetNumber.value.toLowerCase().includes(q) && !s.title.value.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sheets, search, disciplineFilter, confidenceFilter, showIncludedOnly]);

  function worstConfidence(s: DrawingSheet): Confidence {
    const order: Confidence[] = ["needs-review", "low", "medium", "high"];
    const confidences = [s.sheetNumber.confidence, s.title.confidence, s.discipline.confidence, s.scale.confidence];
    for (const c of order) {
      if (confidences.includes(c)) return c;
    }
    return "high";
  }

  function toggleInclude(id: string) {
    setSheets((prev) => prev.map((s) => s.id === id ? { ...s, included: !s.included } : s));
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkSetInclude(included: boolean) {
    setSheets((prev) => prev.map((s) => selectedIds.has(s.id) ? { ...s, included } : s));
    setSelectedIds(new Set());
  }

  function updateField(id: string, field: "sheetNumber" | "title" | "discipline" | "scale", value: string) {
    setSheets((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, [field]: { ...s[field], value, ai: false, confidence: "high" as Confidence } }
          : s
      )
    );
  }

  function commitEdit() {
    if (!selectedId || !editingField) return;
    updateField(selectedId, editingField, editingValue);
    setEditingField(null);
    setEditingValue("");
  }

  const needsReviewCount = sheets.filter((s) => s.status === "needs-review").length;
  const includedCount = sheets.filter((s) => s.included).length;
  const totalPages = sheets.reduce((a, s) => a + 1, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#F6F7F9" }}>
      {/* Toolbar */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E5E7EB", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sheet number or title…"
            style={{ height: 32, paddingLeft: 28, paddingRight: 10, width: 220, borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Discipline filter */}
        <select
          value={disciplineFilter}
          onChange={(e) => setDisciplineFilter(e.target.value as Discipline | "all")}
          style={{ height: 32, padding: "0 24px 0 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#374151", backgroundColor: "white", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center", cursor: "pointer" }}
        >
          <option value="all">All disciplines</option>
          {ALL_DISCIPLINES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>

        {/* Confidence filter */}
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value as Confidence | "all")}
          style={{ height: 32, padding: "0 24px 0 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#374151", backgroundColor: "white", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center", cursor: "pointer" }}
        >
          <option value="all">All confidence</option>
          <option value="high">High confidence</option>
          <option value="medium">Medium confidence</option>
          <option value="low">Low confidence</option>
          <option value="needs-review">Needs review</option>
        </select>

        {/* Show included only */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4B5563", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={showIncludedOnly} onChange={(e) => setShowIncludedOnly(e.target.checked)} style={{ accentColor: "#2563EB" }} />
          Included only
        </label>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
          {includedCount} of {totalPages} included
          {needsReviewCount > 0 && (
            <span style={{ marginLeft: 8, color: "#D97706", fontWeight: 500 }}>· {needsReviewCount} need review</span>
          )}
        </span>

        {/* View toggle */}
        <div style={{ display: "flex", border: "1px solid #E5E7EB", borderRadius: 6, overflow: "hidden" }}>
          {([["list", List], ["grid", LayoutGrid]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: viewMode === mode ? "#EFF6FF" : "white", border: "none", cursor: "pointer", color: viewMode === mode ? "#2563EB" : "#9CA3AF" }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Continue */}
        <button
          onClick={onContinue}
          style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 16px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white" }}
        >
          Continue to workspace
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ backgroundColor: "#EFF6FF", borderBottom: "1px solid #BFDBFE", padding: "7px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#2563EB" }}>{selectedIds.size} selected</span>
          <div style={{ width: 1, height: 14, backgroundColor: "#BFDBFE" }} />
          <button onClick={() => bulkSetInclude(true)} style={{ display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", border: "1px solid #BFDBFE", borderRadius: 4, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#1D4ED8" }}>
            <Eye size={12} />Include all
          </button>
          <button onClick={() => bulkSetInclude(false)} style={{ display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", border: "1px solid #BFDBFE", borderRadius: 4, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#1D4ED8" }}>
            <EyeOff size={12} />Exclude all
          </button>
          <button onClick={() => toast.info('Rename pattern — enter a naming pattern in the dialog')} style={{ display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", border: "1px solid #BFDBFE", borderRadius: 4, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#1D4ED8" }}>
            <Edit2 size={12} />Rename pattern
          </button>
          <button onClick={() => toast.info('Select a discipline for the selected sheets')} style={{ display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", border: "1px solid #BFDBFE", borderRadius: 4, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#1D4ED8" }}>
            <SlidersHorizontal size={12} />Change discipline
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <X size={12} />Clear
          </button>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Table / Grid */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {viewMode === "list" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: "white", borderBottom: "2px solid #E5E7EB", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ width: 36, padding: "0 0 0 12px" }}>
                    <input type="checkbox" style={{ accentColor: "#2563EB" }} onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filtered.map((s) => s.id)));
                      else setSelectedIds(new Set());
                    }} />
                  </th>
                  <th style={{ width: 70, padding: "9px 8px 9px 4px" }} />
                  {["Sheet no.", "Drawing title", "Discipline", "Scale", "Confidence", "Incl."].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 10px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sheet) => {
                  const isSelected = selectedId === sheet.id;
                  const isChecked = selectedIds.has(sheet.id);
                  const worst = worstConfidence(sheet);
                  const needsReview = sheet.status === "needs-review";

                  return (
                    <tr
                      key={sheet.id}
                      onClick={() => { setSelectedId(sheet.id); setEditingField(null); }}
                      style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: isSelected ? "#EFF6FF" : isChecked ? "#F0F9FF" : "white", cursor: "pointer", height: 52 }}
                      onMouseEnter={(e) => { if (!isSelected && !isChecked) e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#EFF6FF" : isChecked ? "#F0F9FF" : "white"; }}
                    >
                      <td style={{ padding: "0 0 0 12px" }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSelectRow(sheet.id)} style={{ accentColor: "#2563EB" }} />
                      </td>
                      <td style={{ padding: "0 8px 0 4px" }}>
                        <DrawingThumb discipline={sheet.discipline.value} sheetNumber={sheet.sheetNumber.value} width={56} height={42} />
                      </td>
                      <td style={{ padding: "0 10px" }}>
                        <div>
                          <p style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "#111827", fontWeight: 600 }}>
                            {sheet.sheetNumber.value || <span style={{ color: "#9CA3AF", fontWeight: 400 }}>Missing</span>}
                          </p>
                          {sheet.sheetNumber.ai && (
                            <div style={{ marginTop: 2 }}><AIBadge confidence={sheet.sheetNumber.confidence} /></div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0 10px", maxWidth: 240 }}>
                        <p style={{ fontSize: 13, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sheet.title.value || <span style={{ color: "#9CA3AF" }}>Unknown</span>}
                        </p>
                        {sheet.title.ai && (
                          <div style={{ marginTop: 2 }}><AIBadge confidence={sheet.title.confidence} /></div>
                        )}
                      </td>
                      <td style={{ padding: "0 10px", whiteSpace: "nowrap" }}>
                        <DisciplinePill discipline={sheet.discipline.value} />
                        {sheet.discipline.ai && (
                          <div style={{ marginTop: 2 }}><AIBadge confidence={sheet.discipline.confidence} /></div>
                        )}
                      </td>
                      <td style={{ padding: "0 10px", whiteSpace: "nowrap" }}>
                        <p style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "#111827" }}>{sheet.scale.value}</p>
                        {sheet.scale.ai && (
                          <div style={{ marginTop: 2 }}><AIBadge confidence={sheet.scale.confidence} /></div>
                        )}
                      </td>
                      <td style={{ padding: "0 10px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: CONFIDENCE_CFG[worst].color, backgroundColor: CONFIDENCE_CFG[worst].bg, padding: "3px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                          {worst === "needs-review" ? <AlertTriangle size={10} /> : worst === "high" ? <Check size={10} /> : null}
                          {CONFIDENCE_CFG[worst].label}
                        </span>
                      </td>
                      <td style={{ padding: "0 10px" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleInclude(sheet.id)}
                          style={{ width: 28, height: 18, borderRadius: 9, backgroundColor: sheet.included ? "#2563EB" : "#D1D5DB", border: "none", cursor: "pointer", position: "relative", transition: "background-color 150ms", flexShrink: 0 }}
                          title={sheet.included ? "Exclude" : "Include"}
                        >
                          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "white", position: "absolute", top: 2, left: sheet.included ? 12 : 2, transition: "left 150ms", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                        </button>
                      </td>
                      <td style={{ padding: "0 8px", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setRowMenuId(rowMenuId === sheet.id ? null : sheet.id)}
                          style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", borderRadius: 4 }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {rowMenuId === sheet.id && (
                          <>
                            <div onClick={() => setRowMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                            <div style={{ position: "absolute", right: 8, top: 28, zIndex: 41, backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 180, overflow: "hidden" }}>
                              {[
                                { label: "Preview sheet", action: () => toast.info(`Previewing ${sheet.sheetNumber.value || sheet.title.value}`) },
                                { label: "Rename", action: () => toast.info(`Rename sheet ${sheet.sheetNumber.value || sheet.title.value}`) },
                                { label: "Change discipline", action: () => toast.info(`Change discipline for ${sheet.sheetNumber.value || sheet.title.value}`) },
                                { label: "Exclude from takeoff", action: () => toast.info(`${sheet.sheetNumber.value || sheet.title.value} excluded from takeoff`) },
                                { label: "Delete", action: () => toast.error(`Delete ${sheet.sheetNumber.value || sheet.title.value}`) },
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  onClick={() => { item.action(); setRowMenuId(null); }}
                                  style={{ display: "block", width: "100%", padding: "8px 14px", fontSize: 13, color: item.label === "Delete" ? "#DC2626" : "#111827", textAlign: "left", background: "none", border: "none", cursor: "pointer", borderBottom: item.label === "Exclude from takeoff" ? "1px solid #E5E7EB" : "none" }}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            // Grid view
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: 16 }}>
              {filtered.map((sheet) => {
                const isSelected = selectedId === sheet.id;
                const worst = worstConfidence(sheet);
                return (
                  <div
                    key={sheet.id}
                    onClick={() => setSelectedId(sheet.id)}
                    style={{ backgroundColor: "white", border: `2px solid ${isSelected ? "#2563EB" : "#E5E7EB"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "border-color 150ms" }}
                  >
                    {/* Thumbnail area */}
                    <div style={{ backgroundColor: DISCIPLINE_CFG[sheet.discipline.value].bg, padding: 12, display: "flex", justifyContent: "center" }}>
                      <DrawingThumb discipline={sheet.discipline.value} sheetNumber={sheet.sheetNumber.value} width={100} height={75} />
                    </div>
                    <div style={{ padding: "10px 10px 10px" }}>
                      <p style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                        {sheet.sheetNumber.value || "—"}
                      </p>
                      <p style={{ fontSize: 12, color: "#4B5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
                        {sheet.title.value || "Unknown"}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <DisciplinePill discipline={sheet.discipline.value} />
                        <AIBadge confidence={worst} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "IBM Plex Mono, monospace" }}>{sheet.scale.value}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleInclude(sheet.id); }}
                          style={{ width: 24, height: 14, borderRadius: 7, backgroundColor: sheet.included ? "#2563EB" : "#D1D5DB", border: "none", cursor: "pointer", position: "relative" }}
                        >
                          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "white", position: "absolute", top: 2, left: sheet.included ? 12 : 2, transition: "left 120ms" }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right preview panel */}
        {selectedSheet && (
          <div style={{ width: 340, borderLeft: "1px solid #E5E7EB", backgroundColor: "white", display: "flex", flexDirection: "column", overflow: "auto", flexShrink: 0 }}>
            {/* Panel header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Page review</span>
              <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2 }}>
                <X size={15} />
              </button>
            </div>

            {/* Thumbnail */}
            <div style={{ padding: 14, borderBottom: "1px solid #F3F4F6" }}>
              <LargeThumb discipline={selectedSheet.discipline.value} sheetNumber={selectedSheet.sheetNumber.value} highlightField={highlightField} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>p.{selectedSheet.pageIndex} · {selectedSheet.fileName}</span>
                {selectedSheet.status === "needs-review" && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", backgroundColor: "#F5F3FF", padding: "1px 6px", borderRadius: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <AlertTriangle size={9} />
                    Needs review
                  </span>
                )}
              </div>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              {/* AI notice */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", backgroundColor: "#F5F3FF", border: "1px solid #C4B5FD", borderRadius: 6 }}>
                <Wand2 size={13} color="#7C3AED" style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "#5B21B6", lineHeight: "15px" }}>
                  All values were detected by AI and require your review. Edit any field to correct it. Corrections are applied immediately.
                </p>
              </div>

              {/* Field: Sheet number */}
              {(["sheetNumber", "title", "discipline", "scale"] as const).map((field) => {
                const fdata = selectedSheet[field];
                const isEditing = editingField === field;
                const labels: Record<string, string> = { sheetNumber: "Sheet number", title: "Drawing title", discipline: "Discipline", scale: "Scale" };
                const isDiscipline = field === "discipline";

                return (
                  <div key={field} onMouseEnter={() => setHighlightField(field)} onMouseLeave={() => setHighlightField(undefined)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{labels[field]}</label>
                      {(fdata as AIValue<string | Discipline>).ai && (
                        <AIBadge confidence={(fdata as AIValue<string | Discipline>).confidence} />
                      )}
                    </div>

                    {isDiscipline ? (
                      <div>
                        <select
                          value={(fdata as AIValue<Discipline>).value}
                          onChange={(e) => updateField(selectedSheet.id, field, e.target.value)}
                          style={{ width: "100%", height: 34, padding: "0 24px 0 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", backgroundColor: "white", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", boxSizing: "border-box" }}
                        >
                          {ALL_DISCIPLINES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                    ) : isEditing ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingField(null); }}
                          autoFocus
                          style={{ flex: 1, height: 34, padding: "0 10px", borderRadius: 6, border: "1px solid #2563EB", fontSize: 13, color: "#111827", outline: "none", fontFamily: field === "sheetNumber" || field === "scale" ? "IBM Plex Mono, monospace" : undefined, boxSizing: "border-box" }}
                        />
                        <button onClick={commitEdit} style={{ width: 34, height: 34, borderRadius: 6, border: "none", backgroundColor: "#2563EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={14} color="white" />
                        </button>
                        <button onClick={() => setEditingField(null)} style={{ width: 34, height: 34, borderRadius: 6, border: "1px solid #D1D5DB", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={13} color="#6B7280" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingField(field); setEditingValue((fdata as AIValue<string>).value); }}
                        style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: 6, border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB", fontSize: 13, color: (fdata as AIValue<string>).value ? "#111827" : "#9CA3AF", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: field === "sheetNumber" || field === "scale" ? "IBM Plex Mono, monospace" : undefined, boxSizing: "border-box" }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(fdata as AIValue<string>).value || (field === "sheetNumber" ? "Missing — click to add" : "Click to edit")}
                        </span>
                        <Edit2 size={12} color="#9CA3AF" style={{ flexShrink: 0 }} />
                      </button>
                    )}

                    {/* Source text */}
                    {(fdata as AIValue<string>).sourceText && (fdata as AIValue<string>).sourceText !== (fdata as AIValue<string>).value && (
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                        Source text: <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#6B7280" }}>"{(fdata as AIValue<string>).sourceText}"</span>
                      </p>
                    )}

                    {/* Low confidence warning */}
                    {(fdata as AIValue<string | Discipline>).confidence === "low" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, padding: "5px 8px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 4 }}>
                        <AlertTriangle size={11} color="#DC2626" />
                        <span style={{ fontSize: 11, color: "#991B1B" }}>Low confidence — please verify before continuing.</span>
                      </div>
                    )}
                    {(fdata as AIValue<string | Discipline>).confidence === "needs-review" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, padding: "5px 8px", backgroundColor: "#F5F3FF", border: "1px solid #C4B5FD", borderRadius: 4 }}>
                        <Wand2 size={11} color="#7C3AED" />
                        <span style={{ fontSize: 11, color: "#5B21B6" }}>AI could not detect this value — manual entry required.</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Include / exclude */}
              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                  Include in workspace
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => updateField(selectedSheet.id, "sheetNumber", selectedSheet.sheetNumber.value) || setSheets((prev) => prev.map((s) => s.id === selectedSheet.id ? { ...s, included: val } : s))}
                      style={{ flex: 1, height: 34, border: `2px solid ${selectedSheet.included === val ? "#2563EB" : "#E5E7EB"}`, borderRadius: 6, backgroundColor: selectedSheet.included === val ? "#EFF6FF" : "white", cursor: "pointer", fontSize: 13, fontWeight: selectedSheet.included === val ? 600 : 400, color: selectedSheet.included === val ? "#2563EB" : "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      {val ? <><Eye size={13} />Include</> : <><EyeOff size={13} />Exclude</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
