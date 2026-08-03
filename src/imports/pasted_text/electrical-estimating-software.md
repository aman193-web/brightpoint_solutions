Electrical Estimating Software MVP
Prompt 1: Product Foundation, Design System and Application Shell

Create the design foundation and global application shell for a production-ready desktop web application called Brightpoint Electrical Estimating Software.

This platform helps electrical contractors and estimators upload construction drawings, perform electrical takeoffs, assign assemblies, calculate material and labour costs, import supplier pricing, build estimates, and generate customer quotes.

The design direction should combine:

Figma’s canvas and contextual-panel behavior
Bluebeam’s PDF takeoff workflow
Linear’s visual cleanliness and spacing
Adobe-style keyboard shortcuts and creative-tool familiarity
Notion’s flexible information architecture
Stripe’s table and financial-data clarity
Vercel’s system status and feedback patterns
OpenAI’s transparent, human-reviewed AI experiences

Use these products only as interaction and usability references. Do not visually copy them.

Experience principles

The product must feel:

Clean
White
Airy
Professional
Accurate
Fast
Technical without appearing complicated
Suitable for extended daily use
Easy for experienced estimators to learn

Prioritize:

Accuracy
Speed
Familiar controls
Strong information hierarchy
Progressive disclosure
Easy correction
Human review of automated results
Minimal screen switching
Keyboard accessibility
Scalable data-heavy layouts

Avoid:

Heavy gradients
Dark application surfaces
Excessive card layouts
Oversized rounded containers
Decorative animations
Deep navigation trees
Hidden critical actions
Excessive modal dialogs
Colour-only status communication
Figma file structure

Create these pages:

00 — Cover and product overview
01 — Foundations and design tokens
02 — Components
03 — Desktop screens
04 — Tablet screens
05 — Interaction flows
06 — Prototype
07 — Empty, loading, error and edge states
08 — Developer handoff

Use:

Figma variables
Auto layout
Component properties
Variants
Responsive constraints
Clearly named layers
Reusable components
Semantic token naming
Colour system

Create variables for the following tokens.

Surfaces
surface.canvas: #F6F7F9
surface.primary: #FFFFFF
surface.secondary: #F9FAFB
surface.tertiary: #F3F4F6
surface.inverse: #111827
Text
text.primary: #111827
text.secondary: #4B5563
text.tertiary: #6B7280
text.disabled: #9CA3AF
text.inverse: #FFFFFF
Borders
border.subtle: #E5E7EB
border.default: #D1D5DB
border.strong: #9CA3AF
border.focus: primary accent
Primary accent

Use a modern electric blue:

primary.50: #EFF6FF
primary.100: #DBEAFE
primary.500: #3B82F6
primary.600: #2563EB
primary.700: #1D4ED8
Semantic colours

Create accessible tokens for:

Success
Warning
Error
Information
AI suggestion

Use violet or indigo for AI suggestions so AI states are visually distinct from normal primary actions.

Ensure all text, controls, status markers, chart elements, and graphical objects meet WCAG 2.2 AA contrast requirements.

Typography

Use Inter as the primary application font.

Use IBM Plex Mono or a similar readable monospaced font only for:

Measurements
Item codes
Cost calculations
Quantities
Technical values

Create typography variables:

Display: 32/40, weight 600
H1: 28/36, weight 600
H2: 24/32, weight 600
H3: 20/28, weight 600
H4: 16/24, weight 600
Body large: 16/24, weight 400
Body: 14/20, weight 400
Body strong: 14/20, weight 600
Small: 12/16, weight 400
Small strong: 12/16, weight 600
Micro label: 11/14, weight 500

Use sentence case for buttons, tabs, table headers, field labels, and menus.

Spacing

Use a 4 px base grid:

2
4
8
12
16
20
24
32
40
48
64
80

Use 8 px increments for primary layout spacing.

Radius
Small: 4 px
Medium: 6 px
Standard: 8 px
Large: 12 px
Pill: 999 px

Avoid excessive rounded corners.

Shadows

Use shadows only for:

Floating toolbars
Popovers
Context menus
Modals
Drag previews

Do not apply shadows to every card or table.

Iconography

Use a consistent outline icon system with:

16 px
18 px
20 px
24 px

Maintain consistent stroke width.

Use filled icons only when indicating an active or selected state.

Grid system

Primary desktop frame: 1440 × 1024.

Also create responsive behavior for:

1280 px width
1024 px width
Tablet: 834 × 1194

Use:

12-column grid for standard application pages
24 px outer margins at 1440 px
20 px gutters
Flexible widths for data-heavy screens
Maximum 720–800 px content width for forms
Full-width layouts for tables and canvas workspaces
Global navigation

Create a collapsible left navigation rail.

Expanded width: 224–240 px
Collapsed width: 64–72 px

Navigation items:

Dashboard
Projects
Estimates
Libraries
Reports
Team
Settings

Include:

Product logo
Workspace or company switcher
Navigation icons
Labels
Active state
Notification badge
Help
Collapse control
User profile

Collapsed navigation should show tooltips on hover and keyboard focus.

Global top bar

Height: 52–56 px.

Include:

Breadcrumbs
Page or project title
Global search
Command menu trigger
Notifications
Help
User profile
Primary page action where appropriate
Project-level navigation

Within an open project, use compact horizontal navigation:

Overview
Drawings
Takeoff
Pricing
Estimate
Quotes
Documents
Activity

Keep the takeoff workflow inside a unified workspace rather than separating drawing, assemblies, and takeoff into disconnected pages.

Reusable components

Create reusable variants for:

Primary, secondary, tertiary, destructive, and ghost buttons
Icon buttons
Split buttons
Inputs
Textareas
Comboboxes
Search fields
Selects
Multi-selects
Checkboxes
Radio buttons
Switches
Date pickers
Time pickers
Currency inputs
Percentage inputs
Number inputs
Unit inputs
Tabs
Segmented controls
Breadcrumbs
Tooltips
Popovers
Dropdown menus
Context menus
Drawers
Modals
Banners
Alerts
Toasts
Badges
Status indicators
Avatars
Progress bars
Step indicators
File uploads
Empty states
Skeleton loaders
Tables
KPI cards
Canvas tool buttons
Count markers
Linear takeoff paths
Scale indicators
Assembly result items
AI confidence labels
Component states

Create the following states for every relevant component:

Default
Hover
Focus visible
Pressed
Selected
Active
Disabled
Loading
Error
Success
Read-only

Use a visible focus ring at least 2 px thick.

Buttons must not change size between states.

Loading buttons should preserve their original width.

Disabled controls should remain readable.

Motion

Use subtle functional motion:

Hover: 100–150 ms
Panel open: 180–220 ms
Drawer: 220–280 ms
Modal: 180–240 ms
Toast: 200–250 ms
Count marker placement: 100–140 ms

Use ease-out for entrances and ease-in for exits.

Respect reduced-motion preferences.

Avoid bouncing, parallax, or decorative motion.

Accessibility

Design to WCAG 2.2 AA.

Include:

Keyboard navigation
Logical tab order
Screen-reader labels
Visible focus
Accessible form errors
Proper heading hierarchy
Text alternatives for icons
No colour-only communication
Minimum 44 × 44 px touch targets on tablet
Reduced-motion support
200% zoom support
No critical information shown only on hover
Structured non-canvas representation of takeoff data
Developer handoff rules

Use component naming such as:

Button/Primary/Medium
Input/Text/Default
Table/Cell/Currency
Canvas/CountMarker/Approved
Panel/Inspector/Assembly
AI/Confidence/Medium

Document:

Purpose
Behavior
Validation
Responsive rules
Keyboard support
Loading state
Error state
Permission state
Data assumptions
Edge cases

Build the global design system, application shell, responsive navigation, component library, and documented foundations before creating feature screens.