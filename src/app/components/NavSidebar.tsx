import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  BookOpen,
  BarChart2,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Zap,
  ChevronsUpDown,
  Bell,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

/**
 * `hidden` keeps a destination out of the sidebar without removing its route —
 * the screen still exists and is reachable in code, it just isn't advertised.
 * Flip the flag to bring one back.
 */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderOpen, badge: 3 },
  { id: "estimates", label: "Estimates", icon: FileText, hidden: true },
  { id: "libraries", label: "Libraries", icon: BookOpen },
  { id: "reports", label: "Reports", icon: BarChart2, hidden: true },
  { id: "team", label: "Team", icon: Users, hidden: true },
  { id: "settings", label: "Settings", icon: Settings },
];

const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.hidden);

interface NavSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onNavigate: (id: string) => void;
}

export function NavSidebar({ collapsed, onToggle, activeItem, onNavigate }: NavSidebarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside
        style={{
          width: collapsed ? 68 : 240,
          minWidth: collapsed ? 68 : 240,
          transition: "width 220ms ease-out, min-width 220ms ease-out",
        }}
        className="flex flex-col h-full bg-white border-r border-[#E5E7EB] overflow-hidden"
      >
        {/* Logo + workspace switcher */}
        <div className="flex items-center gap-2 px-3 h-[54px] border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-[8px] bg-[#2563EB] shrink-0">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-[#111827] truncate block leading-tight">
                Brightpoint
              </span>
              <span className="text-[11px] text-[#6B7280] truncate block leading-tight">
                Acme Electrical Co.
              </span>
            </div>
          )}
          {!collapsed && (
            <button className="text-[#9CA3AF] hover:text-[#4B5563] transition-colors">
              <ChevronsUpDown size={14} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {VISIBLE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            const button = (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={[
                  "flex items-center gap-3 w-full px-3 py-2 mx-0 rounded-[6px] transition-colors duration-100 relative",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-[#EFF6FF] text-[#2563EB]"
                    : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]",
                ].join(" ")}
                style={{ margin: "1px 8px", width: "calc(100% - 16px)" }}
              >
                <Icon
                  size={18}
                  className="shrink-0"
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {!collapsed && (
                  <span className="text-[13px] font-medium truncate flex-1 text-left">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-[11px] font-semibold bg-[#2563EB] text-white rounded-full px-1.5 py-0.5 leading-none">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#2563EB] rounded-full" />
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-[#E5E7EB] py-2">
          {/* Help */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-full py-2 text-[#6B7280] hover:text-[#111827] transition-colors"
                  style={{ margin: "1px 8px", width: "calc(100% - 16px)" }}
                >
                  <HelpCircle size={18} strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Help</TooltipContent>
            </Tooltip>
          ) : (
            <button
              className="flex items-center gap-3 w-full px-3 py-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] rounded-[6px] transition-colors"
              style={{ margin: "1px 8px", width: "calc(100% - 16px)" }}
            >
              <HelpCircle size={18} strokeWidth={1.75} className="shrink-0" />
              <span className="text-[13px] font-medium">Help & support</span>
            </button>
          )}

          {/* User profile */}
          <div
            className={[
              "flex items-center gap-2 px-3 py-2 mx-2 rounded-[6px] cursor-pointer hover:bg-[#F3F4F6] transition-colors",
              collapsed ? "justify-center px-0" : "",
            ].join(" ")}
          >
            <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-white">JM</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111827] truncate leading-tight">
                  James Mitchell
                </p>
                <p className="text-[11px] text-[#6B7280] truncate leading-tight">
                  Senior Estimator
                </p>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            className={[
              "flex items-center gap-2 w-full py-1.5 text-[#9CA3AF] hover:text-[#4B5563] transition-colors text-[12px] font-medium",
              collapsed ? "justify-center px-0 mt-1" : "px-3 mt-1",
            ].join(" ")}
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
