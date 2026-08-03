import React, { useState } from "react";
import { Check } from "lucide-react";
import { ProjectHeader } from "../projects/ProjectHeader";
import { DrawingsUpload } from "./DrawingsUpload";
import { DrawingsProcessing } from "./DrawingsProcessing";
import { DrawingsOrganize } from "./DrawingsOrganize";

/**
 * Drawings tab.
 *
 * Upload → Processing → Review sheets used to be three App-level pages, so
 * opening Drawings left the project shell behind. They are steps of one flow,
 * not destinations, so they live here as local state under the shared
 * ProjectHeader — the other project tabs stay one click away throughout.
 */

type Step = "upload" | "processing" | "organize";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "processing", label: "Processing" },
  { id: "organize", label: "Review sheets" },
];

interface DrawingsWorkspaceProps {
  onBack?: () => void;
  onNavigateTo?: (page: string) => void;
  /** Review sheets → the takeoff workspace, which is its own tab. */
  onContinueToTakeoff?: () => void;
  projectStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function DrawingsWorkspace({
  onBack, onNavigateTo, onContinueToTakeoff, projectStatus, onStatusChange,
}: DrawingsWorkspaceProps) {
  const [step, setStep] = useState<Step>("upload");
  /** Steps the user has completed, so a finished step stays reachable. */
  const [reached, setReached] = useState<Set<Step>>(new Set<Step>(["upload"]));

  function goTo(next: Step) {
    setReached((prev) => new Set(prev).add(next));
    setStep(next);
  }

  const activeIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden", background: "#F6F7F9" }}>
      <ProjectHeader
        activeTab="Drawings"
        onNavigateTab={onNavigateTo}
        onBack={onBack}
        projectStatus={projectStatus}
        onStatusChange={onStatusChange}
      />

      {/* Step strip. Processing is transient — it is never clickable, it is
          entered by starting a run and left when the run finishes. */}
      <div className="bp-scroll-x" style={{ background: "white", borderBottom: "1px solid #E5E7EB", padding: "0 16px", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, height: 40 }}>
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = reached.has(s.id) && i < activeIdx;
          const clickable = s.id !== "processing" && reached.has(s.id) && !active;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && <span style={{ width: 14, height: 1, background: "#E5E7EB", flexShrink: 0 }} />}
              <button
                onClick={clickable ? () => setStep(s.id) : undefined}
                disabled={!clickable}
                style={{
                  height: 40, padding: "0 10px", border: "none", background: "transparent",
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  cursor: clickable ? "pointer" : "default",
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? "#2563EB" : done ? "#374151" : "#9CA3AF",
                  borderBottom: active ? "2px solid #2563EB" : "2px solid transparent",
                }}
              >
                <span style={{
                  width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600,
                  background: active ? "#2563EB" : done ? "#DCFCE7" : "#F3F4F6",
                  color: active ? "white" : done ? "#16A34A" : "#9CA3AF",
                }}>
                  {done ? <Check size={10} strokeWidth={3} /> : i + 1}
                </span>
                {s.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: step === "organize" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        {step === "upload" && (
          <DrawingsUpload onBeginProcessing={() => goTo("processing")} />
        )}
        {step === "processing" && (
          <DrawingsProcessing
            embedded
            onComplete={() => goTo("organize")}
            onBack={() => setStep("upload")}
          />
        )}
        {step === "organize" && (
          <DrawingsOrganize
            onContinue={() => onContinueToTakeoff?.()}
            onBack={() => setStep("upload")}
          />
        )}
      </div>
    </div>
  );
}
