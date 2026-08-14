import { useState, useEffect } from "react";
import {
  Check,
  Loader2,
  Clock,
  X,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Zap,
} from "lucide-react";

interface ProcessingStage {
  id: string;
  label: string;
  detail: string;
  status: "waiting" | "active" | "complete" | "failed";
  pagesProcessed?: number;
  totalPages?: number;
}

const INITIAL_STAGES: ProcessingStage[] = [
  { id: "upload", label: "Uploading", detail: "Transferring files to Brightpoint servers", status: "waiting" },
  { id: "read", label: "Reading pages", detail: "Extracting page content from PDFs", status: "waiting", totalPages: 65 },
  { id: "sheet-numbers", label: "Detecting sheet numbers", detail: "Locating sheet identification codes", status: "waiting", totalPages: 65 },
  { id: "titles", label: "Detecting drawing titles", detail: "Reading title blocks and annotations", status: "waiting", totalPages: 65 },
  { id: "disciplines", label: "Detecting disciplines", detail: "Classifying each page by trade", status: "waiting", totalPages: 65 },
  { id: "scales", label: "Detecting page scales", detail: "Identifying drawing scales and calibration data", status: "waiting", totalPages: 65 },
  { id: "workspace", label: "Preparing the takeoff workspace", detail: "Organizing pages and building the review index", status: "waiting" },
];

interface DrawingsProcessingProps {
  onComplete: () => void;
  onBack: () => void;
  projectName?: string;
  /**
   * Rendered inside the Drawings tab rather than as a standalone page. The
   * project is already named by the header above, so the logo strip is dropped
   * and the card sits higher.
   */
  embedded?: boolean;
}

function stageDuration(id: string) {
  const map: Record<string, number> = {
    upload: 1800,
    read: 2200,
    "sheet-numbers": 2000,
    titles: 1600,
    disciplines: 2400,
    scales: 1800,
    workspace: 1200,
  };
  return map[id] ?? 1500;
}

export function DrawingsProcessing({ onComplete, onBack, projectName = "Dollar Tree Retail Fit-Out — Store 1842", embedded = false }: DrawingsProcessingProps) {
  const [stages, setStages] = useState<ProcessingStage[]>(INITIAL_STAGES);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showLeaveNotice, setShowLeaveNotice] = useState(false);

  const activeStage = stages[activeStageIdx];
  const allComplete = stages.every((s) => s.status === "complete");
  const TOTAL_PAGES = 65;

  useEffect(() => {
    if (!isRunning || allComplete) return;

    // Mark current stage active
    setStages((prev) =>
      prev.map((s, i) => (i === activeStageIdx ? { ...s, status: "active" } : s))
    );

    const duration = stageDuration(stages[activeStageIdx]?.id ?? "");

    // Animate page count for stages that process pages
    let pageTimer: ReturnType<typeof setInterval> | null = null;
    if (["read", "sheet-numbers", "titles", "disciplines", "scales"].includes(stages[activeStageIdx]?.id ?? "")) {
      setPageCount(0);
      const increment = Math.ceil(TOTAL_PAGES / (duration / 80));
      pageTimer = setInterval(() => {
        setPageCount((p) => Math.min(p + increment, TOTAL_PAGES));
      }, 80);
    }

    const timer = setTimeout(() => {
      if (pageTimer) clearInterval(pageTimer);
      setPageCount(TOTAL_PAGES);

      setStages((prev) =>
        prev.map((s, i) => (i === activeStageIdx ? { ...s, status: "complete", pagesProcessed: TOTAL_PAGES } : s))
      );

      if (activeStageIdx < stages.length - 1) {
        setActiveStageIdx((i) => i + 1);
      }
    }, duration);

    return () => {
      clearTimeout(timer);
      if (pageTimer) clearInterval(pageTimer);
    };
  }, [activeStageIdx, isRunning]);

  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [allComplete]);

  const completedCount = stages.filter((s) => s.status === "complete").length;
  const overallPct = Math.round((completedCount / stages.length) * 100);

  function StatusIcon({ status }: { status: ProcessingStage["status"] }) {
    if (status === "complete") return <Check size={14} color="white" strokeWidth={2.5} />;
    if (status === "active") return <Loader2 size={13} color="white" className="animate-spin" />;
    if (status === "failed") return <X size={13} color="white" />;
    return null;
  }

  return (
    <div style={{ backgroundColor: "#F6F7F9", minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: embedded ? "28px 24px" : "40px 24px" }}>
      {/* Logo strip — standalone page only; the Drawings tab already names the project. */}
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Brightpoint</span>
          <span style={{ color: "#D1D5DB", margin: "0 4px" }}>·</span>
          <span style={{ fontSize: 14, color: "#6B7280", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName}</span>
        </div>
      )}

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 560, backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {/* Card header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "#111827" }}>Processing drawings</h2>
            {!allComplete && (
              <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "3px 8px", borderRadius: 4 }}>
                {overallPct}%
              </span>
            )}
            {allComplete && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#16A34A" }}>
                <Check size={13} />
                Complete
              </span>
            )}
          </div>

          {/* Overall progress bar */}
          <div style={{ height: 6, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${overallPct}%`, borderRadius: 999, backgroundColor: allComplete ? "#16A34A" : "#2563EB", transition: "width 400ms ease" }} />
          </div>

          {/* Current status */}
          {activeStage && !allComplete && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={13} color="#2563EB" className="animate-spin" />
              <span style={{ fontSize: 13, color: "#4B5563" }}>
                {activeStage.detail}
                {["read", "sheet-numbers", "titles", "disciplines", "scales"].includes(activeStage.id) && (
                  <span style={{ marginLeft: 6, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: "#9CA3AF" }}>
                    {pageCount} / {TOTAL_PAGES} pages
                  </span>
                )}
              </span>
            </div>
          )}
          {allComplete && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={13} color="#16A34A" />
              <span style={{ fontSize: 13, color: "#16A34A" }}>All {TOTAL_PAGES} pages processed. Redirecting to review…</span>
            </div>
          )}
        </div>

        {/* Stages list */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
          {stages.map((stage, i) => {
            const isDone = stage.status === "complete";
            const isActive = stage.status === "active";
            const isWaiting = stage.status === "waiting";
            const isFailed = stage.status === "failed";

            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < stages.length - 1 ? 0 : 0 }}>
                {/* Line + circle */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: isDone ? "#16A34A" : isActive ? "#2563EB" : isFailed ? "#DC2626" : "#E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 300ms",
                    flexShrink: 0,
                  }}>
                    {isWaiting ? (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#D1D5DB" }} />
                    ) : (
                      <StatusIcon status={stage.status} />
                    )}
                  </div>
                  {i < stages.length - 1 && (
                    <div style={{ width: 1, height: 28, backgroundColor: isDone ? "#86EFAC" : "#E5E7EB", transition: "background-color 300ms", marginTop: 2 }} />
                  )}
                </div>

                {/* Label */}
                <div style={{ flex: 1, paddingBottom: i < stages.length - 1 ? 8 : 0, paddingTop: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isDone ? "#374151" : isActive ? "#111827" : isWaiting ? "#9CA3AF" : "#111827" }}>
                      {stage.label}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isDone && stage.pagesProcessed && (
                        <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#9CA3AF" }}>
                          {stage.pagesProcessed} pages
                        </span>
                      )}
                      {isDone && <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 500 }}>Done</span>}
                      {isFailed && (
                        <button style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#DC2626", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <RefreshCw size={10} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #E5E7EB", backgroundColor: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowLeaveNotice(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 14px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, color: "#374151" }}
            >
              <ArrowLeft size={13} />
              Leave page
            </button>
            {!allComplete && (
              <button
                onClick={() => setIsRunning(false)}
                style={{ height: 34, padding: "0 14px", border: "none", borderRadius: 6, backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "#9CA3AF" }}
              >
                Cancel
              </button>
            )}
          </div>
          {allComplete && (
            <button
              onClick={onComplete}
              style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 20px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white" }}
            >
              Review drawings
              <ChevronRight size={14} />
            </button>
          )}
          {!allComplete && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9CA3AF" }}>
              <Clock size={12} />
              Processing continues if you leave
            </div>
          )}
        </div>
      </div>

      {/* Leave notice */}
      {showLeaveNotice && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: 28, maxWidth: 400, width: "100%", margin: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Processing continues in background</h3>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: "18px", marginBottom: 20 }}>
              Brightpoint will continue processing your drawings. You'll receive a notification when it's complete. You can return to this project to review the results.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowLeaveNotice(false)}
                style={{ height: 36, padding: "0 16px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, color: "#374151" }}
              >
                Stay on page
              </button>
              <button
                onClick={onBack}
                style={{ height: 36, padding: "0 16px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white" }}
              >
                Leave — I'll come back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 24, textAlign: "center", maxWidth: 440 }}>
        AI is analyzing each page. Results are shown for review before being applied. You can correct any detection manually.
      </p>
    </div>
  );
}
