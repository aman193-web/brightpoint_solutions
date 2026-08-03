import React, { useState } from "react";
import { FlaskConical, X } from "lucide-react";

/**
 * Demo-state switcher, collapsed to a single icon.
 *
 * These switchers exist to show a screen's alternate states during a demo, not
 * as product chrome — a full-width band of them reads as part of the app and
 * pushes the real content down. Collapsed by default: one small icon at the top
 * left, which expands the chips in place when clicked.
 */
export function DemoStateBar<T extends string>({ label, states, value, onChange, inset = 24 }: {
  /** e.g. "Dashboard state" — shown once expanded. */
  label: string;
  states: readonly T[];
  value: T;
  onChange: (state: T) => void;
  /** Horizontal padding. Pass 0 when the parent already pads its content. */
  inset?: number;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div style={{ padding: `6px ${inset}px`, display: "flex" }}>
        <button
          onClick={() => setOpen(true)}
          title={`${label} — demo states`}
          aria-label={`Show ${label.toLowerCase()} demo states`}
          style={{
            width: 24, height: 24, border: "1px solid #E5E7EB", borderRadius: 6,
            background: "white", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <FlaskConical size={12} color="#9CA3AF" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="bp-toolbar"
      style={{ borderBottom: "1px solid #E5E7EB", background: "white", padding: `8px ${inset}px` }}
    >
      <button
        onClick={() => setOpen(false)}
        title="Hide demo states"
        aria-label="Hide demo states"
        style={{
          width: 24, height: 24, border: "1px solid #E5E7EB", borderRadius: 6,
          background: "white", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <X size={12} color="#9CA3AF" />
      </button>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
        {label}:
      </span>
      {states.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? "#2563EB" : "#4B5563",
              background: active ? "#EFF6FF" : "transparent",
              border: `1px solid ${active ? "#BFDBFE" : "#E5E7EB"}`,
              borderRadius: 4, padding: "2px 10px", cursor: "pointer", flexShrink: 0,
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
