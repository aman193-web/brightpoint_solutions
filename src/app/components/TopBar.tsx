import { Search, Bell, HelpCircle, Command, ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  active?: boolean;
}

interface TopBarProps {
  crumbs?: Crumb[];
  title: string;
  action?: React.ReactNode;
}

export function TopBar({ crumbs = [], title, action }: TopBarProps) {
  return (
    <header className="flex items-center gap-4 h-[54px] px-5 bg-white border-b border-[#E5E7EB] shrink-0">
      {/* Breadcrumbs + title */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className={[
                "text-[13px] truncate",
                crumb.active
                  ? "text-[#111827] font-medium"
                  : "text-[#6B7280] hover:text-[#4B5563] cursor-pointer",
              ].join(" ")}
            >
              {crumb.label}
            </span>
            {i < crumbs.length - 1 && (
              <ChevronRight size={12} className="text-[#D1D5DB] shrink-0" />
            )}
          </span>
        ))}
        {crumbs.length > 0 && (
          <ChevronRight size={12} className="text-[#D1D5DB] shrink-0" />
        )}
        <h1
          style={{ fontSize: 14, fontWeight: 600, lineHeight: "20px" }}
          className="text-[#111827] truncate"
        >
          {title}
        </h1>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search
            size={14}
            className="absolute left-2.5 text-[#9CA3AF] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 pl-8 pr-3 w-48 text-[13px] bg-[#F3F4F6] border border-transparent rounded-[6px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
          />
        </div>

        {/* Command menu */}
        <button
          className="hidden lg:flex items-center gap-1 h-8 px-2 rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#4B5563] transition-colors"
          title="Command menu (⌘K)"
        >
          <Command size={14} />
          <span className="text-[11px] font-medium text-[#9CA3AF]">⌘K</span>
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-8 h-8 rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#4B5563] transition-colors">
          <Bell size={16} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2563EB] rounded-full" />
        </button>

        {/* Help */}
        <button
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#4B5563] transition-colors"
          title="Help"
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-[#E5E7EB] mx-1" />

        {/* User avatar */}
        <button className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center">
          <span className="text-[11px] font-semibold text-white">JM</span>
        </button>

        {/* Primary action slot */}
        {action && <div className="ml-2">{action}</div>}
      </div>
    </header>
  );
}
