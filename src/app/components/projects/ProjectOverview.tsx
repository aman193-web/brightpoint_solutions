import { toast } from "sonner";
import {
  CalendarClock,
  MapPin,
  User,
  Building2,
  ChevronRight,
  FileText,
  Upload,
  AlertTriangle,
  Zap,
  ArrowRight,
  Image,
  FileArchive,
  Eye,
  Download,
  Play,
} from "lucide-react";
import { ProjectHeader } from "./ProjectHeader";

interface ProjectOverviewProps {
  onBack?: () => void;
  onNavigateToTakeoff?: () => void;
  onOpenDrawings?: () => void;
  onNavigateTo?: (page: string) => void;
  projectStatus?: string;
  onStatusChange?: (status: string) => void;
}

const DRAWING_SHEETS = [
  { id: "E-001", name: "Electrical site plan", status: "processed", pages: 1 },
  { id: "E-101", name: "Lighting — Level 1", status: "processed", pages: 2 },
  { id: "E-102", name: "Power — Level 1", status: "processed", pages: 2 },
  { id: "E-201", name: "Panel schedules", status: "processed", pages: 1 },
  { id: "E-301", name: "Fire alarm riser", status: "processing", pages: 1 },
  { id: "E-401", name: "Low voltage layout", status: "processing", pages: 1 },
  { id: "E-501", name: "Specification sections", status: "pending", pages: 4 },
];

const ACTIVITY = [
  { text: "Takeoff started on Sheet E-101 — Lighting Level 1", time: "2 hours ago", user: "JM", color: "#2563EB" },
  { text: "6 new drawing sheets uploaded and queued for processing", time: "4 hours ago", user: "JM", color: "#2563EB" },
  { text: "Project created from template — Retail Fit-Out", time: "Yesterday", user: "JM", color: "#2563EB" },
  { text: "Contact added — Mike Patterson, Summit Commercial Builders", time: "Yesterday", user: "JM", color: "#2563EB" },
  { text: "Bid deadline set to 24 July 2026 at 2:00 PM", time: "Yesterday", user: "JM", color: "#2563EB" },
];

const FILES = [
  { name: "Dollar-Tree-1842-Drawings-Rev2.pdf", size: "18.4 MB", type: "pdf", uploaded: "4h ago" },
  { name: "Scope-of-Works-v1.docx", size: "124 KB", type: "doc", uploaded: "Yesterday" },
  { name: "Site-Photos-July2026.zip", size: "42.1 MB", type: "zip", uploaded: "Yesterday" },
  { name: "Specification-Div26-Electrical.pdf", size: "2.1 MB", type: "pdf", uploaded: "Yesterday" },
];

const CONTACTS = [
  { name: "Mike Patterson", company: "Summit Commercial Builders", role: "Project Manager", email: "m.patterson@summitcb.com.au", phone: "0412 345 678", type: "GC", isQuoteRecipient: true, color: "#2563EB" },
  { name: "Rachel Kim", company: "Dollar Tree ANZ", role: "Development Manager", email: "r.kim@dollartree.com.au", phone: "0435 678 901", type: "Client", isQuoteRecipient: true, color: "#7C3AED" },
];

const ESTIMATE_HEALTH = [
  { area: "Lighting — Level 1", status: "in-progress", pct: 42, items: 34 },
  { area: "Power — Level 1", status: "not-started", pct: 0, items: 0 },
  { area: "Panel schedules", status: "not-started", pct: 0, items: 0 },
  { area: "Fire alarm riser", status: "blocked", pct: 0, items: 0 },
  { area: "Low voltage layout", status: "not-started", pct: 0, items: 0 },
];

function FileIcon({ type }: { type: string }) {
  const cfg: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
    pdf: { icon: FileText, color: "#DC2626", bg: "#FEF2F2" },
    doc: { icon: FileText, color: "#2563EB", bg: "#EFF6FF" },
    zip: { icon: FileArchive, color: "#D97706", bg: "#FFFBEB" },
    img: { icon: Image, color: "#16A34A", bg: "#F0FDF4" },
  };
  const { icon: Icon, color, bg } = cfg[type] ?? cfg.pdf;
  return (
    <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={16} color={color} />
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  processed: { label: "Processed", color: "#16A34A", bg: "#F0FDF4" },
  processing: { label: "Processing", color: "#2563EB", bg: "#EFF6FF" },
  pending: { label: "Pending", color: "#9CA3AF", bg: "#F3F4F6" },
  "in-progress": { label: "In progress", color: "#7C3AED", bg: "#F5F3FF" },
  "not-started": { label: "Not started", color: "#9CA3AF", bg: "#F3F4F6" },
  blocked: { label: "Blocked", color: "#D97706", bg: "#FFFBEB" },
};

const processedCount = DRAWING_SHEETS.filter((s) => s.status === "processed").length;
const processingPct = Math.round((processedCount / DRAWING_SHEETS.length) * 100);

export function ProjectOverview({ onBack, onNavigateToTakeoff, onNavigateTo, projectStatus, onStatusChange }: ProjectOverviewProps) {
  const daysUntilBid = 11;
  const urgent = daysUntilBid <= 14;

  return (
    <div style={{ backgroundColor: "#F6F7F9", minHeight: "100%" }}>
      <ProjectHeader
        activeTab="Overview"
        onNavigateTab={onNavigateTo}
        onBack={onBack}
        projectStatus={projectStatus}
        onStatusChange={onStatusChange}
        action={
          <button onClick={onNavigateToTakeoff} style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 14px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white", flexShrink: 0 }}>
            <Play size={12} fill="white" />
            Continue takeoff
          </button>
        }
      />

      <div className="bp-workspace" style={{ padding: 24, gap: 20, maxWidth: 1280, margin: "0 auto" }}>
        {/* Main column */}
        <div className="bp-main" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Next recommended action banner */}
          <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={18} color="white" fill="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1D4ED8" }}>Next recommended action</p>
              <p style={{ fontSize: 13, color: "#3B82F6" }}>Continue takeoff on Sheet E-101 — Lighting Level 1. You're 42% complete on this sheet.</p>
            </div>
            <button
              onClick={onNavigateToTakeoff}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white", flexShrink: 0 }}
            >
              Continue <ArrowRight size={13} />
            </button>
          </div>

          {/* Bid deadline warning */}
          {urgent && (
            <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={15} color="#D97706" />
              <p style={{ fontSize: 13, color: "#92400E" }}>
                <strong>Bid deadline in {daysUntilBid} days</strong> — Thursday, 24 July 2026 at 2:00 PM.
                Ensure estimate is reviewed and approved before then.
              </p>
            </div>
          )}

          {/* Summary grid */}
          <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Project summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
              {[
                { icon: Building2, label: "General contractor", value: "Summit Commercial Builders" },
                { icon: MapPin, label: "Location", value: "142 Crown St, Wollongong NSW 2500" },
                { icon: CalendarClock, label: "Bid due", value: "24 Jul 2026 · 2:00 PM", urgent: true },
                { icon: User, label: "Lead estimator", value: "James Mitchell" },
              ].map(({ icon: Icon, label, value, urgent }) => (
                <div key={label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <Icon size={13} color="#9CA3AF" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: urgent ? "#D97706" : "#111827", fontWeight: urgent ? 600 : 400, lineHeight: "17px" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Drawing processing */}
          <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Drawing processing</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "2px 7px", borderRadius: 4 }}>
                  {processedCount} / {DRAWING_SHEETS.length} sheets
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 120, height: 6, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${processingPct}%`, borderRadius: 999, backgroundColor: "#2563EB", transition: "width 500ms ease" }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#111827", fontWeight: 600 }}>{processingPct}%</span>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  {["Sheet", "Name", "Pages", "Status", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 14px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DRAWING_SHEETS.map((sheet) => {
                  const cfg = STATUS_CFG[sheet.status];
                  return (
                    <tr key={sheet.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#6B7280" }}>{sheet.id}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 13, color: "#111827" }}>{sheet.name}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#6B7280" }}>{sheet.pages}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, padding: "2px 7px", borderRadius: 4 }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "right" }}>
                        {sheet.status === "processed" && (
                          <button style={{ display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 5, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#374151", marginLeft: "auto" }}>
                            <Eye size={12} />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Estimate health */}
          <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Estimate health</span>
              <button onClick={() => onNavigateTo?.("bid-builder")} style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>Open bid builder</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {ESTIMATE_HEALTH.map((area, i) => {
                const cfg = STATUS_CFG[area.status];
                return (
                  <div key={area.area} style={{ padding: "10px 16px", borderBottom: i < ESTIMATE_HEALTH.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: area.pct > 0 ? 5 : 0 }}>
                        <span style={{ fontSize: 13, color: "#111827", fontWeight: 400 }}>{area.area}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {area.items > 0 && (
                            <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "#6B7280" }}>{area.items} items</span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, padding: "2px 7px", borderRadius: 4 }}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                      {area.pct > 0 && (
                        <div style={{ height: 4, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${area.pct}%`, borderRadius: 999, backgroundColor: "#7C3AED" }} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => onNavigateTo?.("bid-builder")} style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="bp-rail" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Contacts */}
          <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Contacts</span>
              <button onClick={() => toast.info("Contact management — coming soon")} style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>Add</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {CONTACTS.map((c, i) => (
                <div key={c.email} style={{ padding: "12px 14px", borderBottom: i < CONTACTS.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "white", flexShrink: 0 }}>
                      {c.name.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{c.name}</span>
                        {c.isQuoteRecipient && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "0px 5px", borderRadius: 3 }}>Quote</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#6B7280" }}>{c.role} · {c.company}</p>
                      <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: "#2563EB", display: "block", marginTop: 2 }}>{c.email}</a>
                      <p style={{ fontSize: 12, color: "#6B7280" }}>{c.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project files */}
          <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Project files</span>
              <button onClick={() => toast.info("File upload — opens file picker in production")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
                <Upload size={12} />
                Upload
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {FILES.map((f, i) => (
                <div key={f.name} style={{ padding: "10px 14px", borderBottom: i < FILES.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <FileIcon type={f.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF" }}>{f.size} · {f.uploaded}</p>
                  </div>
                  <button onClick={() => toast.success("Downloading file…")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0, display: "flex" }}>
                    <Download size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Activity</span>
              <button onClick={() => toast.info("Full activity log — coming soon")} style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>All activity</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", padding: "6px 0" }}>
              {ACTIVITY.map((item, i) => (
                <div key={i} style={{ padding: "8px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "white", flexShrink: 0 }}>
                    {item.user}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: "#4B5563", lineHeight: "15px" }}>{item.text}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
