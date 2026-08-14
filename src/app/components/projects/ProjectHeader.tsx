import React, { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

/**
 * Project-level header shared by every project-scoped screen
 * (Overview, Drawings, Project Breakdown, Takeoff, Extensions, Bid Builder,
 * Proposal Center).
 *
 * Row 1 — back to Projects, project name, project code, status chip, optional
 *         primary action, overflow menu.
 * Row 2 — project tab strip. Scrolls horizontally below 1024px.
 */

export const PROJECT_TABS = [
  "Overview",
  "Drawings",
  // Classifications are defined before or during takeoff, so it sits before it.
  "Project Breakdown",
  "Takeoff",
  "Extensions",
  "Bid Builder",
  "Proposal Center",
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];

/** Tab → App page id. Kept next to the tab list so routing stays in one place. */
export const TAB_PAGE_MAP: Record<ProjectTab, string> = {
  Overview: "project-detail",
  Drawings: "drawings",
  "Project Breakdown": "project-breakdown",
  Takeoff: "takeoff-workspace",
  Extensions: "pricing",
  "Bid Builder": "bid-builder",
  "Proposal Center": "proposal-center",
};

const PROJECT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  takeoff: { label: "Takeoff in progress", color: "#7C3AED", bg: "#F5F3FF" },
  pricing: { label: "Extensions required", color: "#D97706", bg: "#FFFBEB" },
  bidding: { label: "Bid in progress", color: "#1D4ED8", bg: "#EFF6FF" },
  won: { label: "Won", color: "#16A34A", bg: "#F0FDF4" },
  lost: { label: "Lost", color: "#DC2626", bg: "#FEF2F2" },
  archived: { label: "Archived", color: "#6B7280", bg: "#F3F4F6" },
};

interface ProjectHeaderProps {
  activeTab: ProjectTab;
  onNavigateTab?: (page: string) => void;
  onBack?: () => void;
  /** Optional primary action rendered before the overflow menu. */
  action?: React.ReactNode;
  projectName?: string;
  projectCode?: string;
  projectStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function ProjectHeader({
  activeTab,
  onNavigateTab,
  onBack,
  action,
  projectName = "Dollar Tree Retail Fit-Out — Store 1842",
  projectCode = "BP-025",
  projectStatus = "takeoff",
  onStatusChange,
}: ProjectHeaderProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const status = PROJECT_STATUS_CFG[projectStatus] ?? PROJECT_STATUS_CFG.takeoff;

  const menuItems = [
    { label: "Edit project details", action: () => toast.info("Edit project details") },
    { label: "Duplicate project", action: () => toast.success("Project duplicated") },
    { label: "Mark as won", action: () => { onStatusChange?.("won"); toast.success("Project marked as Won"); } },
    { label: "Mark as lost", action: () => { onStatusChange?.("lost"); toast.info("Project marked as Lost"); } },
    { label: "Archive project", action: () => { onStatusChange?.("archived"); toast.success("Project archived"); } },
  ];

  return (
    <div style={{ backgroundColor: "white", borderBottom: "1px solid #E5E7EB", padding: "0 24px", flexShrink: 0 }}>
      {/* Back + title row */}
      <div style={{ minHeight: 50, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #F3F4F6", flexWrap: "wrap", padding: "8px 0" }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", border: "1px solid #E5E7EB", borderRadius: 5, backgroundColor: "white", cursor: "pointer", fontSize: 12, color: "#6B7280", flexShrink: 0 }}
        >
          <ChevronLeft size={13} />
          Projects
        </button>
        <span style={{ color: "#D1D5DB", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{projectName}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", backgroundColor: "#F3F4F6", padding: "2px 7px", borderRadius: 4, fontFamily: "IBM Plex Mono, monospace" }}>
          {projectCode}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: status.color, backgroundColor: status.bg, padding: "2px 7px", borderRadius: 4 }}>
          {status.label}
        </span>
        <div style={{ flex: 1, minWidth: 8 }} />
        {action}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-label="Project actions"
            style={{ width: 32, height: 32, border: "1px solid #E5E7EB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
          >
            <MoreHorizontal size={15} />
          </button>
          {showMoreMenu && (
            <>
              <div onClick={() => setShowMoreMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 41, background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden" }}>
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setShowMoreMenu(false); }}
                    style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "white", fontSize: 12, color: "#374151", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Project nav tabs */}
      <div className="bp-scroll-x" style={{ display: "flex", gap: 0 }}>
        {PROJECT_TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onNavigateTab?.(TAB_PAGE_MAP[tab])}
              style={{
                height: 40, padding: "0 16px", border: "none", backgroundColor: "transparent", cursor: "pointer",
                fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#2563EB" : "#6B7280",
                borderBottom: active ? "2px solid #2563EB" : "2px solid transparent",
                transition: "color 120ms", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
