import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { NavSidebar } from "./components/NavSidebar";
import { TopBar } from "./components/TopBar";
import { DashboardView } from "./components/DashboardView";
import { SignInScreen } from "./components/auth/SignInScreen";
import { OnboardingFlow } from "./components/auth/OnboardingFlow";
import { ProjectsList } from "./components/projects/ProjectsList";
import { CreateProjectWizard } from "./components/projects/CreateProjectWizard";
import { ProjectOverview } from "./components/projects/ProjectOverview";
import { DrawingsWorkspace } from "./components/drawings/DrawingsWorkspace";
import { TakeoffWorkspace } from "./components/workspace/TakeoffWorkspace";
import { LibraryView } from "./components/library/LibraryView";
import { PricingWorkspace } from "./components/pricing/PricingWorkspace";
import { ProjectBreakdownView } from "./components/projects/ProjectBreakdownView";
import { BidBuilder } from "./components/bid/BidBuilder";
import { ProposalCenter } from "./components/proposal/ProposalCenter";
import { ReportsView } from "./components/reports/ReportsView";
import { SettingsView } from "./components/settings/SettingsView";
import { CommandMenu } from "./components/common/CommandMenu";
import { AiAssistant } from "./components/common/AiAssistant";

type AppState = "signin" | "onboarding" | "app";
type AppPage =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "create-project"
  | "drawings"
  | "project-breakdown"
  | "takeoff-workspace"
  | "libraries"
  | "pricing"
  | "bid-builder"
  | "proposal-center"
  | "reports"
  | "team"
  | "settings"
  | "placeholder";

/** Page ids renamed in the 2026 project-workspace update. */
const PAGE_ALIASES: Record<string, AppPage> = {
  "estimate-builder": "bid-builder",
  "quote-builder": "proposal-center",
  // Upload / processing / review are steps inside the Drawings tab now.
  "drawings-upload": "drawings",
  "drawings-processing": "drawings",
  "drawings-organize": "drawings",
};

const NAV_PAGE_MAP: Record<string, AppPage> = {
  dashboard: "dashboard",
  projects: "projects",
  estimates: "bid-builder",
  libraries: "libraries",
  reports: "reports",
  team: "team",
  settings: "settings",
};

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  estimates: "Estimates",
  libraries: "Libraries",
  reports: "Reports",
  team: "Team & Access",
  settings: "Settings",
};

const PLACEHOLDER_ICONS: Record<string, string> = {
  estimates: "📋",
  libraries: "📚",
  reports: "📊",
  team: "👥",
  settings: "⚙️",
};

const PROJECT_NAME = "Dollar Tree Retail Fit-Out — Store 1842";

/** Project-scoped pages that render the shared ProjectHeader themselves. */
const PROJECT_PAGES: AppPage[] = ["project-detail", "drawings", "project-breakdown", "pricing", "bid-builder", "proposal-center"];

// Pages that take full height with their own header — no shell TopBar
const FULL_HEIGHT_PAGES: AppPage[] = ["create-project", "takeoff-workspace"];

export default function App() {
  const [appState, setAppState] = useState<AppState>("signin");
  const [activePage, setActivePage] = useState<AppPage>("dashboard");
  const [activeNavItem, setActiveNavItem] = useState("dashboard");
  /**
   * The nav rail starts collapsed on every screen — the estimating workspaces
   * want the width, and the icon rail is enough to navigate by. Expanding is
   * one click and sticks for the session.
   */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string>("takeoff");

  // Collapse the nav rail on narrow viewports. The toggle still works — this
  // only forces the collapsed state when there isn't room for the full rail.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth < 1024) setSidebarCollapsed(true);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Global Cmd+K handler
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandMenu((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleNavigateTo(page: string) {
    const target = PAGE_ALIASES[page] ?? (page as AppPage);
    setActivePage(target);
    // Keep nav item in sync for known top-level pages. Project-scoped pages
    // (pricing / bid-builder / proposal-center) deliberately leave the sidebar
    // selection alone — they are reached from inside a project.
    const navReverse: Record<string, string> = {
      dashboard: "dashboard", projects: "projects",
      libraries: "libraries", reports: "reports", team: "team", settings: "settings",
    };
    if (navReverse[target]) setActiveNavItem(navReverse[target]);
  }

  function handleSignIn(firstTime?: boolean) {
    if (firstTime) {
      setAppState("onboarding");
    } else {
      setAppState("app");
    }
  }

  function handleOnboardingComplete() {
    setAppState("app");
    setActivePage("dashboard");
    setActiveNavItem("dashboard");
  }

  function handleNavChange(id: string) {
    setActiveNavItem(id);
    setActivePage(NAV_PAGE_MAP[id] ?? "placeholder");
  }

  function handleOpenProject(_id: string) {
    setActivePage("project-detail");
  }

  function handleNewProject() {
    setActivePage("create-project");
  }

  function handleProjectCreated(_projectId: string) {
    setActivePage("project-detail");
  }

  function handleBackToProjects() {
    setActivePage("projects");
    setActiveNavItem("projects");
  }

  function handleOpenDrawings() {
    setActivePage("drawings");
  }

  function handleOpenTakeoff() {
    setActivePage("takeoff-workspace");
  }

  function handleStatusChange(s: string) {
    setProjectStatus(s);
    toast.success("Status updated", { description: `Project is now ${s}.` });
  }

  // Auth screens — full page, no shell
  if (appState === "signin") {
    return (
      <>
        <SignInScreen onSignIn={handleSignIn} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  if (appState === "onboarding") {
    return (
      <>
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onExit={() => { setAppState("app"); setActivePage("dashboard"); }}
        />
        <Toaster position="bottom-right" />
      </>
    );
  }

  // Takeoff workspace — full-screen, no shell
  if (activePage === "takeoff-workspace") {
    return (
      <>
        <TakeoffWorkspace onExit={() => setActivePage("project-detail")} />
        <AiAssistant page={activePage} screenLabel={PROJECT_NAME} />
        <Toaster position="bottom-right" offset={84} />
      </>
    );
  }

  // Top bar breadcrumbs + title
  const showTopBar = !FULL_HEIGHT_PAGES.includes(activePage);
  const isProjectPage = PROJECT_PAGES.includes(activePage);
  const crumbs: { label: string }[] = [];
  if (isProjectPage) crumbs.push({ label: "Projects" });

  const topBarTitle =
    isProjectPage ? PROJECT_NAME
    : activePage === "create-project" ? "New project"
    : PAGE_TITLES[activeNavItem] ?? "Dashboard";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#F6F7F9" }}>
      <NavSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        activeItem={activeNavItem}
        onNavigate={handleNavChange}
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {showTopBar && (
          <TopBar
            crumbs={crumbs}
            title={topBarTitle}
            action={
              (activePage === "dashboard" || activePage === "projects") ? (
                <button
                  onClick={handleNewProject}
                  style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 14px", border: "none", borderRadius: 6, backgroundColor: "#2563EB", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "white" }}
                >
                  + New project
                </button>
              ) : null
            }
          />
        )}

        <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {activePage === "dashboard" && (
            <DashboardView onOpenProject={handleOpenProject} onNewProject={handleNewProject} onNavigateTo={handleNavigateTo} projectStatus={projectStatus} />
          )}
          {activePage === "projects" && (
            <ProjectsList onOpenProject={handleOpenProject} onNewProject={handleNewProject} />
          )}
          {activePage === "project-detail" && (
            <ProjectOverview
              onBack={handleBackToProjects}
              onNavigateToTakeoff={handleOpenTakeoff}
              onOpenDrawings={handleOpenDrawings}
              onNavigateTo={handleNavigateTo}
              projectStatus={projectStatus}
              onStatusChange={handleStatusChange}
            />
          )}
          {activePage === "create-project" && (
            <CreateProjectWizard
              onComplete={handleProjectCreated}
              onCancel={() => setActivePage(activeNavItem === "projects" ? "projects" : "dashboard")}
            />
          )}
          {activePage === "drawings" && (
            <DrawingsWorkspace
              onBack={handleBackToProjects}
              onNavigateTo={handleNavigateTo}
              onContinueToTakeoff={handleOpenTakeoff}
              projectStatus={projectStatus}
              onStatusChange={handleStatusChange}
            />
          )}
          {activePage === "project-breakdown" && (
            <ProjectBreakdownView onNavigateTo={handleNavigateTo} />
          )}
          {activePage === "libraries" && <LibraryView />}
          {activePage === "pricing" && (
            <PricingWorkspace
              onNavigateTo={handleNavigateTo}
              onBack={handleBackToProjects}
              projectStatus={projectStatus}
              onStatusChange={handleStatusChange}
            />
          )}
          {activePage === "bid-builder" && (
            <BidBuilder
              onNavigateTo={handleNavigateTo}
              onBack={handleBackToProjects}
              projectStatus={projectStatus}
              onStatusChange={handleStatusChange}
            />
          )}
          {activePage === "proposal-center" && (
            <ProposalCenter
              onNavigateTo={handleNavigateTo}
              onBack={handleBackToProjects}
              projectStatus={projectStatus}
              onStatusChange={handleStatusChange}
            />
          )}
          {activePage === "reports" && <ReportsView />}
          {activePage === "team" && <SettingsView initialTab={"team" as any} />}
          {activePage === "settings" && <SettingsView initialTab="company" />}
          {activePage === "placeholder" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 48 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 26 }}>
                {PLACEHOLDER_ICONS[activeNavItem] ?? "🚧"}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
                {PAGE_TITLES[activeNavItem]} — coming soon
              </h2>
              <p style={{ fontSize: 14, color: "#6B7280", maxWidth: 340, lineHeight: "20px" }}>
                This screen will be built as a feature screen in the next prompt.
              </p>
            </div>
          )}
        </main>
      </div>
      {/*
        Available from every screen inside the app except Libraries, where the
        launcher lands on the BOM panel's own Add to Takeoff action.
      */}
      {activePage !== "libraries" && (
        <AiAssistant page={activePage} screenLabel={isProjectPage ? PROJECT_NAME : undefined} />
      )}
      <Toaster position="bottom-right" offset={84} />
      <CommandMenu
        isOpen={showCommandMenu}
        onClose={() => setShowCommandMenu(false)}
        onNavigate={handleNavigateTo}
      />
    </div>
  );
}
