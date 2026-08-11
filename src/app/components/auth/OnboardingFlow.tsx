import { useState } from "react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Zap,
  X,
  Loader2,
  Users,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
  onExit: () => void;
}

const STEPS = [
  { id: 1, label: "Company" },
  { id: 2, label: "Preferences" },
  { id: 3, label: "Labor & tax" },
  { id: 4, label: "Suppliers" },
  { id: 5, label: "Team" },
];

const SUPPLIERS = [
  { id: "rexel", name: "Rexel", logo: "R", color: "#DC2626" },
  { id: "ideal", name: "Ideal Electrical", logo: "IE", color: "#2563EB" },
  { id: "haymans", name: "Haymans", logo: "H", color: "#D97706" },
  { id: "nls", name: "NLS Electrical", logo: "NL", color: "#16A34A" },
  { id: "brightline", name: "Brightline Supply", logo: "BL", color: "#7C3AED" },
  { id: "direct", name: "Manual / CSV import", logo: "M", color: "#6B7280" },
];

const ROLES = ["Estimator", "Senior estimator", "Project manager", "Admin", "Viewer"];

interface TeamMember {
  email: string;
  role: string;
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
      {children}
      {optional && (
        <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF", marginLeft: 2 }}>Optional</span>
      )}
    </label>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label optional={optional}>{label}</Label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 6,
  border: "1px solid #D1D5DB",
  fontSize: 14,
  color: "#111827",
  backgroundColor: "white",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: 32,
};

export function OnboardingFlow({ onComplete, onExit }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [autosaved, setAutosaved] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(["rexel"]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ email: "", role: "Estimator" }]);

  const isOptionalStep = step === 4 || step === 5;

  function simulateAutosave() {
    setAutosaved(false);
    setTimeout(() => setAutosaved(true), 800);
  }

  async function handleContinue() {
    if (step < 5) {
      simulateAutosave();
      setStep((s) => s + 1);
    } else {
      setSaving(true);
      await new Promise((r) => setTimeout(r, 1200));
      setSaving(false);
      setComplete(true);
    }
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  function toggleSupplier(id: string) {
    setSelectedSuppliers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function addMember() {
    setTeamMembers((prev) => [...prev, { email: "", role: "Estimator" }]);
  }

  function removeMember(i: number) {
    setTeamMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMember(i: number, field: keyof TeamMember, value: string) {
    setTeamMembers((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  if (complete) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#F6F7F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "#F0FDF4",
              border: "2px solid #86EFAC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <CheckCircle size={32} color="#16A34A" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            You're all set!
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: "20px", marginBottom: 32 }}>
            Brightpoint is configured and ready to use. You can update any of these settings at any
            time in Settings.
          </p>
          <button
            onClick={onComplete}
            style={{
              height: 42,
              padding: "0 28px",
              backgroundColor: "#2563EB",
              color: "white",
              borderRadius: 6,
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F6F7F9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={18} color="white" fill="white" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Brightpoint</span>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: done ? "#16A34A" : active ? "#2563EB" : "#E5E7EB",
                    border: active ? "2px solid #2563EB" : done ? "2px solid #16A34A" : "2px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 200ms",
                  }}
                >
                  {done ? (
                    <Check size={14} color="white" strokeWidth={2.5} />
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? "white" : "#9CA3AF" }}>
                      {s.id}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? "#111827" : done ? "#4B5563" : "#9CA3AF", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 60, height: 1, backgroundColor: done ? "#86EFAC" : "#E5E7EB", margin: "0 8px", marginBottom: 22, transition: "background-color 200ms" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          backgroundColor: "white",
          borderRadius: 12,
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step {step} of 5
              </span>
              {isOptionalStep && (
                <span style={{ fontSize: 11, fontWeight: 500, color: "#7C3AED", backgroundColor: "#F5F3FF", padding: "1px 6px", borderRadius: 4 }}>
                  Optional
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
              {step === 1 && "Company information"}
              {step === 2 && "Estimating preferences"}
              {step === 3 && "Labor and tax settings"}
              {step === 4 && "Supplier pricing setup"}
              {step === 5 && "Invite team members"}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {autosaved && (
              <span style={{ fontSize: 12, color: "#16A34A", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} />
                Autosaved
              </span>
            )}
            <button
              onClick={onExit}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}
              title="Save and exit"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, minHeight: 320 }}>
          {/* Step 1: Company */}
          {step === 1 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Company name">
                    <input defaultValue="Acme Electrical Co." style={inputStyle} />
                  </Field>
                </div>
                <Field label="Business number (ABN/ACN)" optional>
                  <input placeholder="e.g. 12 345 678 901" style={inputStyle} />
                </Field>
                <Field label="Industry / trade">
                  <select defaultValue="electrical" style={selectStyle}>
                    <option value="electrical">Electrical</option>
                    <option value="mechanical">Mechanical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="civil">Civil</option>
                  </select>
                </Field>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Company address">
                    <input defaultValue="42 Harbour St, Sydney NSW 2000" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Company size">
                  <select defaultValue="11-50" style={selectStyle}>
                    <option value="1-5">1–5 employees</option>
                    <option value="6-10">6–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51-200">51–200 employees</option>
                    <option value="200+">200+ employees</option>
                  </select>
                </Field>
                <Field label="Country / region">
                  <select defaultValue="au" style={selectStyle}>
                    <option value="au">Australia</option>
                    <option value="nz">New Zealand</option>
                    <option value="us">United States</option>
                    <option value="ca">Canada</option>
                    <option value="gb">United Kingdom</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          {/* Step 2: Estimating preferences */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Default estimate type">
                <select defaultValue="fixed" style={selectStyle}>
                  <option value="fixed">Fixed price</option>
                  <option value="cost-plus">Cost plus</option>
                  <option value="hourly">Hourly rate</option>
                  <option value="unit-rate">Unit rate</option>
                </select>
              </Field>
              <Field label="Measurement system">
                <select defaultValue="metric" style={selectStyle}>
                  <option value="metric">Metric (m, kg)</option>
                  <option value="imperial">Imperial (ft, lb)</option>
                </select>
              </Field>
              <Field label="Currency">
                <select defaultValue="aud" style={selectStyle}>
                  <option value="aud">AUD — Australian Dollar</option>
                  <option value="usd">USD — US Dollar</option>
                  <option value="nzd">NZD — New Zealand Dollar</option>
                  <option value="gbp">GBP — British Pound</option>
                  <option value="cad">CAD — Canadian Dollar</option>
                </select>
              </Field>
              <Field label="Time zone">
                <select defaultValue="aet" style={selectStyle}>
                  <option value="aet">AEDT — Sydney / Melbourne</option>
                  <option value="acst">ACST — Adelaide / Darwin</option>
                  <option value="awst">AWST — Perth</option>
                  <option value="nzst">NZST — Auckland</option>
                  <option value="pst">PST — Los Angeles</option>
                </select>
              </Field>
              <Field label="Fiscal year start">
                <select defaultValue="july" style={selectStyle}>
                  <option value="january">January</option>
                  <option value="april">April</option>
                  <option value="july">July (Australian FY)</option>
                  <option value="october">October</option>
                </select>
              </Field>
              <Field label="Default bid validity period">
                <select defaultValue="30" style={selectStyle}>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </Field>
            </div>
          )}

          {/* Step 3: Labor & tax */}
          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Default labor rate ($/hr)">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280" }}>$</span>
                  <input defaultValue="85.00" style={{ ...inputStyle, paddingLeft: 24 }} className="font-mono" />
                </div>
              </Field>
              <Field label="Labor burden rate (%)">
                <div style={{ position: "relative" }}>
                  <input defaultValue="35" style={{ ...inputStyle, paddingRight: 28 }} className="font-mono" />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280" }}>%</span>
                </div>
              </Field>
              <Field label="Sales tax rate (%)">
                <div style={{ position: "relative" }}>
                  <input defaultValue="10" style={{ ...inputStyle, paddingRight: 28 }} className="font-mono" />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280" }}>%</span>
                </div>
              </Field>
              <Field label="Default overhead (%)">
                <div style={{ position: "relative" }}>
                  <input defaultValue="12" style={{ ...inputStyle, paddingRight: 28 }} className="font-mono" />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280" }}>%</span>
                </div>
              </Field>
              <Field label="Default markup (%)">
                <div style={{ position: "relative" }}>
                  <input defaultValue="15" style={{ ...inputStyle, paddingRight: 28 }} className="font-mono" />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280" }}>%</span>
                </div>
              </Field>
              <Field label="Default profit margin (%)">
                <div style={{ position: "relative" }}>
                  <input defaultValue="8" style={{ ...inputStyle, paddingRight: 28 }} className="font-mono" />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280" }}>%</span>
                </div>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ padding: "12px 14px", backgroundColor: "#EFF6FF", borderRadius: 6, border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 12, color: "#1D4ED8", lineHeight: "16px" }}>
                    <strong>Tip:</strong> These defaults apply to all new projects. You can override them per project or per estimate at any time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Suppliers */}
          {step === 4 && (
            <>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: -4 }}>
                Connect supplier pricing catalogues to auto-populate material costs in your estimates. You can connect more suppliers later.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {SUPPLIERS.map((s) => {
                  const selected = selectedSuppliers.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSupplier(s.id)}
                      style={{
                        padding: "14px 12px",
                        border: `2px solid ${selected ? "#2563EB" : "#E5E7EB"}`,
                        borderRadius: 8,
                        backgroundColor: selected ? "#EFF6FF" : "white",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 150ms",
                        position: "relative",
                      }}
                    >
                      {selected && (
                        <div style={{ position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={10} color="white" strokeWidth={2.5} />
                        </div>
                      )}
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: s.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: "white", fontSize: 12, fontWeight: 600 }}>
                        {s.logo}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 5: Team */}
          {step === 5 && (
            <>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: -4 }}>
                Invite colleagues to Brightpoint. They'll receive an email with setup instructions.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {teamMembers.map((member, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(i, "email", e.target.value)}
                      placeholder="colleague@company.com"
                      style={{ ...inputStyle, flex: 2 }}
                    />
                    <select
                      value={member.role}
                      onChange={(e) => updateMember(i, "role", e.target.value)}
                      style={{ ...selectStyle, flex: 1 }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {teamMembers.length > 1 && (
                      <button
                        onClick={() => removeMember(i)}
                        style={{ width: 38, height: 38, border: "1px solid #E5E7EB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", flexShrink: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addMember}
                  style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", border: "1px dashed #D1D5DB", borderRadius: 6, backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "#6B7280", width: "fit-content" }}
                >
                  <Plus size={14} />
                  Add another
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FAFAFA" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{ height: 36, padding: "0 16px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={onExit}
              style={{ height: 36, padding: "0 16px", border: "none", borderRadius: 6, backgroundColor: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 400, color: "#6B7280" }}
            >
              Save and exit
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {isOptionalStep && (
              <button
                onClick={handleContinue}
                style={{ height: 36, padding: "0 16px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#4B5563" }}
              >
                Skip for now
              </button>
            )}
            <button
              onClick={handleContinue}
              disabled={saving}
              style={{ height: 36, padding: "0 20px", border: "none", borderRadius: 6, backgroundColor: saving ? "#93C5FD" : "#2563EB", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, color: "white", display: "flex", alignItems: "center", gap: 8 }}
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" />Saving…</>
              ) : step === 5 ? (
                <>Finish setup <Check size={14} /></>
              ) : (
                <>Continue <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Save notice */}
      <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 16 }}>
        Your progress is saved automatically. You can exit and return anytime.
      </p>
    </div>
  );
}
