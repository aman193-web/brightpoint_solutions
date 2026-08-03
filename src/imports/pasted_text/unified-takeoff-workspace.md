Prompt 4: Unified PDF Takeoff Workspace

Continue using the same design system.

Create the primary professional takeoff workspace. This is the most important screen in the product.

The drawing must remain at the center of the workflow while pages, takeoff objects, assemblies, properties, and AI review remain accessible within one unified interface.

Overall desktop layout
Global top bar

Height: 52–56 px.

Include:

Product logo
Breadcrumb
Project name
Estimate status
Autosave status
Undo
Redo
Share
Help
User profile
Takeoff tool bar

Height: 44–48 px.

Include grouped tools:

Select
Hand or pan
Zoom in
Zoom out
Fit page
Fit width
Calibrate scale
Measure
Count
Linear takeoff
Highlight
Text note
Callout
Colour
Line weight
Snap
Count visibility
AI Count
Overflow menu

Use separators between tool groups.

Show text labels for unfamiliar specialist tools.

Left panel

Default width: 260–300 px.

Make it:

Resizable
Collapsible
Keyboard accessible

Tabs:

Pages
Takeoff
Layers
Pages tab

Include:

Search
Discipline filter
Page thumbnails
Sheet number
Drawing title
Current-page state
Page scale
Include or hide page
Takeoff tab

Include:

Project hot list
Favorites
Recently used assemblies
Active takeoff items
Quantity
Measurement
Colour legend
Search
Group by discipline
Group by page
Group by assembly
Group by status
Layers tab

Include:

Drawing
Manual markup
Count takeoff
Linear takeoff
AI suggestions
Notes
Visibility toggle
Lock
Opacity where relevant
Central canvas

Make the canvas occupy the majority of the screen.

Include:

Light neutral background
Centered PDF page
Smooth zoom and pan
Tool-specific cursor
Selection handles
Count markers
Linear paths
Measurement labels
Snap points
Hover highlights
Marquee selection
Multi-select
Context menus
Active-tool indicator
Right inspector

Default width: 320–360 px.

Make it:

Resizable
Collapsible
Contextual

Tabs:

Properties
Assembly
Pricing
AI Review

The inspector should update based on selected object type.

Bottom status bar

Height: 28–32 px.

Include:

Current page
Drawing scale
Zoom percentage
Selected object count
Snap state
Processing state
Connection state
Canvas keyboard behavior

Support:

Spacebar + drag: temporary pan
Command/Ctrl + wheel: zoom
Command/Ctrl + plus: zoom in
Command/Ctrl + minus: zoom out
Command/Ctrl + 0: fit page
Command/Ctrl + Z: undo
Shift + Command/Ctrl + Z: redo
Escape: cancel tool or deselect
Delete or Backspace: delete selected takeoff
V: select
H: hand
C: count
L: linear takeoff
M: measure
R: calibrate scale
Enter: complete linear path
Shift: constrain direction
Command/Ctrl + D: duplicate
Command/Ctrl + C and V: copy and paste
Right click: context menu

Do not override common browser shortcuts unless the canvas is focused.

Create a keyboard-shortcuts modal.

Selection behavior
Single click selects one object
Shift-click adds or removes selection
Marquee selects multiple objects
Selected objects display visible handles
Hover uses a lighter treatment
Locked objects cannot be edited
Double-click opens detail or assembly
Right-click opens contextual actions
Scale calibration

Create automatic and manual scale flows.

Automatic scale

Show:

Detected scale
Confidence
Source region
Use detected scale
Verify manually
Manual scale

Flow:

Select two known points
Draw calibration line
Enter actual distance
Select measurement unit
Apply to current page or selected pages
Confirm

Warn if linear takeoff begins before scale verification.

If scale changes after takeoff exists, show:

Recalculate existing measurements
Keep existing values
Cancel
Count takeoff

When count is active:

User selects assembly before or after placing first marker
Each click adds a marker
Quantity updates immediately
Markers remain readable at all zoom levels
Labels can be toggled
Marker can be dragged
Multiple markers can be selected
Assembly can be changed in bulk

Count-marker states:

Default
Hover
Selected
Multi-selected
Locked
Excluded
AI suggested
AI approved
AI rejected
Missing assembly
Missing price
Hidden by filter

Do not use colour alone.

Count visibility toggle

Include:

Show all
Fade counted items
Hide counted items
Show only uncounted content
Show only selected takeoff type

Show a persistent indicator when any visual filter is active.

Linear takeoff

Behavior:

Click to add points
Double-click or press Enter to finish
Show live segment length
Show total length
Support orthogonal constraints
Edit points after completion
Add vertical drops
Add waste percentage
Assign raceway or cable assembly

Inspector fields:

Assembly
Horizontal length
Vertical drop
Total length
Quantity multiplier
Waste
Unit
Labour profile
Material cost
Labour hours
Notes

Separate calculated values from user-entered values.

Context menus

Count object:

View assembly
Change assembly
Duplicate
Change colour
Move to discipline
Exclude from estimate
Delete

Linear takeoff:

Edit path
Add vertical drop
Reverse direction
Change assembly
Split segment
Merge segments
Duplicate
Delete
Responsive behavior

At 1440 px:

Expanded navigation
Left panel
Canvas
Right inspector

At 1280 px:

Navigation collapses
Toolbar labels reduce
Secondary tools move to overflow

At 1024 px:

Side panels become overlay drawers
Only one panel opens at a time
Canvas remains primary
Toolbar may scroll horizontally

Create:

Default workspace
Count tool active
Linear tool active
Selected count object
Selected linear object
Collapsed panels
Filtered drawing
Missing-scale warning
Offline state
Save failure
Loading drawing
Corrupted drawing error