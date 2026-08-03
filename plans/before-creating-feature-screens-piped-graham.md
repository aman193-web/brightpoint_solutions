# Plan: Prompt 6 — Pricing, Estimates, Quotes, Reports, Settings, Command Menu

## Context

Prompts 1–4 are complete: design tokens, auth/onboarding, dashboard, projects, drawings upload/processing/organize, and the full-screen takeoff workspace. Prompt 5 adds the assembly and item library ecosystem — the screens estimators use to search, build, and manage the electrical assemblies that drive the takeoff quantities and costs.

All previously approved screens, components, tokens, and navigation patterns remain untouched. Only new files and minimal targeted changes to existing files are introduced.

---

## New AppPage Types

Add to `AppPage` union in `src/app/App.tsx`:
```
"libraries" | "assembly-builder"
```

Change `NAV_PAGE_MAP.libraries` from `"placeholder"` to `"libraries"`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/components/library/LibraryView.tsx` | Main library screen (~950 lines) — tabs: Assembly Browser, Assembly Builder, Job Libraries, Master Items |
| `src/app/components/library/AssemblyPanel.tsx` | Workspace slide-in panel (~380 lines) — compact assembly browser triggered from right inspector |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/App.tsx` | Add `"libraries"` page type; wire Libraries nav; render `<LibraryView>` |
| `src/app/components/workspace/TakeoffWorkspace.tsx` | Add `showAssemblyPanel` state + `Package` icon import + render `<AssemblyPanel>` overlay + wire "Change assembly" / "View assembly" buttons |

---

## LibraryView.tsx — Architecture

### Tab navigation
Top-level horizontal tab strip: **Assembly Browser** | **Assembly Builder** | **Job Libraries** | **Master Items**

Tabs use Radix `@radix-ui/react-tabs` primitives (already installed). Active tab stored in `activeTab` state.

### Assembly Browser tab layout
```
┌─── 220px FilterSidebar ───┬──────── Results (flex-1) ────────────┬── 0 or 400px Detail panel ──┐
│ Categories tree           │ SemanticSearchBar                    │ Assembly full detail         │
│ Filter groups             │ [active filter chips]                │ Material table               │
│  • Discipline             │ [AI interpretation row]              │ Labour + cost calc           │
│  • Install type           │ AssemblyCard × N                     │ Edit / Create copy           │
│  • Indoor/outdoor         │ (list or 2-col grid)                 │                              │
│  • Hospital grade         │                                      │                              │
└───────────────────────────┴──────────────────────────────────────┴──────────────────────────────┘
```

### AssemblyCard states (visual variants)
- **Default** — standard card
- **Hover** — subtle shadow lift (onMouseEnter state)
- **Selected** — `border: 2px solid #2563EB` 
- **Favorite** — filled `Star` icon (yellow fill)
- **Incompatible** — amber warning chip: "Incompatible with project"
- **Missing price** — red indicator + "Missing price" chip
- **Recently updated** — blue "Updated" badge
- **System locked** — `Lock` icon + gray tinted header; "System assembly — read only"

### Semantic search
- Input with `Sparkles` purple icon button toggling semantic ON/OFF
- When semantic active and query matches: light purple banner showing "AI interpreted:" + parsed attribute chips (e.g. "Recessed fixture", "ACT ceiling", "MC cable")
- Chips above results: removable active-filter pills
- Hard-coded semantic query interpretations for a few demo queries; keyword fallback for all others

### Assembly detail panel
Slides in from right (400px) when an assembly is clicked:
- Header: name, source badge, version, locked/edit
- Conditions row: ceilingType, cableType, installationType, indoor/outdoor, hospital-grade
- Materials table: description, qty, unit, unit cost, total
- Labour row: hrs/unit, grade, total hrs
- Cost summary: material, labour, overhead, margin, total sell
- Actions: "Use for takeoff", "Add to favorites", "Create company copy" (for system), "Edit" (for company/project)

### Assembly Builder tab layout (3-panel)
Uses `react-resizable-panels` (already installed: `react-resizable-panels@2.1.7`):
```
┌── 240px Master Items ──┬───────── Assembly Canvas (flex) ─────────┬── 280px Properties ──┐
│ Search + filter        │ Assembly name (editable)                  │ Name / Description   │
│ Category tree          │ Drop zone: drag items here                │ Discipline / Category│
│ Item list with         │ ─────────────────────────────             │ Conditions           │
│  [+] click-to-add      │ ⠿ Item 1  qty [1] formula [1/unit]  [×]  │ Labour profile       │
│                        │ ⠿ Item 2  qty [2] waste [5%]         [×]  │ ─────────────────    │
│                        │ ⠿ Item 3  optional checkbox          [×]  │ BOM summary          │
│                        │ [+ Add from library]                      │ Mat: $xx.xx          │
│                        │                                           │ Labour: x.x hrs      │
└────────────────────────┴───────────────────────────────────────────┴──────────────────────┘
```

Uses `react-dnd` (already installed: `react-dnd@16.0.1`, `react-dnd-html5-backend@16.0.1`) for drag from item list → canvas. Fallback: click `+` to add.

Each canvas row has: `GripVertical` drag handle, description, qty input, formula input, waste %, optional checkbox, delete button.

Save actions at bottom: "Save to project library" / "Save to company library" / "Save as system" (admin-only, grayed out).

### Job Libraries tab
3-column responsive grid of library cards. Each card shows: name, assembly count, project count, labour profile, shared/private badge, isDefault crown. Actions via `MoreHorizontal` dropdown: Rename, Duplicate, Set as default, Share, Archive.

Create new library: blue "New library" button at top right — opens inline create form with name, description, base-on selector.

### Master Items tab — virtual scrolling table
Fixed-height container (`calc(100vh - 260px)`). Row height 40px (comfortable) / 32px (compact). Windowed rendering: track `scrollTop` via `onScroll`; compute `firstVisible = floor(scrollTop / ROW_H) - BUFFER`; render only visible slice with `paddingTop`/`paddingBottom` spacers on a wrapper `<div>`.

**Columns** (all sortable by header click):
`code`, `description` (frozen/sticky via `position:sticky left:100px`), `category`, `manufacturer`, `partNumber`, `unit`, `materialPrice`, `labourL1`, `labourL2`, `labourL3`, `pricingSource`, `updatedDate`, `status`

**Toolbar above table:**
- Search input
- Category filter dropdown
- Status filter dropdown
- Density toggle: Comfortable / Compact
- Saved views dropdown (mock)
- Export button (mock)
- Import button (mock)
- `+ New item` button

**Row features:**
- Checkbox selection (bulk actions appear in toolbar: Delete, Export, Change category)
- `Lock` icon for system items (no inline edit for those)
- Double-click non-system cell → inline edit mode (input replaces cell text)
- Status badges: `active` (green), `discontinued` (gray), `pending-review` (amber)

**Empty states:** "No items found" illustration + reset filter button; "Loading..." skeleton rows; "No matching filters" with clear button.

---

## AssemblyPanel.tsx — Workspace slide-in panel

Position: `position: absolute; right: 0; top: 0; bottom: 0; width: 400px; z-index: 20; background: white; border-left: 1px solid #E5E7EB; box-shadow: -4px 0 20px rgba(0,0,0,0.12)`.

Content (top to bottom):
1. Header: "Assembly Library" title + `X` close button
2. Search bar with semantic/keyword toggle
3. Quick-access tabs: Hot List | Favorites | Recent | All
4. Filter chips row (horizontal scroll)
5. Compact result list (one item per row, ~52px height): category dot, name, source badge, labour/cost, `+` apply button
6. Clicking an item shows inline mini-detail expansion below that row (accordion)
7. "Open full library" link at bottom

Props:
```tsx
interface AssemblyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssembly: (assemblyName: string, assemblyId: string) => void;
}
```

`onSelectAssembly` is called when user clicks "Apply to selection" — updates the selected marker's assembly in `TakeoffWorkspace` state.

---

## TakeoffWorkspace.tsx changes

**Additions only — no removal of existing code:**

1. Add `Package` to the lucide-react import list.
2. Add `showAssemblyPanel: boolean` state (default `false`).
3. Add `AssemblyPanel` import.
4. In the Properties tab "Change assembly" button `onClick`: `setShowAssemblyPanel(true)`.
5. Render `<AssemblyPanel>` as an absolute overlay inside the workspace flex container (same level as right inspector). Conditionally rendered based on `showAssemblyPanel`. Pass `onSelectAssembly` that updates `selectedMarker.assembly` if a marker is selected.
6. Keyboard shortcut: when canvas focused and `key === 'a'` and no modal open → `setShowAssemblyPanel(true)`.

---

## App.tsx changes

1. Add `"libraries" | "assembly-builder"` to `AppPage` type.
2. Change `NAV_PAGE_MAP.libraries` from `"placeholder"` to `"libraries"`.
3. Import `LibraryView`.
4. Render `<LibraryView onNavigateToBuilder={() => setActivePage("assembly-builder")} />` when `activePage === "libraries"`.
5. Keep `PAGE_TITLES.libraries = "Libraries"` (no change needed).

---

## Mock Data Summary

**15 assemblies** across 5 disciplines (lighting, power, fire-alarm, data, safety):
- LED Troffer 2×4 ACT/MC (system, locked, favorite)
- LED Troffer 2×4 ACT retrofit (company, recently-updated)
- 4" Recessed downlight ACT/MC (system, locked)
- 4" Recessed downlight drywall (system)
- LED Strip high-bay warehouse (system)
- Emergency exit combo ceiling (system, favorite)
- Duplex receptacle 20A new construction (system)
- Hospital grade receptacle 20A (system, incompatible)
- GFCI outdoor weatherproof 20A (system, missing-price)
- 3/4" EMT conduit surface run (system)
- 20A circuit homerun EMT (company, recently-updated)
- 240V HVAC disconnect 40A (company)
- Fire alarm pull station (system)
- CAT6 data outlet (company)
- 480V motor connection 3-phase (system)

**25 master items** across categories: Lighting, Wiring Devices, Conduit & Fittings, Wire & Cable, Panelboard, Safety, Fire Alarm, Data, Hardware

**6 job libraries**: Dollar Tree Fit-Out (default), Office TI, Hospital Patient Room, Warehouse, Gas Station/C-Store, Retail General

---

## Icons to add

Only `Package` needs to be added to TakeoffWorkspace.tsx imports (all others are either already imported or only used in new files).

New files will import from lucide-react: `Search, SlidersHorizontal, Star, LayoutGrid, List, Plus, Lock, Pencil, Trash2, Copy, Eye, X, Check, Sparkles, AlertTriangle, Building2, Clock, Archive, Share2, ChevronDown, ChevronRight, GripVertical, ArrowUp, ArrowDown, Download, Upload, Package, Tag, Filter, FileText, MoreHorizontal, RefreshCw`.

All verified available in lucide-react 0.487.0.

---

## Verification

1. Nav "Libraries" → LibraryView renders with 4 tabs
2. Assembly Browser tab: search, filter, card states (hover, selected, favorite, locked, incompatible, missing-price, recently-updated) all visible
3. Semantic search: type "recessed light ACT ceiling" → purple AI banner + attribute chips appear
4. Click an assembly card → detail panel slides in from right
5. Assembly Builder tab: drag or click `+` to add items → appear in canvas; qty/formula editable
6. Job Libraries tab: grid of library cards with action menus
7. Master Items tab: table renders with sticky header + frozen description column, sort on header click works, density toggle works
8. Back in workspace: "Change assembly" button → AssemblyPanel slides in from right
9. Select assembly in panel → marker assembly name updates in right inspector Properties tab
10. All previously working screens (dashboard, projects, drawings, workspace) remain unaffected
