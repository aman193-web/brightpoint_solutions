Audit, Fix, and Complete All Interactions and User Flows

Audit the entire existing Brightpoint Electrical Estimating Software prototype and fix every broken, missing, incomplete, disconnected, placeholder, or non-functional interaction.

Do not redesign the visual system, replace approved screens, or change the existing layout, typography, colors, spacing, navigation, or component styling unless a small adjustment is necessary to make an interaction work or improve the clickable target.

Use the current design as the visual source of truth.

Primary objective

Ensure that every visible interactive element has:

A working trigger
A complete action
A loading or active state where needed
Validation where needed
A clear success or failure result
A visible data or status update
A logical next step
An undo, retry, cancel, or recovery path where appropriate

Do not leave any visible workflow in a mockup-only, placeholder, or partially implemented state.

1. Full interaction audit

Check every screen and every interactive element, including:

Primary buttons
Secondary buttons
Ghost buttons
Icon buttons
Navigation items
Tabs
Breadcrumbs
Dropdowns
Select fields
Comboboxes
Search fields
Filters
Filter chips
Checkboxes
Radio buttons
Switches
Date pickers
Time pickers
Context menus
Overflow menus
Accordions
Tooltips
Popovers
Modals
Drawers
File uploads
Drag-and-drop areas
Table rows
Row actions
Bulk actions
Pagination
Saved views
Empty-state actions
Error-state retry actions
Toast actions
Canvas tools
Count markers
Linear takeoff objects
Assembly cards
AI review actions
Estimate actions
Quote actions
Keyboard shortcuts

Find and fix:

Buttons with no destination
Buttons that only change appearance
Links that open blank screens
Tabs with no content
Empty modals
Empty drawers
Fake filters
Fake sorting
Search fields that do nothing
Forms that do not submit
Forms that submit but do not update data
Missing confirmation states
Missing success states
Missing failure states
Missing back navigation
Missing cancel behavior
Missing save behavior
Missing delete behavior
Missing undo behavior
Missing status updates
Missing cross-screen synchronization
Screens that exist but cannot be reached
Actions that begin but cannot be completed
Flows that stop without a clear next step
Invisible overlays blocking clicks
Incorrect pointer events
Layer stacking problems
Nested click conflicts
Incorrect disabled states
Duplicate submission behavior
2. Global interaction rules

Apply these rules across the whole product:

Every visible clickable control must perform a clear action.
No control should appear clickable unless it works.
Every overlay must have working close and cancel actions.
Escape should close menus, drawers, and modals where safe.
Focus should return to the triggering element after an overlay closes.
Back navigation should preserve context.
Browser back behavior should remain logical.
Navigation should never lead to blank content.
Loading states should prevent duplicate actions.
Destructive actions should require confirmation.
Important deletions should explain their impact.
Every action should have visible feedback.
Existing visual styling should remain unchanged unless usability requires a small fix.
3. Navigation and routing

Verify and connect:

Dashboard
Projects
Estimates
Libraries
Reports
Team
Settings
Project overview
Drawings
Takeoff
Pricing
Estimate
Quotes
Documents
Activity

Ensure:

Active navigation updates correctly
Breadcrumbs work
Back navigation works
Browser back works logically
Deep links open the correct screen
Project switching preserves context
Command/Ctrl + K opens global search
Recent projects open correctly
No destination is blank or unreachable
4. Forms

For every form:

Inputs accept data
Selects open and return values
Date and time pickers work
Required fields validate
Inline errors appear
Form-level errors appear when necessary
Save draft works
Continue advances
Back preserves entered data
Cancel returns safely
Autosave works where shown
Unsaved-change warnings work
Enter submits where appropriate
Keyboard navigation works
Loading states appear
Success feedback appears
Failure feedback appears
Duplicate submissions are prevented

Complete CRUD behavior for:

Projects
Contacts
Assemblies
Items
Crew members
Expenses
Quotes
Users
Templates
Job libraries

Support where relevant:

Create
View
Edit
Duplicate
Archive
Delete
Restore
5. Tables

For all tables:

Rows are selectable
Inline editing works
Sorting works
Search works
Filters work
Saved views work
Column resizing works where shown
Column reordering works where shown
Expandable rows open
Row menus work
Bulk selection works
Bulk actions work
Pagination or virtual scrolling works
Export actions work
Empty states are reachable
Loading states are reachable
Error states are reachable
Keyboard navigation works

Ensure table edits update all connected screens.

6. Complete project lifecycle

Ensure users can fully:

Create a project
Save as draft
Resume later
Edit project details
Upload drawings
Replace drawings
Remove drawings
Process pages
Correct detected page information
Open the takeoff workspace
Complete takeoff
Review pricing
Configure labour
Add direct expenses
Resolve estimate warnings
Submit for review
Revise after feedback
Approve
Generate quote
Send quote
Update bid status
Mark won or lost
Archive project

Ensure every status transition updates:

Dashboard
Project list
Project overview
Estimate status
Quote status
Activity history
7. Takeoff workspace

Fix and complete:

Select tool
Pan tool
Zoom in
Zoom out
Fit page
Fit width
Scale calibration
Measure
Count
Linear takeoff
Highlight
Text note
Callout
Undo
Redo
Delete
Duplicate
Context menu
Panel collapse
Panel resize
Page switching
Layer visibility
Count visibility toggle
AI Count
Left-panel tabs
Right inspector
Count flow

Ensure users can:

Select an assembly
Place a marker
Complete a count series
Select a marker
Move a marker
Duplicate a marker
Delete a marker
Edit marker properties
Change assigned assembly
Apply assembly to multiple markers
Exclude an item
Restore an excluded item
Undo and redo
Save and resume
Linear takeoff flow

Ensure users can:

Start a path
Add points
Complete the path
Edit points
Move points
Add vertical drops
Change units
Add waste
Change assembly
Split a segment
Merge segments
Reverse direction
Apply changes to one or multiple paths
Delete
Undo and redo
Save and resume
Canvas rules
Active tool state is clear
Selected objects update the inspector
Right-click menu opens at the cursor
Spacebar drag pans
Escape cancels active tool
Keyboard shortcuts work when canvas is focused
Canvas and pricing table remain synchronized
No overlay blocks drawing interaction unintentionally
8. Assemblies

Fix and complete:

Semantic search
Keyword search
Categories
Filters
Filter chips
Favorites
Recent assemblies
Hot list
Assembly cards
Preview
Use for takeoff
Assembly details
Create company copy
Drag-and-drop assembly builder
Reorder components
Edit quantities
Add items
Remove items
Add labour
Save assembly
Apply assembly
Version options
Custom job libraries

Ensure users can:

Search
Filter
Preview
Select
Open details
Create company copy
Add components
Remove components
Reorder components
Edit quantities
Add labour
Save
Apply to one object
Apply to all matching objects
Save to a custom job library
Reopen and edit later
Drag-and-drop states

Include:

Drag preview
Valid drop state
Invalid drop state
Insertion indicator
Auto-scroll
Drop completion
Undo
9. Pricing and supplier import

Fix and complete:

Inline price editing
Price source selection
Bulk price adjustment
Bulk labour adjustment
Canvas-to-table linking
CSV upload
Column mapping
Preview
Item matching
Accept match
Correct match
Ignore
Create company item
Apply to estimate
Apply to company price book
Confirm import
Import summary
Download error report
Import history
Undo import where supported

Ensure users can:

Upload CSV
Map columns
Fix invalid mappings
Preview records
Review matches
Resolve unmatched items
Resolve unit conflicts
Choose update destination
Confirm
View results
Download errors
Reopen history

Never overwrite manual pricing without confirmation.

10. Labour and estimate

Fix and complete:

Labour profile selection
Crew builder
Add crew member
Remove crew member
Reorder crew members
Save crew template
Apply crew template
Compare labour scenarios
Change wage rates
Change burden
Change productivity
Add direct expenses
Remove direct expenses
Edit overhead
Edit markup
Edit margin
Edit tax
Add contingency
Resolve estimate-health warnings

All financial calculations must update immediately.

Ensure users can:

Edit every financial section
Add and remove expenses
Change labour profile
Save crew template
Compare labour scenarios
Resolve warnings
Submit for review
Receive requested changes
Add reviewer comments
Resubmit
Approve
Lock
Create a new version
Compare versions
Unlock with permission
Restore an earlier version where supported
11. Estimate review and status transitions

Ensure valid status transitions:

Draft → Takeoff in progress
Takeoff in progress → Pricing required
Pricing required → Ready for review
Ready for review → Changes requested
Changes requested → Ready for review
Ready for review → Approved
Approved → Submitted
Submitted → Won
Submitted → Lost
Eligible states → Archived

Prevent invalid transitions.

Complete:

Submit for review
Request changes
Add review comment
Resubmit
Approve
Approve with comment
Lock
Unlock with permission
Create version
Compare versions

Update status everywhere it appears.

12. Quote workflow

Fix and complete:

Create quote from estimate
Add section
Edit section
Duplicate section
Delete section
Reorder section
Hide section
Add exclusion
Add allowance
Add alternate
Preview PDF
Return to edit
Save draft
Download PDF
Send now
Schedule send
Retry failed send
Create revised quote
Update quote status

Ensure complete states:

Draft
Scheduled
Sending
Sent
Failed
Revised
Accepted
Declined
Cancelled

No quote flow should end without a clear next action.

13. AI workflows

Fix and complete:

Start AI Count
Processing state
Cancel where safe
Review suggestions
Approve one
Reject one
Correct one
Approve all high-confidence
Assign assembly
Commit results
Undo committed results
Retry failure
Switch to manual workflow

Ensure AI results:

Remain visually distinct until approved
Show confidence
Show source
Preserve manual edits
Never silently change financial totals
Never overwrite approved work
Always offer manual fallback

Complete AI errors for:

Low-quality drawing
No matches
Scale not verified
Processing timeout
Connection lost
Partial results
Usage limit
Unsupported page
14. Modals, drawers, menus, and overlays

For every modal, drawer, menu, and popover:

Open correctly
Close button works
Cancel works
Escape closes where safe
Outside click closes only when safe
Focus is trapped
Focus returns to trigger
Primary action works
Loading prevents duplicate clicks
Unsaved changes are protected
Stacking order is correct
Underlying content is not accidentally clickable
15. Cross-screen synchronization

Ensure changes update everywhere.

Examples:

Project deadline updates dashboard and project list
Assigned assembly updates takeoff, pricing, and estimate
Supplier pricing updates material totals
Labour updates estimate totals
Resolving warning updates estimate health
Approving estimate updates project status
Sending quote updates quote history and activity
User role changes update available actions
Archived project disappears from active views
Restored project returns to correct view
16. Empty, loading, success, and error states

Complete all states for:

Projects
Drawings
Takeoff
Assemblies
Pricing
Labour
Estimates
Quotes
Reports
Team
Notifications
AI results
Search
Loading

Use:

Skeletons
Progress indicators
Disabled duplicate actions
Cancel where safe
Layout preservation
Success

Use:

Saved indicator
Toast
Checkmark
Row highlight
Completion state
Undo toast
Errors

Every error must explain:

What happened
What was affected
Whether work was saved
What the user should do next

Include:

Retry
Manual fallback
Return to safe screen
Contact support where appropriate

Avoid vague messages such as “Something went wrong.”

17. Edge cases

Create working behavior for:

No data
Partial data
Duplicate data
Invalid data
Permission restrictions
Network interruption
Offline work
Save conflict
Concurrent edits
Long processing
Cancelled processing
Failed upload
Failed import
Failed calculation
Expired session
Unsaved changes
Missing required data
Archived records
Locked records
18. Accessibility

Verify:

Full keyboard navigation
Logical tab order
Visible focus rings
Enter and Space activation
Escape behavior
Accessible names for icon-only controls
Screen-reader labels
Accessible error announcements
Accessible modal focus
No hover-only essential action
Non-colour status indicators
Minimum tablet touch targets
Focus restoration after overlay close
Alternative list representation for canvas objects
19. Required prototype QA flows

Make these fully clickable from start to finish:

Flow A

Dashboard → New project → Project intake → Upload PDF → Organize drawings → Open takeoff

Flow B

Set scale → Count fixtures → Measure conduit → Assign assembly → Save

Flow C

Open pricing → Edit price → Configure labour → Add expense → View updated estimate

Flow D

Resolve estimate-health warning → Submit for review → Request changes → Resubmit → Approve

Flow E

Generate quote → Edit → Preview → Save draft → Send

Flow F

Run AI Count → Review → Correct → Approve → Commit

Flow G

Upload supplier CSV → Map columns → Resolve unmatched item → Apply pricing

Flow H

Open assembly → Create company copy → Edit → Save → Apply to takeoff

Flow I

Trigger an error → Retry → Recover successfully

Flow J

Create project → Mark submitted → Mark won or lost → Archive

Also test:

Every modal
Every drawer
Every dropdown
Every tab
Every context menu
Every row action
Every empty-state action
Every retry action
20. Final completion rule

After all fixes, perform a complete interaction QA pass across the entire prototype.

Do not stop after fixing only the current screen.

Ensure there are:

No dead buttons
No dead links
No broken tabs
No non-functional icons
No blocked click targets
No blank destinations
No missing close actions
No incomplete flows
No duplicate submissions
No unreachable screens
No static controls pretending to work
No workflows without a result state
No workflows without recovery
No visible MVP actions labelled “Coming soon”

If a feature is intentionally outside the MVP:

Remove its clickable appearance, or
Show it as disabled with a clear “Future feature” explanation

Every visible action must have:

A working destination
A complete interaction
A result state
A recovery path
A clear next step

Keep the existing approved visual design unchanged while making the complete product prototype fully functional and testable.