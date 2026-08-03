Update only the existing Brightpoint Takeoff workspace left sidebar.

Do not redesign, replace, regenerate, or restructure the Takeoff workspace.

Preserve exactly as-is:

* Top application bar
* Takeoff toolbar
* PDF canvas
* Page thumbnails
* Existing Takeoff panel
* Existing Layers panel
* Right properties inspector
* Bottom status bar
* Current spacing
* Current typography
* Current colours
* Current icons
* Current panel widths
* Current canvas behaviour
* Current keyboard shortcuts
* Current responsive behaviour

Do not remove the Layers panel.

Do not move the Layers panel.

Do not replace the existing left sidebar.

Do not change any existing tab labels, content, or layout except for adding one new tab.

## Required Change

Add one new tab to the existing left sidebar:

* Assemblies

The existing sidebar should remain unchanged apart from this new tab.

The new tab must use the exact same:

* Tab height
* Typography
* Active state
* Hover state
* Focus state
* Border treatment
* Spacing
* Icon style
* Interaction pattern

Do not create a new sidebar design.

Do not create a separate left panel.

Do not remove or merge Pages, Takeoffs, Layers, or any other existing sidebar content.

## Assemblies Tab Content

When the user selects Assemblies, replace only the sidebar content area with the Assemblies content.

The PDF canvas, toolbar, right inspector, drawing page, zoom level, pan position, selected objects, active layer, and takeoff progress must remain unchanged.

### 1. Active Assembly

At the top of the Assemblies tab, show a compact active assembly card.

Include:

* Assembly name
* Assembly code
* Category
* Source library
* Count or Linear tool indicator
* Compatible or warning status
* Change action
* Open details action

Example:

LED Troffer 2×4
BPA-FX-201
Fixtures · Company Library
Count · Compatible

Keep this card compact so it fits the existing sidebar width.

### 2. Assembly Search

Add a search input below the active assembly card.

Placeholder:

Search project-compatible assemblies…

Search should match:

* Assembly name
* Assembly code
* Category
* Installation context
* Wiring method
* Tags
* Library source

### 3. Compact Filters

Add compact filter chips or a filter menu.

Include:

* All
* Recent
* Favorites
* Recommended
* Count
* Linear
* Current Job Library
* Company Library
* Missing Price
* Needs Review

Use the existing filter-chip style from the application.

Do not add a large filter panel.

### 4. Assembly Sections

Show compact sections within the existing sidebar:

* Recently Used
* Favorites
* Project Standards
* Compatible Assemblies

Keep section labels small and visually consistent with the current sidebar.

### 5. Assembly Rows

Use compact assembly rows designed for the current sidebar width.

Each row should show:

* Assembly name
* Assembly code
* Source
* Count or Linear indicator
* Recommended or Compatible status
* Activate button
* Overflow menu

Overflow menu actions:

* Preview BOM
* Open Details
* Edit
* Duplicate
* Replace Selected Takeoff
* Apply to Selected Objects
* Open Full Configurator
* Add to Favorites

System assemblies should show a lock icon.

Do not use large cards.

Do not widen the sidebar.

## Activate Assembly Behaviour

When the user activates an assembly:

1. Make it the active assembly.
2. Keep the current drawing page unchanged.
3. Keep zoom unchanged.
4. Keep pan position unchanged.
5. Preserve selected objects.
6. Preserve the active layer.
7. Preserve current drawing progress.
8. Update the active assembly card.
9. Activate the correct tool:

   * Count for Fixtures and Devices
   * Linear for Raceway, Cable, and Feeders
10. Show a small confirmation message.

Example:

LED Troffer 2×2 activated. Drawing context preserved.

If switching from Count to Linear:

* Show a compact confirmation dialog.
* Explain that the active tool will change.
* Do not reset the canvas.

## Selected Takeoff Integration

Do not redesign the existing right properties inspector.

Only add a compact Assembly section inside the existing selected takeoff properties area.

Show:

* Assembly name
* Assembly code
* Version
* Source library
* Installation context
* Material cost
* Labour hours
* Compatibility status

Actions:

* Open Assembly
* Replace Assembly
* Edit a Copy
* Preview BOM

Use the existing inspector field and button styles.

Do not change the inspector width or layout.

## Preview BOM

Preview BOM without leaving the Takeoff workspace.

Use the existing drawer, popover, or modal style.

Show:

* Assembly name
* Version
* Grouped BOM
* Item quantity
* Unit
* Calculation source
* Material cost
* Labour hours
* Missing-price warning
* Optional components

Actions:

* Close
* Open Full Assembly
* Replace Assembly
* Edit Copy

Closing the preview must restore focus and preserve canvas context.

## Replace Assembly

Allow replacement from:

* Assembly row overflow menu
* Selected object context menu
* Existing right inspector
* Existing bulk selection controls

The replacement dialog should show:

* Current assembly
* Replacement assembly
* Material cost difference
* Labour difference
* BOM difference
* Compatibility warnings
* Number of affected takeoff objects

Apply options:

* Selected object only
* Selected objects
* All matching objects on this page
* All matching objects in the estimate

Require confirmation for bulk replacement.

Do not reset the canvas after replacement.

## Open Full Configurator

When the user selects Open Full Configurator:

* Open the existing Assemblies configurator.
* Preserve:

  * Drawing page
  * Zoom
  * Pan
  * Selected objects
  * Active layer
  * Active tool
  * Active assembly
  * Sidebar search and filters
* Pre-populate the selected assembly.
* Allow Save as New Version.
* Allow Save as Job-Specific Copy.
* Allow Cancel and Return to Drawing.

When returning, restore the exact Takeoff state.

## Connected Data Updates

When an assembly is activated, edited, or replaced, update the connected data using the existing application structure.

Update where relevant:

* Takeoff object assembly reference
* Assembly version
* Material quantities
* Material cost
* Labour hours
* Pricing extension
* Estimate totals
* Estimate-health warnings
* Missing-price warnings
* Reports
* Activity history

Do not redesign any of those screens.

Use the existing layouts and feedback patterns.

## Version Behaviour

Existing takeoff objects must retain the assembly version originally used.

When a newer version exists:

* Show Update Available
* Do not update automatically
* Allow Review Changes
* Allow Update Selected
* Allow Update All Matching
* Allow Dismiss for This Estimate

## Required Interactive Flows

### Flow A

Open Assemblies tab → Search LED Troffer 2×4 → Activate → Count tool becomes active → Drawing context remains unchanged

### Flow B

Activate LED Troffer 2×2 while counting → Page, zoom, pan, and selection remain unchanged

### Flow C

Activate EMT assembly → Confirm Linear tool → Continue drawing without resetting the canvas

### Flow D

Select a marker → Replace Assembly → Compare impact → Apply to selected marker → Return to same drawing position

### Flow E

Select multiple markers → Replace Assembly → Confirm bulk replacement → Estimate recalculates

### Flow F

Preview BOM → Close → Return to the same selected object

### Flow G

Open Full Configurator → Edit assembly → Save new version → Return to the same Takeoff state

## Required States

Create states only for the new Assemblies integration:

* No active assembly
* Active Count assembly
* Active Linear assembly
* Search results
* No results
* Loading
* Failed loading
* Incompatible assembly
* Missing price
* Update available
* Replacement preview
* Saving
* Saved
* Permission restricted
* Offline

Do not create new versions of existing Takeoff screens.

## Accessibility

Use the current accessibility patterns.

Support:

* Arrow keys through assembly rows
* Enter to activate
* Space to preview
* Escape to close menus and dialogs
* Visible focus
* Screen-reader announcement when active assembly changes
* Screen-reader announcement when Count or Linear activates
* Non-colour compatibility indicators
* Focus restoration after closing overlays

Do not interfere with existing canvas shortcuts.

## Credit-Efficient Execution

Patch only the existing Takeoff left sidebar and selected takeoff inspector.

Do not recreate:

* The Takeoff workspace
* The PDF canvas
* The toolbar
* The Layers panel
* The Pages panel
* The Takeoffs panel
* The right inspector
* The bottom status bar
* Existing components

Reuse all existing design-system components and variables.

The only structural change should be the addition of the Assemblies tab to the existing left sidebar.
