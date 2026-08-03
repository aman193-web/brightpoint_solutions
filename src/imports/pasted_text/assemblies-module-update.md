Update only the Libraries and Assemblies module of the existing Brightpoint Electrical Estimating Software.

Preserve all previously approved application design, including:

- Global navigation
- Dashboard
- Projects
- Estimates
- PDF upload
- Drawing workspace
- Pricing
- Reports
- Team
- Settings
- Typography
- Colours
- Spacing
- Components
- Icons
- Tables
- White visual theme
- Responsive behaviour

Do not redesign or restyle other modules.

Reuse the existing design system, components, variables, layout rules and interaction patterns. Do not create duplicate component styles.

Where assembly changes affect takeoff quantities, pricing, labour, estimate totals, warnings, reports or project status, update the underlying connected data and states without changing the visual design of those modules.

The revised Assemblies module must follow the client’s configurator demo and meeting feedback.

The primary workflow must be:

Library → Category → Installation Context → Compatible Assemblies → Guided Configuration → Live Bill of Materials → Save

The user should not be required to search through a complete raw parts database for standard assemblies.

## 1. Assemblies Workspace

Create two connected modes:

- Browse
- Build

Place a segmented Browse/Build control in the top-right of the Assemblies workspace.

Switching modes must:

- Not reload the page
- Preserve the active library
- Preserve the selected category
- Preserve the installation context
- Preserve the selected assembly
- Preserve unsaved configuration where possible
- Keep the Live Bill of Materials visible

Use a three-panel desktop layout.

### Left panel

Purpose:

- Library selection
- Library creation and management
- Assembly category navigation

Recommended width:

- 240–260 px
- Resizable
- Collapsible
- Independently scrollable

### Centre panel

Browse Mode:

- Context selection
- Assembly search
- Filters
- Compatible assembly results

Build Mode:

- Guided assembly configurator
- Context-aware options
- Suggestions
- Manual advanced item search

### Right panel

Purpose:

- Persistent Live Bill of Materials
- Material and labour summary
- Assembly health
- Save and takeoff actions

Recommended width:

- 340–380 px
- Resizable
- Collapsible
- Sticky
- Independently scrollable

## 2. Library Management

Add a library selector in the left panel.

Library types:

- System Library
- Company Library
- Current Job Library
- Customer-Specific Library

Example libraries:

- BPL – Primary Library
- Riverside Medical Office
- Dollar Tree Job Library

Each library should show:

- Library name
- Library type
- Assembly count
- Read-only or editable status
- Last updated
- Source icon

Actions:

- Change active library
- Search libraries
- Create New Job Library
- Duplicate library
- Rename library
- Archive library
- Restore library
- View library details

System libraries must be read-only.

Users may duplicate a System assembly into:

- Company Library
- Current Job Library
- Customer-Specific Library

## 3. Create New Job Library

Create a functional modal or drawer.

Fields:

- Library name
- Library type
- Related project
- Customer
- Description
- Default building conditions
- Default assembly categories
- Visibility

Visibility options:

- Current project only
- Customer-specific
- Company-wide
- Selected users

States:

- Empty
- Validation error
- Duplicate name
- Saving
- Success
- Failure

After creation:

- Add the library to the selector
- Make it active
- Update activity history
- Show confirmation

## 4. Assembly Categories

Show these coded categories exactly:

- BPC-01 – Fixtures
- BPC-02 – Devices
- BPC-03 – Raceway / Cable
- BPC-04 – Feeders
- BPC-05 – Service Gear
- BPC-06 – HVAC
- BPC-07 – Controls
- BPC-08 – Fire Alarm
- BPC-09 – Fire Pump
- BPC-10 – Residential
- BPC-11 – Low-Voltage Systems

Each row should show:

- Category code
- Category name
- Assembly count
- Active state
- Optional warning state

Selecting a category must:

- Update the centre panel without reloading
- Preserve the active library
- Update installation-context options
- Update available filters
- Update compatible results
- Reset only incompatible context values

## 5. Browse Mode

Before showing assembly results, require installation-context selection.

### Fixture contexts

- ACT Ceiling
- Hard Ceiling – Metal Framing
- Hard Ceiling – Wood Framing
- Bar Joist – Open Ceiling
- Concrete Deck

### Device contexts

- Metal Framing
- Surface Mount
- Surface Mount on Concrete
- Masonry

Create scalable context options for other categories.

Examples:

Raceway / Cable:

- Concealed
- Exposed
- Underground
- Outdoor
- Hazardous Location

Feeders:

- Indoor
- Outdoor
- Underground
- Shaft
- Roof

Context selection must immediately filter out irrelevant assemblies and components.

Examples:

Metal framing:

- Prioritise metal boxes
- Suggest self-drilling metal screws
- Hide wood screws
- Hide wood-framing boxes

Wood framing:

- Suggest wood screws
- Hide self-drilling metal screws
- Hide concrete anchors

Concrete:

- Suggest concrete anchors
- Prioritise surface-mount hardware
- Hide framing-specific fasteners

Open bar joist:

- Suggest beam clamps
- Suggest suspension support
- Prioritise open-ceiling wiring

Healthcare:

- Prioritise HCF cable
- Prioritise hospital-grade devices
- Warn when standard components are selected

## 6. Assembly Search and Filters

Add search with placeholder:

“Search compatible assemblies…”

Search should match:

- Assembly name
- Assembly code
- Description
- Wiring method
- Construction condition
- Tags
- Library source
- Item names

Filters:

- Wiring method
- Mounting method
- Construction type
- Project type
- Voltage
- Indoor or outdoor
- Healthcare
- Emergency
- Dimming
- System, Company or Job source
- Recommended
- Compatible
- Favorites
- Recently used
- Missing price
- Needs review

Show active filters as removable chips.

Include:

- Clear all
- Reset to project conditions
- Save filter view

## 7. Assembly Results

Use compact, information-rich rows or compact cards.

Each result must show:

- Assembly name
- Assembly code
- Short description
- Compatible installation conditions
- Wiring method
- Construction tags
- Source library
- Recommended or Compatible status
- Favorite action
- Preview action
- Select action
- Overflow menu

Example Fixtures:

- LED Troffer 2×4
- LED Troffer 2×2
- LED Emergency Troffer

Example Devices:

- Duplex Receptacle – 20A Commercial
- GFCI Receptacle – 20A Commercial
- Hospital-Grade Receptacle – 20A

Example codes:

- BPA-FX-201
- BPA-FX-202
- BPA-FX-203
- BPA-DV-101
- BPA-DV-102
- BPA-DV-103

Statuses:

- Recommended
- Compatible
- Project Standard
- Recently Used
- Custom
- Needs Review
- Missing Price
- Incompatible

Do not communicate status using colour alone.

Selecting an assembly must:

- Highlight the selected result
- Populate the Live BOM immediately
- Update component count
- Update material cost
- Update labour hours
- Preserve scroll position
- Not navigate away automatically

## 8. Build Mode

Build Mode must be a guided configurator.

Do not make drag-and-drop the primary building method.

Use numbered, expandable configuration sections.

Each section should support:

- Current
- Complete
- Incomplete
- Error
- Collapsed summary

## 9. Fixture Assembly Configurator

### Step 1 — Selection

Fields:

- Application type
- Fixture type
- Assembly name
- Assembly code
- Description

Applications:

- ACT Ceiling
- Hard Ceiling – Metal Framing
- Hard Ceiling – Wood Framing
- Bar Joist – Open Ceiling
- Concrete Deck

Fixture types:

- LED Troffer 2×4
- LED Troffer 2×2
- LED Emergency Troffer
- Recessed Downlight
- Linear Pendant
- Surface-Mounted Fixture

### Step 2 — Mounting

Fields:

- Mounting method
- Drop length
- Support method
- Attachment method
- Support quantity

Options:

- T-Bar Drop-In
- Surface Mount to Joist Framing
- Suspension Cable and Beam Clamp
- Concrete Anchor Mount

### Step 3 — Wiring

Fields:

- Wiring method
- Run length
- Measurement unit
- Waste percentage
- Connector
- Calculation preview

Options:

- MC-PCS 12/3
- MC 12/2
- AC 12/2
- EMT with THHN
- Measure Separately

Calculation example:

8 LF run + 5% waste = 8.4 LF

Rules:

- BOM updates immediately
- Show entered and calculated values
- Measure Separately removes calculated wire and shows a note
- EMT with THHN generates conduit, conductors, connectors, couplings and supports

### Step 4 — Options

Fields:

- Dimming
- Emergency configuration
- Controls
- Constant-hot requirement
- Fixture whip
- Grounding

Dimming:

- No dimming
- 0–10V dimming
- DALI control

Emergency:

- None
- Constant hot leg
- Emergency battery pack

Rules:

0–10V:

- Add control wiring
- Add Controls BOM group

Constant hot:

- Recommend 12/3 or equivalent
- Add emergency wiring note

Battery pack:

- Add emergency battery component
- Add Emergency BOM group

## 10. Device Assembly Configurator

When Devices is selected, hide fixture-only controls.

### Step 1 — Selection

Fields:

- Installation application
- Device type
- Grade
- Assembly name
- Assembly code

Applications:

- Metal Framing
- Surface Mount
- Surface Mount on Concrete
- Masonry

Device types:

- Duplex Receptacle 20A
- GFCI Receptacle 20A
- Hospital-Grade Receptacle 20A
- Single Receptacle
- USB Receptacle
- Switch
- Occupancy Sensor

Grades:

- Commercial
- Hospital Grade
- Residential
- Weather Resistant

### Step 2 — Wiring

Fields:

- Wiring method
- Run length
- Waste percentage
- Connector
- Grounding

Options:

- MC 12/2
- HCF MC 12/2
- EMT with THHN
- Measure Separately

Healthcare rule:

- Prioritise HCF cable
- Warn before allowing standard MC
- Allow manual override with confirmation

### Step 3 — Box and Cover

Fields:

- Box type
- Cover type
- Plaster ring
- Mounting hardware
- Weatherproof option

Box options:

- New Work 1-Gang Metal Box
- New Work 1-Gang Plastic Box
- FS Box
- 4-inch Square Box with Plaster Ring

Cover options:

- Standard Cover
- Stainless-Steel Cover
- Weatherproof In-Use Cover

## 11. Context-Aware Suggestions

Automatically suggest relevant:

- Wiring
- Connectors
- Boxes
- Covers
- Supports
- Screws
- Anchors
- Wire connectors
- Grounding parts
- Control wiring
- Emergency components

Each suggestion must show:

- Item name
- Reason
- Context used
- Quantity
- Unit
- Suggestion source
- Add
- Replace
- Ignore

Suggestion sources:

- Rule-based
- AI-assisted
- Project standard
- Recently used
- Existing company assembly

AI suggestions must:

- Be labelled
- Show confidence
- Require approval
- Never overwrite manual choices
- Allow correction
- Allow dismiss all
- Allow add all high-confidence

## 12. Live Bill of Materials

Keep the BOM visible in Browse and Build.

Group by:

- Fixture or Device
- Mounting
- Wiring
- Box and Cover
- Controls
- Emergency
- Grounding
- Optional Components

Each BOM row must show:

- Item name
- Item code
- Quantity
- Unit
- Calculation source
- Assembly note
- Required or optional
- Manual or generated
- Price status
- Edit
- Replace
- Remove

Examples:

- 8 LF run + 5% waste = 8.4 LF
- 2 fixtures × 2 connectors = 4 EA
- 1 box per device = 1 EA

BOM behaviour:

- Update immediately
- Briefly highlight changed rows
- Preserve manual overrides
- Show override indicator
- Allow Reset to Suggested
- Warn if required items are removed

BOM summary:

- Component count
- Material cost
- Labour hours
- Missing prices
- Optional items
- Source library
- Version
- Compatibility status

## 13. Advanced Manual Parts Library

Keep manual item search and drag-and-drop as a secondary option.

Place it inside:

“Advanced: Search or add items manually”

Use it for:

- Missing configurator items
- Manufacturer-specific parts
- Custom components
- Manual BOM overrides

Support:

- Search
- Filters
- Preview
- Add
- Replace
- Drag into BOM
- Create company item

Do not expose the complete raw database by default.

## 14. Assembly Actions

Include:

- Preview Bill of Materials
- Save to Library
- Save as Company Assembly
- Save to Current Job Library
- Duplicate Assembly
- Edit Assembly
- Archive
- Restore
- Start Takeoff

## 15. Save Assembly

Create a functional save modal.

Fields:

- Assembly name
- Assembly code
- Description
- Destination library
- Tags
- Visibility
- Job-specific or company-wide
- Version note
- Replace existing or save new version

Validate:

- Required name
- Unique code
- Destination
- Replacement confirmation

After saving:

- Add assembly to destination library
- Update assembly version
- Update activity history
- Update search results
- Update related library assembly count
- Show success feedback

## 16. Connected Data Updates

When an assembly changes, update connected data without redesigning other modules.

Update where relevant:

- Takeoff item assignment
- Material quantities
- Material cost
- Labour hours
- Pricing rows
- Estimate totals
- Estimate-health warnings
- Missing-price warnings
- Reports
- Activity history
- Assembly version history

Do not silently update existing estimates using an old assembly version.

Ask:

- Apply to selected takeoff
- Apply to all matching takeoffs in this estimate
- Save as new version only
- Cancel

Existing completed estimates must preserve their original assembly version unless the user explicitly updates them.

## 17. Required Prototype Flows

Make these functional:

### Flow A

BPL Library → Fixtures → ACT Ceiling → LED Troffer 2×4 → BOM updates

### Flow B

Fixtures → Build → T-Bar Drop-In → MC 12/2 → 8 LF → 5% waste → BOM shows 8.4 LF → Save to Company Library

### Flow C

Devices → Metal Framing → Duplex Receptacle → Metal box → Standard cover → Self-drilling screws suggested → Save

### Flow D

Riverside Medical Office → Hospital-Grade Receptacle → Standard MC warning → Accept HCF cable → Save to Customer Library

### Flow E

System assembly → Create Company Copy → Edit → Save new version

### Flow F

Manual item search → Add manufacturer-specific connector → Replace generated connector → BOM updates

## 18. Responsive and Accessibility Requirements

Preserve the current application responsive patterns.

Desktop:

- Three panels visible

1024 px:

- Left and right panels become drawers
- Centre remains primary

Tablet:

- BOM becomes bottom sheet
- Guided builder remains usable
- Drag-and-drop is optional, not required

Accessibility:

- Full keyboard navigation
- Visible focus
- Screen-reader announcements after BOM updates
- Non-colour warnings
- Accessible modals
- Focus restoration
- Reduced motion
- 44 px tablet targets

Final result:

The user should be able to create a standard Fixture or Device assembly through relevant guided options in seconds without searching thousands of unrelated parts.