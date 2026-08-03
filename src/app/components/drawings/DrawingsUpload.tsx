import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { DemoStateBar } from "../common/DemoStateBar";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Lock,
  Ban,
  Copy,
  Loader2,
  WifiOff,
  ChevronRight,
  Plus,
  Pause,
  Info,
} from "lucide-react";

type FileState =
  | "queued"
  | "uploading"
  | "processing"
  | "complete"
  | "failed"
  | "duplicate"
  | "password-protected"
  | "unsupported";

interface UploadFile {
  id: string;
  name: string;
  sizeMB: number;
  pages?: number;
  state: FileState;
  progress?: number;
  error?: string;
}

type ScreenState = "empty" | "files-added" | "uploading" | "complete" | "partial-fail" | "all-failed" | "interrupted";

const DEMO_FILES: Record<ScreenState, UploadFile[]> = {
  empty: [],
  "files-added": [
    { id: "1", name: "Dollar-Tree-1842-E-Drawings-Rev2.pdf", sizeMB: 18.4, pages: 11, state: "queued" },
    { id: "2", name: "DT1842-Architectural-Drawings.pdf", sizeMB: 8.7, pages: 6, state: "queued" },
    { id: "3", name: "Specification-Division-26-Electrical.pdf", sizeMB: 2.1, pages: 48, state: "queued" },
  ],
  uploading: [
    { id: "1", name: "Dollar-Tree-1842-E-Drawings-Rev2.pdf", sizeMB: 18.4, pages: 11, state: "complete" },
    { id: "2", name: "DT1842-Architectural-Drawings.pdf", sizeMB: 8.7, pages: 6, state: "uploading", progress: 62 },
    { id: "3", name: "Specification-Division-26-Electrical.pdf", sizeMB: 2.1, pages: 48, state: "queued" },
  ],
  complete: [
    { id: "1", name: "Dollar-Tree-1842-E-Drawings-Rev2.pdf", sizeMB: 18.4, pages: 11, state: "complete" },
    { id: "2", name: "DT1842-Architectural-Drawings.pdf", sizeMB: 8.7, pages: 6, state: "complete" },
    { id: "3", name: "Specification-Division-26-Electrical.pdf", sizeMB: 2.1, pages: 48, state: "complete" },
  ],
  "partial-fail": [
    { id: "1", name: "Dollar-Tree-1842-E-Drawings-Rev2.pdf", sizeMB: 18.4, pages: 11, state: "complete" },
    { id: "2", name: "Confidential-Quote-Protected.pdf", sizeMB: 3.2, state: "password-protected" },
    { id: "3", name: "Specification-Division-26-Electrical.pdf", sizeMB: 2.1, pages: 48, state: "complete" },
    { id: "4", name: "Dollar-Tree-1842-E-Drawings-Rev2.pdf", sizeMB: 18.4, state: "duplicate" },
    { id: "5", name: "Site-Photos-July2026.zip", sizeMB: 42.1, state: "unsupported" },
    { id: "6", name: "Old-Riser-Diagram.pdf", sizeMB: 0.8, state: "failed", error: "File appears to be corrupted" },
  ],
  "all-failed": [
    { id: "1", name: "Large-Drawing-Set.pdf", sizeMB: 210.5, state: "failed", error: "File exceeds 200 MB maximum size" },
    { id: "2", name: "Another-Drawing.pdf", sizeMB: 8.2, state: "failed", error: "Upload failed — connection error" },
  ],
  interrupted: [
    { id: "1", name: "Dollar-Tree-1842-E-Drawings-Rev2.pdf", sizeMB: 18.4, state: "complete" },
    { id: "2", name: "DT1842-Architectural-Drawings.pdf", sizeMB: 8.7, state: "uploading", progress: 31 },
    { id: "3", name: "Specification-Division-26-Electrical.pdf", sizeMB: 2.1, state: "queued" },
  ],
};

function fmtSize(mb: number) {
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(mb * 1024)} KB`;
}

function FileStateIcon({ state }: { state: FileState }) {
  if (state === "complete") return <CheckCircle size={16} color="#16A34A" />;
  if (state === "uploading" || state === "processing") return <Loader2 size={16} color="#2563EB" className="animate-spin" />;
  if (state === "failed") return <AlertCircle size={16} color="#DC2626" />;
  if (state === "duplicate") return <Copy size={16} color="#D97706" />;
  if (state === "password-protected") return <Lock size={16} color="#D97706" />;
  if (state === "unsupported") return <Ban size={16} color="#9CA3AF" />;
  return <FileText size={16} color="#9CA3AF" />;
}

function FileRow({ file, onRetry, onRemove }: { file: UploadFile; onRetry?: (id: string) => void; onRemove?: (id: string) => void }) {
  const stateLabels: Record<FileState, string> = {
    queued: "Queued",
    uploading: `Uploading${file.progress !== undefined ? ` ${file.progress}%` : ""}`,
    processing: "Processing…",
    complete: "Ready",
    failed: file.error ?? "Failed",
    duplicate: "Duplicate file detected",
    "password-protected": "Password protected — cannot open",
    unsupported: "Unsupported file type",
  };

  const stateColors: Record<FileState, string> = {
    queued: "#9CA3AF",
    uploading: "#2563EB",
    processing: "#7C3AED",
    complete: "#16A34A",
    failed: "#DC2626",
    duplicate: "#D97706",
    "password-protected": "#D97706",
    unsupported: "#9CA3AF",
  };

  const isError = ["failed", "duplicate", "password-protected", "unsupported"].includes(file.state);
  const rowBg = isError ? (file.state === "unsupported" ? "#F9FAFB" : file.state === "duplicate" || file.state === "password-protected" ? "#FFFBEB" : "#FEF2F2") : "white";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", backgroundColor: rowBg, borderBottom: "1px solid #E5E7EB" }}>
      <FileStateIcon state={file.state} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>
            {file.name}
          </span>
          {file.pages && file.state === "complete" && (
            <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>{file.pages} pages</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 12, color: stateColors[file.state] }}>{stateLabels[file.state]}</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>{fmtSize(file.sizeMB)}</span>
        </div>
        {/* Progress bar */}
        {file.state === "uploading" && file.progress !== undefined && (
          <div style={{ marginTop: 6, height: 3, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${file.progress}%`, borderRadius: 999, backgroundColor: "#2563EB", transition: "width 300ms ease" }} />
          </div>
        )}
        {/* Error action */}
        {file.state === "failed" && (
          <button
            onClick={() => onRetry?.(file.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <RefreshCw size={11} />
            Retry
          </button>
        )}
        {file.state === "password-protected" && (
          <span style={{ fontSize: 12, color: "#6B7280", marginTop: 3, display: "block" }}>
            Remove the password protection and re-upload.
          </span>
        )}
        {file.state === "duplicate" && (
          <span style={{ fontSize: 12, color: "#6B7280", marginTop: 3, display: "block" }}>
            A file with this name already exists in this project. Rename or remove it.
          </span>
        )}
        {file.state === "unsupported" && (
          <span style={{ fontSize: 12, color: "#6B7280", marginTop: 3, display: "block" }}>
            Only PDF files are supported. Maximum 200 MB per file.
          </span>
        )}
      </div>
      {/* Actions */}
      {file.state === "uploading" && (
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2 }}>
          <Pause size={14} />
        </button>
      )}
      <button
        onClick={() => onRemove?.(file.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2, flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface DrawingsUploadProps {
  onBeginProcessing: () => void;
  projectName?: string;
}

export function DrawingsUpload({ onBeginProcessing, projectName = "Dollar Tree Retail Fit-Out — Store 1842" }: DrawingsUploadProps) {
  const [screenState, setScreenState] = useState<ScreenState>("partial-fail");
  const [isDragging, setIsDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>(DEMO_FILES["partial-fail"]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyDemoState(state: ScreenState) {
    setScreenState(state);
    setFiles(DEMO_FILES[state]);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    applyDemoState("uploading");
  }, []);

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const validFiles = files.filter((f) => f.state === "complete" || f.state === "uploading" || f.state === "queued");
  const errorFiles = files.filter((f) => ["failed", "duplicate", "password-protected", "unsupported"].includes(f.state));
  const allComplete = files.length > 0 && files.every((f) => f.state === "complete");
  const anyComplete = files.some((f) => f.state === "complete");
  const isUploading = files.some((f) => f.state === "uploading");
  const totalPages = files.filter((f) => f.state === "complete").reduce((a, f) => a + (f.pages ?? 0), 0);

  return (
    <div style={{ backgroundColor: "#F6F7F9", minHeight: "100%", padding: "0 24px 24px" }}>
      <DemoStateBar
        label="Upload state"
        inset={0}
        states={["empty", "files-added", "uploading", "complete", "partial-fail", "all-failed", "interrupted"] as ScreenState[]}
        value={screenState}
        onChange={applyDemoState}
      />

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Upload drawings</h2>
          <p style={{ fontSize: 13, color: "#6B7280" }}>{projectName} — Upload PDF drawing sets to begin processing.</p>
        </div>

        {/* Connection interrupted banner */}
        {screenState === "interrupted" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, marginBottom: 16 }}>
            <WifiOff size={15} color="#DC2626" />
            <p style={{ fontSize: 13, color: "#991B1B", flex: 1 }}>
              <strong>Connection interrupted.</strong> Uploads have been paused. Check your connection and resume.
            </p>
            <button
              onClick={() => { toast.loading('Reconnecting…'); setTimeout(() => { toast.dismiss(); toast.success('Connection restored'); }, 1500); }}
              style={{ height: 30, padding: "0 12px", border: "1px solid #FCA5A5", borderRadius: 5, backgroundColor: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#DC2626" }}>
              Resume
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => screenState === "empty" && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "#2563EB" : "#D1D5DB"}`,
            borderRadius: 8,
            backgroundColor: isDragging ? "#EFF6FF" : screenState === "empty" ? "white" : "#FAFAFA",
            padding: screenState === "empty" ? "48px 24px" : "16px 20px",
            textAlign: "center",
            transition: "all 150ms",
            cursor: screenState === "empty" ? "pointer" : "default",
            marginBottom: files.length > 0 ? 0 : 16,
            borderBottom: files.length > 0 ? "none" : undefined,
            borderBottomLeftRadius: files.length > 0 ? 0 : 8,
            borderBottomRightRadius: files.length > 0 ? 0 : 8,
          }}
        >
          {screenState === "empty" ? (
            <div>
              <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Upload size={24} color="#2563EB" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Drop PDF files here</p>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>or click to browse your files</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", fontSize: 13, fontWeight: 500, color: "#374151" }}>
                <Plus size={14} />
                Choose files
              </div>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 14 }}>PDF only · Maximum 200 MB per file · Multiple files supported</p>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Upload size={16} color={isDragging ? "#2563EB" : "#6B7280"} />
                <span style={{ fontSize: 13, color: isDragging ? "#2563EB" : "#6B7280" }}>
                  {isDragging ? "Drop files to add" : "Drag more PDFs here or"}
                </span>
                {!isDragging && (
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ fontSize: 13, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    browse files
                  </button>
                )}
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>PDF · max 200 MB</span>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={() => applyDemoState("files-added")} />

        {/* File list */}
        {files.length > 0 && (
          <div style={{ border: "1px solid #E5E7EB", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden", backgroundColor: "white" }}>
            {files.map((f) => (
              <FileRow key={f.id} file={f} onRetry={() => {}} onRemove={removeFile} />
            ))}
          </div>
        )}

        {/* Summary + CTA */}
        {files.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            {/* Stats */}
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Files ready", value: validFiles.filter((f) => f.state === "complete").length.toString() },
                { label: "Total pages", value: totalPages > 0 ? totalPages.toString() : "—" },
                { label: "Issues", value: errorFiles.length > 0 ? errorFiles.length.toString() : "None" },
              ].map((s) => (
                <div key={s.label}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: s.label === "Issues" && errorFiles.length > 0 ? "#D97706" : "#111827", fontFamily: "IBM Plex Mono, monospace" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              {isUploading && (
                <button
                  onClick={() => { setPaused(v => !v); toast.info(paused ? 'Upload resumed' : 'Upload paused'); }}
                  style={{ height: 38, padding: "0 16px", border: "1px solid #D1D5DB", borderRadius: 6, backgroundColor: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}>
                  Pause all
                </button>
              )}
              {errorFiles.length > 0 && anyComplete && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12, color: "#92400E" }}>
                  <Info size={13} color="#D97706" />
                  {errorFiles.length} file{errorFiles.length > 1 ? "s" : ""} will be skipped
                </div>
              )}
              <button
                onClick={onBeginProcessing}
                disabled={!anyComplete}
                style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 20px", border: "none", borderRadius: 6, backgroundColor: anyComplete ? "#2563EB" : "#D1D5DB", color: "white", cursor: anyComplete ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 500 }}
              >
                Begin processing
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Size guidance */}
        <div style={{ marginTop: 20, padding: "10px 14px", backgroundColor: "white", border: "1px solid #E5E7EB", borderRadius: 6 }}>
          <p style={{ fontSize: 12, color: "#6B7280", lineHeight: "17px" }}>
            <strong style={{ color: "#374151" }}>Tips:</strong> For best results, upload full drawing sets rather than individual sheets. Large files (&gt;100 MB) may take several minutes to process. You can leave this page while processing continues in the background.
          </p>
        </div>
      </div>
    </div>
  );
}
