import { useState } from "react";
import { Eye, EyeOff, Shield, Zap, Loader2, AlertCircle, AlertTriangle, Info, WifiOff, Lock, FlaskConical, X } from "lucide-react";

type AuthError =
  | "incorrect-password"
  | "unknown-account"
  | "account-locked"
  | "network-failure"
  | "session-expired";

interface SignInScreenProps {
  onSignIn: (firstTime?: boolean) => void;
  initialError?: AuthError;
}

const ERROR_CONFIG: Record<AuthError, { title: string; message: string; icon: typeof AlertCircle; accent: string; bg: string; border: string }> = {
  "incorrect-password": {
    title: "Incorrect password",
    message: "The password you entered is incorrect. Please try again or reset your password.",
    icon: AlertCircle,
    accent: "#DC2626",
    bg: "#FEF2F2",
    border: "#FCA5A5",
  },
  "unknown-account": {
    title: "Account not found",
    message: "No account exists with that email address. Check the address or contact your administrator.",
    icon: AlertCircle,
    accent: "#DC2626",
    bg: "#FEF2F2",
    border: "#FCA5A5",
  },
  "account-locked": {
    title: "Account locked",
    message: "Too many failed attempts. Your account has been locked for 30 minutes. Contact support if you need immediate access.",
    icon: Lock,
    accent: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  "network-failure": {
    title: "Connection problem",
    message: "Unable to reach Brightpoint servers. Check your internet connection and try again.",
    icon: WifiOff,
    accent: "#6B7280",
    bg: "#F9FAFB",
    border: "#D1D5DB",
  },
  "session-expired": {
    title: "Session expired",
    message: "Your session has expired due to inactivity. Please sign in again to continue.",
    icon: Info,
    accent: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
};

const DEMO_STATES: { label: string; value: AuthError | "default" }[] = [
  { label: "Default", value: "default" },
  { label: "Wrong password", value: "incorrect-password" },
  { label: "Unknown account", value: "unknown-account" },
  { label: "Locked", value: "account-locked" },
  { label: "Network error", value: "network-failure" },
  { label: "Session expired", value: "session-expired" },
];

export function SignInScreen({ onSignIn, initialError }: SignInScreenProps) {
  const [email, setEmail] = useState("james.mitchell@acmeelectrical.com.au");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(initialError ?? null);
  const [demoState, setDemoState] = useState<AuthError | "default">(initialError ?? "default");
  const [showDemoStates, setShowDemoStates] = useState(false);

  function applyDemoState(state: AuthError | "default") {
    setDemoState(state);
    setError(state === "default" ? null : state);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || error === "account-locked") return;
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    setLoading(false);
    onSignIn(false);
  }

  const errCfg = error ? ERROR_CONFIG[error] : null;
  const isLocked = error === "account-locked";
  const inputBorder = (field: "email" | "password") => {
    if (field === "email" && error === "unknown-account") return "#FCA5A5";
    if (field === "password" && error === "incorrect-password") return "#FCA5A5";
    return "#D1D5DB";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F6F7F9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Demo state switcher — collapsed to a single icon so it does not read
          as part of the sign-in screen. */}
      {showDemoStates ? (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            backgroundColor: "white",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            padding: "10px 14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>
              Demo states
            </p>
            <button
              onClick={() => setShowDemoStates(false)}
              aria-label="Hide demo states"
              style={{ width: 20, height: 20, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={12} color="#9CA3AF" />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {DEMO_STATES.map((s) => (
              <button
                key={s.value}
                onClick={() => applyDemoState(s.value)}
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: demoState === s.value ? 600 : 400,
                  color: demoState === s.value ? "#2563EB" : "#4B5563",
                  background: demoState === s.value ? "#EFF6FF" : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDemoStates(true)}
          title="Demo states"
          aria-label="Show demo states"
          style={{
            position: "fixed", top: 16, right: 16, zIndex: 100,
            width: 24, height: 24, border: "1px solid #E5E7EB", borderRadius: 6,
            background: "white", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <FlaskConical size={12} color="#9CA3AF" />
        </button>
      )}

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={22} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>Brightpoint</span>
        </div>
        <p style={{ fontSize: 13, color: "#6B7280" }}>Electrical Estimating Software</p>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "white",
          borderRadius: 12,
          border: "1px solid #E5E7EB",
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          Sign in to your account
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>
          Welcome back. Enter your credentials to continue.
        </p>

        {/* Error banner */}
        {errCfg && (
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 6,
              backgroundColor: errCfg.bg,
              border: `1px solid ${errCfg.border}`,
              marginBottom: 20,
            }}
          >
            <errCfg.icon size={15} style={{ color: errCfg.accent, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{errCfg.title}</p>
              <p style={{ fontSize: 12, color: "#4B5563", marginTop: 2, lineHeight: "16px" }}>{errCfg.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@company.com"
              autoComplete="email"
              required
              disabled={isLocked || loading}
              style={{
                width: "100%",
                height: 38,
                padding: "0 12px",
                borderRadius: 6,
                border: `1px solid ${inputBorder("email")}`,
                fontSize: 14,
                color: "#111827",
                backgroundColor: isLocked || loading ? "#F9FAFB" : "white",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms",
              }}
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Password</label>
              <button
                type="button"
                style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLocked || loading}
                style={{
                  width: "100%",
                  height: 38,
                  padding: "0 38px 0 12px",
                  borderRadius: 6,
                  border: `1px solid ${inputBorder("password")}`,
                  fontSize: 14,
                  color: "#111827",
                  backgroundColor: isLocked || loading ? "#F9FAFB" : "white",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 150ms",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer" }}
            />
            <label htmlFor="remember" style={{ fontSize: 13, color: "#4B5563", cursor: "pointer" }}>
              Remember me for 30 days
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isLocked}
            style={{
              height: 40,
              backgroundColor: loading || isLocked ? "#93C5FD" : "#2563EB",
              color: "white",
              borderRadius: 6,
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading || isLocked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background-color 150ms",
              marginTop: 4,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
        </div>

        {/* SSO */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            {
              name: "Google",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              ),
            },
            {
              name: "Microsoft",
              icon: (
                <svg width="16" height="16" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
              ),
            },
          ].map((sso) => (
            <button
              key={sso.name}
              style={{
                flex: 1,
                height: 38,
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {sso.icon}
              {sso.name}
            </button>
          ))}
        </div>

        {/* First time */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => onSignIn(true)}
            style={{ fontSize: 13, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            First time?{" "}
            <span style={{ color: "#2563EB", fontWeight: 500 }}>Set up your account</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#9CA3AF" }}>
          <Shield size={12} />
          <span style={{ fontSize: 12 }}>Secured with TLS 1.3 encryption</span>
        </div>
        <span style={{ color: "#D1D5DB" }}>·</span>
        <button style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer" }}>
          Privacy policy
        </button>
        <span style={{ color: "#D1D5DB" }}>·</span>
        <button style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer" }}>
          Support
        </button>
      </div>
    </div>
  );
}
