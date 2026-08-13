import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  MapPin,
} from "lucide-react";

interface CreateProjectWizardProps {
  onComplete: (projectId: string) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: "Project details" },
  { id: 2, label: "Building conditions" },
  { id: 3, label: "Commercial defaults" },
  { id: 4, label: "Contacts & review" },
];

const BUILDING_CONDITIONS = [
  { id: "wood-framing", label: "Wood framing" },
  { id: "metal-framing", label: "Metal framing" },
  { id: "cmu-walls", label: "CMU walls" },
  { id: "concrete-deck", label: "Concrete deck" },
  { id: "bar-joists", label: "Bar joists" },
  { id: "open-ceiling", label: "Open ceiling" },
  { id: "act-ceiling", label: "ACT / drop ceiling" },
  { id: "existing", label: "Existing construction" },
  { id: "new-construction", label: "New construction" },
  { id: "remodel", label: "Remodel" },
  { id: "occupied", label: "Occupied building" },
  { id: "healthcare", label: "Hospital / healthcare" },
  { id: "hazardous", label: "Hazardous location" },
];


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
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: 32,
};

function Field({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: "#DC2626", fontSize: 12 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <AlertCircle size={12} color="#DC2626" />
          <span style={{ fontSize: 12, color: "#DC2626" }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        border: `1px solid ${checked ? "#2563EB" : "#E5E7EB"}`,
        borderRadius: 6,
        backgroundColor: checked ? "#EFF6FF" : "white",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 120ms",
      }}
    >
      <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? "#2563EB" : "#D1D5DB"}`, backgroundColor: checked ? "#2563EB" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 120ms" }}>
        {checked && <Check size={10} color="white" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 13, color: checked ? "#1D4ED8" : "#374151", fontWeight: checked ? 500 : 400 }}>{label}</span>
    </button>
  );
}

export function CreateProjectWizard({ onComplete, onCancel }: CreateProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [autosaved, setAutosaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState(false);

  // Step 1 state
  const [projectName, setProjectName] = useState("");
  const [projectNumber, setProjectNumber] = useState("BP-029");
  const [address, setAddress] = useState("");
  const [gc, setGc] = useState("");
  const [bidDate, setBidDate] = useState("2026-08-15");
  const [bidTime, setBidTime] = useState("14:00");
  const [estimator, setEstimator] = useState("James Mitchell");
  const [projectType, setProjectType] = useState("commercial");
  const [constructionType, setConstructionType] = useState("new-construction");

  // Step 2 state
  const [conditions, setConditions] = useState<Set<string>>(new Set(["new-construction", "metal-framing"]));

  // Step 3 state
  const [taxRate, setTaxRate] = useState("10");
  const [overhead, setOverhead] = useState("12");
  const [markup, setMarkup] = useState("15");
  const [laborProfile, setLaborProfile] = useState("standard");

  // Step 4 contacts
  const [contacts, setContacts] = useState([
    { name: "Mike Patterson", company: "Summit Commercial Builders", role: "Project Manager", email: "m.patterson@summitcb.com.au", phone: "0412 345 678", type: "gc", quoteRecipient: true },
  ]);

  /**
   * General contractors this job is being bid to.
   *
   * A list, not a field — bidding the same job to four GCs is the normal case,
   * and each one is its own proposal recipient with its own price. Ids come from a
   * counter rather than the array index so a removal cannot re-key the rows that
   * follow it and move typing from one contractor onto another.
   */
  const [biddingGcs, setBiddingGcs] = useState([
    {
      id: "gc-1", company: "Summit Commercial Builders", contact: "Mike Patterson",
      role: "Chief Estimator", email: "estimating@summitcb.com.au", phone: "0412 345 678",
      dueDate: "", invited: true,
    },
  ]);
  const gcSeq = useRef(1);

  function addGc() {
    gcSeq.current += 1;
    setBiddingGcs((prev) => [...prev, {
      id: `gc-${gcSeq.current}`, company: "", contact: "", role: "",
      email: "", phone: "", dueDate: "", invited: false,
    }]);
  }

  function updateGc(i: number, patch: Partial<(typeof biddingGcs)[number]>) {
    setBiddingGcs((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  function toggleCondition(id: string) {
    setConditions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function simulateAutosave() {
    setAutosaved(false);
    setTimeout(() => setAutosaved(true), 600);
  }

  function validateStep1() {
    if (!projectName.trim()) {
      setNameError("Project name is required");
      return false;
    }
    setNameError("");
    return true;
  }

  async function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step < 4) {
      simulateAutosave();
      setStep((s) => s + 1);
    } else {
      setSaving(true);
      setSubmitError(false);
      await new Promise((r) => setTimeout(r, 1300));
      setSaving(false);
      onComplete("BP-029");
    }
  }

  return (
    <div style={{ backgroundColor: "#F6F7F9", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E5E7EB", padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onCancel}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, color: "#374151" }}
          >
            <X size={14} />
            Cancel
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: "#E5E7EB" }} />
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>New project</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {autosaved && (
            <span style={{ fontSize: 12, color: "#16A34A", display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={12} />
              Draft saved
            </span>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E5E7EB", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", maxWidth: 800, margin: "0 auto" }}>
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 0", cursor: done ? "pointer" : "default" }}
                  onClick={() => done && setStep(s.id)}
                >
                  <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: done ? "#16A34A" : active ? "#2563EB" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done ? <Check size={12} color="white" strokeWidth={2.5} /> : <span style={{ fontSize: 11, fontWeight: 600, color: active ? "white" : "#9CA3AF" }}>{s.id}</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#111827" : done ? "#4B5563" : "#9CA3AF", whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, backgroundColor: done ? "#86EFAC" : "#E5E7EB", margin: "0 16px" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 120px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* STEP 1: Project details */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Project details</h2>
                <p style={{ fontSize: 13, color: "#6B7280" }}>Basic information about the project and bid.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 16 }}>
                <Field label="Project name" required error={nameError}>
                  <input
                    value={projectName}
                    onChange={(e) => { setProjectName(e.target.value); if (e.target.value) setNameError(""); }}
                    placeholder="e.g. Dollar Tree Retail Fit-Out — Store 1842"
                    style={{ ...inputStyle, borderColor: nameError ? "#FCA5A5" : "#D1D5DB" }}
                  />
                </Field>
                <Field label="Project number">
                  <input value={projectNumber} onChange={(e) => setProjectNumber(e.target.value)} style={{ ...inputStyle, fontFamily: "IBM Plex Mono, monospace" }} />
                </Field>
              </div>

              <Field label="Site address">
                <div style={{ position: "relative" }}>
                  <MapPin size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="142 Crown Street, Wollongong NSW 2500"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Customer / general contractor" required>
                  <input value={gc} onChange={(e) => setGc(e.target.value)} placeholder="e.g. Summit Commercial Builders" style={inputStyle} />
                </Field>
                <Field label="Estimator" required>
                  <select value={estimator} onChange={(e) => setEstimator(e.target.value)} style={selectStyle}>
                    {["James Mitchell", "Sarah Reynolds", "Tom Chen"].map((e) => <option key={e}>{e}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <Field label="Bid due date" required>
                  <div style={{ position: "relative" }}>
                    <Calendar size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                    <input type="date" value={bidDate} onChange={(e) => setBidDate(e.target.value)} style={{ ...inputStyle, paddingLeft: 32 }} />
                  </div>
                </Field>
                <Field label="Bid due time">
                  <input type="time" value={bidTime} onChange={(e) => setBidTime(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Project status">
                  <select defaultValue="draft" style={selectStyle}>
                    <option value="draft">Draft</option>
                    <option value="takeoff">Takeoff in progress</option>
                    <option value="pricing">Pricing required</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Project type">
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={selectStyle}>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="retail">Retail fit-out</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="residential">Residential</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="data-centre">Data centre</option>
                  </select>
                </Field>
                <Field label="Construction type">
                  <select value={constructionType} onChange={(e) => setConstructionType(e.target.value)} style={selectStyle}>
                    <option value="new-construction">New construction</option>
                    <option value="remodel">Remodel</option>
                    <option value="fit-out">Fit-out</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* STEP 2: Building conditions */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Building conditions</h2>
                <p style={{ fontSize: 13, color: "#6B7280" }}>Select all conditions that apply. These inform assembly and material defaults.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {BUILDING_CONDITIONS.map((c) => (
                  <CheckItem
                    key={c.id}
                    label={c.label}
                    checked={conditions.has(c.id)}
                    onChange={() => toggleCondition(c.id)}
                  />
                ))}
              </div>
              {conditions.size === 0 && (
                <div style={{ padding: "10px 14px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6 }}>
                  <p style={{ fontSize: 13, color: "#92400E" }}>Select at least one building condition to help configure default assemblies.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Scope & defaults */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Commercial defaults</h2>
                <p style={{ fontSize: 13, color: "#6B7280" }}>Rates this project starts from. Every one is overridable per bid.</p>
              </div>

              {/*
                Disciplines & Scope was removed from intake (client, 11 Aug 2026).
                Intake selections must not restrict which systems or library
                content are available later: an estimator who ticks Lighting and
                Power at setup, before the drawings are read, would find Fire Alarm
                missing from the library on the day they need it. Scope belongs to
                Project Breakdown and to a Bid Summary, both of which are edited
                with the drawings in front of you.
              */}

              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 14 }}>Commercial defaults</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  <Field label="Sales tax rate (%)">
                    <div style={{ position: "relative" }}>
                      <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} style={{ ...inputStyle, paddingRight: 28, fontFamily: "IBM Plex Mono, monospace" }} />
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6B7280" }}>%</span>
                    </div>
                  </Field>
                  <Field label="Overhead (%)">
                    <div style={{ position: "relative" }}>
                      <input value={overhead} onChange={(e) => setOverhead(e.target.value)} style={{ ...inputStyle, paddingRight: 28, fontFamily: "IBM Plex Mono, monospace" }} />
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6B7280" }}>%</span>
                    </div>
                  </Field>
                  <Field label="Markup (%)">
                    <div style={{ position: "relative" }}>
                      <input value={markup} onChange={(e) => setMarkup(e.target.value)} style={{ ...inputStyle, paddingRight: 28, fontFamily: "IBM Plex Mono, monospace" }} />
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6B7280" }}>%</span>
                    </div>
                  </Field>
                  <Field label="Labor profile">
                    <select value={laborProfile} onChange={(e) => setLaborProfile(e.target.value)} style={selectStyle}>
                      <option value="standard">Standard — $85/hr</option>
                      <option value="premium">Premium — $110/hr</option>
                      <option value="apprentice">Apprentice mix — $65/hr</option>
                      <option value="custom">Custom rate</option>
                    </select>
                  </Field>
                  <Field label="Material pricing source">
                    <select defaultValue="rexel" style={selectStyle}>
                      <option value="rexel">Rexel</option>
                      <option value="ideal">Ideal Electrical</option>
                      <option value="haymans">Haymans</option>
                      <option value="manual">Manual</option>
                    </select>
                  </Field>
                  <Field label="Currency">
                    <select defaultValue="aud" style={selectStyle}>
                      <option value="aud">AUD</option>
                      <option value="usd">USD</option>
                      <option value="nzd">NZD</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Contacts & review */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Contacts & review</h2>
                <p style={{ fontSize: 13, color: "#6B7280" }}>Add project contacts, then review your settings before creating the project.</p>
              </div>

              {/* Contacts */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Project contacts</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {contacts.map((c, i) => (
                    <div key={i} style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Contact {i + 1}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4B5563", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={c.quoteRecipient}
                              onChange={(e) => {
                                const next = [...contacts];
                                next[i] = { ...next[i], quoteRecipient: e.target.checked };
                                setContacts(next);
                              }}
                              style={{ accentColor: "#2563EB" }}
                            />
                            Quote recipient
                          </label>
                          {contacts.length > 1 && (
                            <button
                              onClick={() => setContacts((prev) => prev.filter((_, idx) => idx !== i))}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <input defaultValue={c.name} placeholder="Full name" style={inputStyle} />
                        <input defaultValue={c.company} placeholder="Company" style={inputStyle} />
                        <select defaultValue={c.type} style={selectStyle}>
                          <option value="gc">General contractor</option>
                          <option value="client">Client / owner</option>
                          <option value="architect">Architect</option>
                          <option value="engineer">Engineer</option>
                          <option value="supplier">Supplier</option>
                        </select>
                        <input defaultValue={c.email} placeholder="Email address" type="email" style={inputStyle} />
                        <input defaultValue={c.phone} placeholder="Phone number" style={inputStyle} />
                        <input defaultValue={c.role} placeholder="Role / title" style={inputStyle} />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setContacts((prev) => [...prev, { name: "", company: "", role: "", email: "", phone: "", type: "client", quoteRecipient: false }])}
                    style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", border: "1px dashed #D1D5DB", borderRadius: 6, backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "#6B7280", width: "fit-content" }}
                  >
                    <Plus size={14} />
                    Add contact
                  </button>
                </div>
              </div>

              {/*
                Bidding GCs (client, 11 Aug 2026).
                ---------------------------------
                Distinct from the contact list above, and deliberately its own
                section rather than another `type` in that dropdown. A job is
                commonly bid to several general contractors at once, and each of
                them is a *proposal recipient* — the Proposal Center sends one
                priced document per GC. A flat contact list cannot express that:
                it holds the architect and the owner too, and "which of these do I
                send a price to" is exactly the question a recipient list has to
                answer without guessing.

                One estimating contact per GC, because that is who the invitation
                to bid comes from and who the proposal goes back to.
              */}
              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Bidding GCs</p>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {biddingGcs.length} {biddingGcs.length === 1 ? "contractor" : "contractors"}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
                  Every general contractor this job is being bid to. These become the
                  selectable recipients in the Proposal Center, each with its own priced proposal.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {biddingGcs.map((g, i) => (
                    <div key={g.id} style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                          {g.company || `Contractor ${i + 1}`}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4B5563", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={g.invited}
                              onChange={(e) => updateGc(i, { invited: e.target.checked })}
                              style={{ accentColor: "#2563EB" }}
                            />
                            Invitation received
                          </label>
                          <button
                            onClick={() => setBiddingGcs((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label={`Remove ${g.company || `contractor ${i + 1}`}`}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <input
                          value={g.company}
                          onChange={(e) => updateGc(i, { company: e.target.value })}
                          placeholder="Contractor name"
                          style={inputStyle}
                        />
                        <input
                          value={g.contact}
                          onChange={(e) => updateGc(i, { contact: e.target.value })}
                          placeholder="Estimating contact"
                          style={inputStyle}
                        />
                        <input
                          value={g.role}
                          onChange={(e) => updateGc(i, { role: e.target.value })}
                          placeholder="Role / title"
                          style={inputStyle}
                        />
                        <input
                          value={g.email}
                          onChange={(e) => updateGc(i, { email: e.target.value })}
                          placeholder="Email address"
                          type="email"
                          style={inputStyle}
                        />
                        <input
                          value={g.phone}
                          onChange={(e) => updateGc(i, { phone: e.target.value })}
                          placeholder="Phone number"
                          style={inputStyle}
                        />
                        <input
                          value={g.dueDate}
                          onChange={(e) => updateGc(i, { dueDate: e.target.value })}
                          placeholder="Their bid due date"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addGc}
                    style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", border: "1px dashed #D1D5DB", borderRadius: 6, backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "#6B7280", width: "fit-content" }}
                  >
                    <Plus size={14} />
                    Add bidding GC
                  </button>
                </div>
              </div>

              {/* Summary review */}
              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Project summary</p>
                <div style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    ["Project name", projectName || "—"],
                    ["Project number", projectNumber],
                    ["General contractor", gc || "—"],
                    ["Bid due", bidDate ? `${bidDate} at ${bidTime}` : "—"],
                    ["Estimator", estimator],
                    ["Overhead", `${overhead}%`],
                    ["Tax rate", `${taxRate}%`],
                    ["Markup", `${markup}%`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {submitError && (
                <div style={{ display: "flex", gap: 10, padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6 }}>
                  <AlertCircle size={15} color="#DC2626" />
                  <p style={{ fontSize: 13, color: "#991B1B" }}>Failed to create project. Please try again or contact support.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position: "sticky", bottom: 0, backgroundColor: "white", borderTop: "1px solid #E5E7EB", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 -1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}
          <button
            onClick={onCancel}
            style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 6, backgroundColor: "transparent", cursor: "pointer", fontSize: 13, color: "#6B7280" }}
          >
            Save draft
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#9CA3AF", alignSelf: "center" }}>Step {step} of {STEPS.length}</span>
          <button
            onClick={handleNext}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 20px", border: "none", borderRadius: 6, backgroundColor: saving ? "#93C5FD" : "#2563EB", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, color: "white" }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" />Creating project…</>
            ) : step === 4 ? (
              <>Create project <Check size={14} /></>
            ) : (
              <>Continue <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
