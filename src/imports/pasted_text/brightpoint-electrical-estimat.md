Prompt 6: Pricing, Estimating, Quotes, AI, Responsive States and Developer Handoff

Continue building the existing Brightpoint Electrical Estimating Software in the same Figma Make file.

Do not redesign, replace, or remove any previously approved screens, components, variables, navigation, typography, spacing, colors, interaction patterns, or responsive rules.

Reuse the existing design system and shared components created in previous prompts. Do not create duplicate local components when an existing component is available.

This prompt should complete the production-ready MVP by designing:

Extension and pricing review
Supplier CSV import
Labour and crew configuration
Estimate builder
Estimate health and validation
Quote generation and sending
Reports
Team and permissions
Company settings
Collaboration and activity
AI-assisted experiences
Responsive tablet and mobile concepts
Empty, loading, success, and error states
Connected prototype flows
Accessibility annotations
Developer handoff documentation

The visual direction remains:

Figma-like canvas and contextual panels
Bluebeam-inspired takeoff workflow
Linear-style visual cleanliness
Adobe-style shortcuts and interactions
Stripe-like financial tables
OpenAI-style transparent AI review

Keep the interface clean, white, airy, precise, technical, and suitable for long estimating sessions.

1. Extension and Pricing Workspace

Create a data-dense extension and pricing screen that converts takeoff quantities into material and labour calculations.

Main table columns

Include:

Item
Item code
Assembly
Discipline
Category
Drawing page
Quantity
Unit of measure
Base unit price
Company price
Supplier price
Selected price
Extended material cost
Labour profile
Labour unit
Total labour hours
Status
Notes
Row actions
Table behavior

Support:

Sticky table header
Sticky totals row
Frozen item-description column
Column resizing
Column reordering
Sorting
Filtering
Search
Saved views
Density settings
Inline editing
Bulk selection
Bulk actions
Expandable rows
Keyboard navigation
Virtual scrolling for large datasets
Export
Undo
Autosave
Filters

Include:

Missing price
Quoted item
Supplier
Discipline
Assembly
Drawing page
Labour profile
Stale price
Manual override
Warning status
Canvas and table linking

Create bidirectional linking between takeoff objects and pricing rows.

Clicking a pricing row highlights related objects on the drawing
Clicking a drawing object highlights the corresponding table row
“Open in drawing” navigates to the correct page and zoom level
Expanded rows show all drawing locations
Multi-location items show the number of takeoff occurrences
Selecting multiple takeoff objects filters the pricing table to those items
Pricing sources

Support these pricing states:

Programme price
Company price
Supplier-imported price
Manually overridden price
Quoted item
Missing price
Stale price
Conflicting price
Locked price

Display:

Pricing source
Effective date
Last updated date
Updated by
Override reason
Supplier name
Quote reference

Never overwrite a manual override without user confirmation.

2. Supplier CSV Import

Create a guided supplier-price import flow.

Import steps
Upload file
Select supplier
Map columns
Preview records
Match supplier items
Resolve conflicts
Choose update destination
Confirm
View import summary
File upload

Support:

Drag and drop
File picker
CSV validation
File-size display
Row-count display
Duplicate-file warning
Unsupported-file warning
Password-protected-file warning where relevant
Upload progress
Retry
Cancel
Column mapping

Allow users to map:

Supplier item code
Manufacturer
Part number
Description
Unit
Package quantity
Quantity
Unit price
Extended price
Quote number
Quote date

Provide:

Automatic mapping suggestions
Manual correction
Required-field indicators
Sample values
Mapping preview
Item matching

Display:

Supplier description
Supplier part number
Supplier unit
Supplier price
Suggested Brightpoint item
Match confidence
Existing item description
Existing price
Price difference
Action

Actions:

Accept match
Choose another item
Create company item
Ignore record
Apply only to current estimate
Apply to company price book
Save match rule for future imports
Matching states

Include:

Exact match
High-confidence match
Medium-confidence match
Low-confidence match
No match
Multiple possible matches
Unit mismatch
Package-quantity conflict
Duplicate supplier item
Invalid price

Require explicit confirmation before updating company-wide pricing.

Import result

Show:

Records imported
Records updated
New company items created
Records ignored
Records requiring review
Errors
Total material-price change
Download error report
View import history
Undo import where technically possible
3. Labour and Crew Configuration

Create a labour setup and crew-cost builder.

Labour profiles

Support:

System labour level 1
System labour level 2
System labour level 3
Brightpoint aggressive labour
Company labour profile
Project-specific labour
Zone-specific labour
Assembly-level labour override
Item-level labour override

Clearly differentiate:

Labour unit
Labour hours
Wage rate
Labour burden
Productivity factor
Total labour cost
Crew builder

Fields:

Role
Worker name or role label
Number of workers
Base hourly wage
Labour burden percentage
Burdened hourly rate
Overtime rate
Planned percentage of total hours
Productivity factor
Notes

Support:

Add crew member
Duplicate role
Remove role
Reorder roles
Save crew template
Apply saved crew template
Set company default
Override for current project
Labour summary

Show:

Total labour hours
Average burdened rate
Total labour cost
Labour cost by role
Labour cost by discipline
Labour cost by assembly
Overtime cost
Productivity adjustment
Cost comparison between labour profiles

Use clear charts only where they improve understanding. Keep financial totals table-based and precise.

4. Estimate Builder

Create a structured estimate-builder screen with expandable financial sections.

Material section

Include:

Base material cost
Supplier adjustments
Waste
Freight
Sales tax
Quoted materials
Material contingency
Total material cost
Labour section

Include:

Total labour hours
Base labour cost
Labour burden
Overtime
Shift premium
Productivity adjustment
Labour contingency
Total labour cost
Other direct costs

Include:

Equipment rental
Lifts
Scaffolding
Subcontractors
Permits
Bonds
Testing
Temporary power
Freight
Travel
Accommodation
Small tools
Other expenses

Allow users to:

Add custom expense
Categorize expense
Enter quantity and unit price
Mark taxable or non-taxable
Add notes
Attach supporting document
Commercial adjustments

Include:

Overhead
Contingency
Markup
Target gross margin
Profit amount
Discount
Final adjustment

Clearly distinguish:

Markup percentage
Gross margin percentage

Provide concise explanatory tooltips.

Final bid summary

Show:

Material
Labour
Direct job expenses
Overhead
Contingency
Profit
Tax
Final bid
Profit amount
Gross margin
Price per square foot where available
Price per labour hour where relevant

Use a sticky summary panel on large screens.

Update calculations immediately after edits.

Show before-and-after values for major changes.

Do not hide formulas or critical financial assumptions.

5. Estimate Health and Validation

Create an “Estimate health” system that helps users identify incomplete or risky areas.

Warning categories

Include:

Unverified drawing scale
Missing material price
Missing labour value
Unassigned assembly
Unquoted fixture
Supplier quote not received
Supplier quote expired
Tax not confirmed
Hidden takeoff objects
Excluded objects
Unreviewed AI results
Drawing revision not reviewed
Negative margin
Unusually low labour
Unusually high material cost
Missing direct expense
Estimate not approved
Severity levels

Use:

Information
Recommendation
Warning
Blocking error

Do not block users for non-critical recommendations.

Each issue should include:

Issue title
Explanation
Affected records
Severity
Recommended action
“Resolve” action
“Open affected item” action
Dismiss where allowed

Clicking an issue should navigate directly to:

Drawing object
Pricing row
Labour configuration
Estimate section
Supplier import
AI review

Show a progress indicator such as:

Estimate is 82% ready for review

Clarify that this measures completion, not guaranteed accuracy.

6. Estimate Review and Approval

Create a review workflow for senior estimators and business owners.

Review screen

Include:

Estimate summary
Major assumptions
Scale verification status
Material-price status
Labour profile
Supplier quotes
Overhead
Markup
Margin
Estimate-health issues
Change history
Reviewer comments
Actions

Support:

Request changes
Approve estimate
Approve with comments
Return to estimator
Lock estimate
Unlock with permission
Create estimate version
Compare versions
Status values

Use:

Draft
Takeoff in progress
Pricing required
Ready for review
Changes requested
Approved
Submitted
Won
Lost
Archived

Display audit information for every approval action.

7. Quote and Proposal Builder

Create a customer-facing quote workflow.

Quote editor sections

Include:

Company branding
Company information
Customer information
Project information
Proposal number
Proposal date
Scope of work
Included work
Exclusions
Allowances
Alternates
Base bid
Tax
Final total
Payment terms
Bid validity
Schedule assumptions
Signature area
Attachments
Section behavior

Support:

Add section
Edit section
Duplicate section
Delete section
Drag to reorder
Hide from final quote
Save as quote template
Restore default section
Preview page breaks
Alternates

Support:

Add alternate
Deduct alternate
Optional alternate
Included alternate
Separate pricing
Toggle inclusion in final total
Quote preview

Create:

Desktop preview
PDF preview
Page thumbnails
Page break indicators
Print-safe layout
Zoom
Fit page
Download PDF
Return to edit
Send quote

Include:

Recipient
CC
BCC
Subject
Message
Attach proposal PDF
Attach material summary optionally
Attach supporting files
Send copy to self
Save draft
Schedule send
Send now
Quote states

Create:

Draft
Scheduled
Sending
Sent
Delivery failed
Viewed, only if technically supported
Cancelled
Revised
Accepted
Declined

Do not show delivery or view states unless they are technically supported.

8. Reports

Create report screens for:

Bill of materials
Supplier quote request
Material extension
Labour summary
Crew-cost summary
Direct job expenses
Estimate summary
Final bid calculation
Bid pipeline
Win/loss report
Estimate activity
Supplier pricing history
Assembly usage
Project material report
Report controls

Include:

Date range
Project filter
Estimator filter
Customer filter
Supplier filter
Status filter
Discipline filter
Saved report view
Export CSV
Export PDF
Print
Share
Report states

Create:

Populated
Empty
Loading
Partial data
Failed
Permission restricted
Exporting
Export successful
Export failed

Use tables for detailed data and simple charts only for useful summaries.

9. Team, Permissions and Field Access

Create team-management screens.

Team table

Include:

User
Email
Role
Status
Last active
Projects assigned
Access level
Actions
Team actions

Support:

Invite user
Resend invitation
Change role
Suspend access
Remove user
Transfer project assignments
Reset access
View activity
Roles

Support:

Owner
Admin
Senior estimator
Estimator
Reviewer
Field viewer
Permissions matrix

Include permissions for:

View projects
Edit projects
Perform takeoff
Edit assemblies
Create company items
View material costs
View labour rates
View markup
View profit
Import supplier pricing
Send quotes
Approve estimates
Manage users
Manage company settings
Export reports

Users without access to profit or sensitive pricing should see a clear restricted state rather than missing or broken content.

Field viewer experience

Create a simplified tablet-oriented field interface for:

Viewing drawings
Viewing material reports
Checking wire requirements
Viewing assembly details
Adding notes
Downloading project reports

Do not expose markup or profit to field users.

10. Company Settings

Create settings sections for:

Company profile
Branding
Logo
Address
Contact information
Currency
Measurement system
Tax defaults
Labour defaults
Labour burden
Overhead defaults
Markup defaults
Quote templates
Supplier settings
Material price settings
Notification settings
Security
Data retention
Integrations
AI preferences
File storage
Audit history
Settings behavior

Include:

Save changes
Discard changes
Autosave where appropriate
Unsaved-change warning
Permission restrictions
Reset to default
Confirmation for destructive changes
11. Collaboration and Activity

Create lightweight collaboration features.

Include:

Assigned estimator
Assigned reviewer
Comments
Mentions
Replies
Resolve comment
Activity timeline
Recently edited by
Change history
Estimate-version history
AI action history
Supplier-import history
Quote history
Approval history

Do not create multiplayer cursors unless clearly marked as future scope.

12. Notifications

Create a notification center for:

Bid deadline approaching
Estimate assigned
Estimate ready for review
Changes requested
Estimate approved
Supplier quote missing
Supplier import completed
Supplier import failed
Quote sent
Quote delivery failed
AI processing completed
AI processing failed
Comment mention
Drawing revision uploaded

Support:

Mark as read
Mark all as read
Filter
Notification settings
Open related record
13. AI-Assisted Experiences

AI must assist users without silently controlling the estimate.

AI Count flow

Create this workflow:

Select drawing page or region
Choose target symbol or fixture type
Start AI Count
Display processing state
Show suggested matches
Show confidence levels
Review individual results
Approve or reject
Correct mismatches
Assign assembly
Commit approved results
AI count states

Include:

Processing
Suggested
High confidence
Medium confidence
Low confidence
Approved
Rejected
Needs review
Failed

AI suggestions must look visually different from committed manual takeoff objects.

AI Review inspector

For each suggestion show:

Detected symbol
Suggested fixture type
Match explanation
Confidence
Drawing source
Fixture-schedule source where available
Suggested assembly
Alternative matches
Approve
Reject
Correct
AI scale detection

Show:

Detected scale
Confidence
Source text
Apply
Verify manually
Reject

Never silently apply uncertain scale values.

AI page classification

Support:

Detected sheet number
Detected drawing title
Discipline
Confidence
Source region
Manual correction
AI assembly recommendation

Show:

Recommended assembly
Why it matches
Building conditions used
Alternative assemblies
Confidence
Apply
Preview
Reject
AI supplier matching

For unmatched supplier records show:

Suggested item
Confidence
Matching attributes
Alternative matches
Accept
Correct
Ignore
Save match rule
AI project brief

Create an optional panel that summarizes:

Project name
Location
Building type
Relevant electrical disciplines
Bid deadline
Fixture-supply responsibility
Key exclusions
Demolition scope
Important specification notes

Every statement should link to its source page or document.

AI trust rules
Label AI-generated content
Show source references
Show confidence
Require user approval
Preserve manual changes
Support undo
Keep audit history
Never modify final financial values silently
Never overwrite approved work
Always provide a manual fallback
AI errors

Create states for:

Drawing quality too low
Unable to process page
Scale not verified
No matching symbols found
Conflicting fixture schedule
Unsupported page
Processing timeout
Usage limit reached
Connection lost
Partial results available

Every error must explain:

What happened
What was affected
What the user should do next
14. Global Search and Command Menu

Create a Command/Ctrl + K menu.

Include:

Search projects
Search estimates
Search assemblies
Search material items
Open recent project
Create project
Open takeoff workspace
Open pricing
Open estimate health
Generate quote
Navigate to libraries
Navigate to settings
Open keyboard shortcuts

Support:

Keyboard navigation
Recent searches
Grouped results
No-results state
Loading state
Permission-aware results
15. Empty States

Create professional empty states for:

No projects
No drawings
No takeoff items
No assemblies
No company assemblies
No supplier pricing
No supplier matches
No labour profiles
No estimate warnings
No quotes
No reports
No team members
No comments
No notifications
No AI results
No search results

Each empty state should include:

Clear explanation
Primary action
Optional secondary action
Minimal professional visual

Avoid playful illustrations in critical estimating workflows.

16. Loading States

Use skeleton loaders for:

Dashboard
Tables
Project lists
Pricing table
Reports
Assembly search
Inspector content
Activity history

Use progress indicators for:

PDF upload
PDF processing
Supplier import
AI Count
AI document analysis
Quote generation
Report export

Preserve layout during loading.

Allow cancellation when technically safe.

17. Error States

Create:

Inline field error
Form-level error summary
Toast error
Persistent system banner
Offline state
Permission error
Session expired
Unsaved changes
Conflicting edits
Calculation failure
Supplier import failure
Quote generation failure
Email delivery failure
Report export failure
AI processing failure
Drawing loading failure

Error messages must explain:

What happened
What data was affected
Whether work was saved
What the user should do next

Avoid vague messages such as “Something went wrong.”

18. Success Feedback

Use subtle feedback:

Saved indicator
Checkmark
Toast
Updated-row highlight
Completed progress state
Undo toast

Autosave states:

Saving…
Saved
Offline changes pending
Save failed

Avoid celebratory animations.

19. Responsive Behavior
Desktop: 1440 px and above
Expanded global navigation
Full financial tables
Sticky estimate summary
Left and right workspace panels
Full toolbar labels where useful
Desktop: 1280 px
Navigation may collapse
Secondary actions move into overflow
Toolbar labels reduce
Inspector remains available
Tables retain critical frozen columns
Desktop: 1024 px
Side panels become overlay drawers
One contextual panel opens at a time
Tables become horizontally scrollable
Sticky totals remain visible
Canvas remains primary
Secondary actions move into menus
Tablet: 834 × 1194

Prioritize:

Project overview
Drawing review
Takeoff review
Material report
Estimate approval
Comments
Notifications

Allow limited counting, annotation, and approval.

Do not force advanced assembly creation or detailed financial editing onto tablet.

Mobile companion concept

Create lightweight mobile screens for:

Dashboard summary
Bid deadlines
Project status
Quote viewing
Material report
Notifications
Review comments

Do not create a full mobile takeoff workspace.

20. Accessibility

Design to WCAG 2.2 AA.

Include:

Visible keyboard focus
Logical tab order
Screen-reader labels
Proper heading hierarchy
Accessible form validation
Accessible table navigation
Accessible modal focus trapping
Non-colour status indicators
Reduced-motion support
200% zoom support
Minimum 44 × 44 px tablet touch targets
No critical information shown only on hover
Clear labels for financial inputs
Alternative structured list for canvas takeoff objects
Announcements for save, error, AI completion, and import completion

Document keyboard behavior for all complex interfaces.

21. Motion and Micro-Interactions

Use motion only to communicate state.

Timing:

Hover: 100–150 ms
Panel opening: 180–220 ms
Drawer: 220–280 ms
Modal: 180–240 ms
Toast: 200–250 ms
Table save highlight: 200–300 ms
AI result reveal: brief stagger
Drag response: immediate

Include:

Row-save feedback
Supplier-match approval
AI approval transition
Estimate-health resolution
Panel expansion
Drag insertion
Quote generation
Autosave
Undo feedback

Respect reduced-motion preferences.

22. Prototype Flows

Create connected high-fidelity prototype flows.

Flow A: Complete manual estimate

Dashboard → Create project → Upload PDF → Organize drawings → Set scale → Count fixtures → Measure conduit → Assign assemblies → Review extension → Configure labour → Add expenses → Review estimate health → Approve estimate → Generate quote → Send quote

Flow B: Supplier pricing

Pricing → Upload supplier CSV → Map columns → Review matches → Resolve unmatched item → Apply to current estimate → View updated pricing

Flow C: Labour configuration

Estimate → Open labour setup → Apply crew template → Adjust burden → Compare labour profiles → Save → View updated estimate total

Flow D: AI Count

Takeoff workspace → Select drawing region → Run AI Count → Review suggestions → Approve high-confidence items → Correct one result → Assign assembly → Commit results

Flow E: Estimate review

Estimator submits estimate → Reviewer opens health panel → Requests correction → Estimator resolves issue → Reviewer approves → Estimate locks

Flow F: Quote generation

Approved estimate → Create quote → Edit scope → Add exclusion → Add alternate → Preview PDF → Send email → View sent state

Flow G: Error recovery

Start linear takeoff without scale → Show warning → Calibrate scale → Continue successfully

23. Required High-Fidelity Screens

Create at least:

Extension and pricing table
Pricing row expanded
Canvas-to-table linked selection
Supplier CSV upload
Column mapping
Supplier item matching
Import summary
Labour profiles
Crew builder
Estimate builder
Estimate summary
Estimate health
Estimate review
Changes requested
Estimate approved
Quote builder
Quote preview
Send quote
Quote sent
Reports dashboard
Bill of materials report
Labour report
Bid pipeline report
Team management
Invite user
Permissions matrix
Company settings
Activity timeline
Notification center
AI Count processing
AI Count review
AI assembly suggestion
AI supplier matching
AI project brief
AI failure state
Global search
Tablet drawing review
Tablet material report
Tablet estimate approval
Mobile dashboard concept
Global empty state
Global loading state
Global error state
Session expired state
Permission-restricted state
Keyboard shortcuts modal
24. Developer Handoff

Prepare all screens for engineering.

Use:

Auto layout
Existing Figma variables
Existing shared components
Component properties
Responsive constraints
Semantic naming
Clean layer structure
No unnecessary absolute positioning
Document for each major screen

Include:

Screen purpose
Data requirements
User permissions
Responsive behavior
Scroll behavior
Sticky behavior
Loading state
Empty state
Error state
Validation
Keyboard interactions
Autosave behavior
Calculation rules
AI review requirements
Undo behavior
Data persistence
Edge cases
Add annotations for
Minimum and maximum panel widths
Table virtualization
Frozen columns
Sticky totals
Currency rounding
Percentage formatting
Markup and margin formulas
Supplier price precedence
Assembly versioning
Estimate locking
Quote status transitions
AI confidence treatment
Permission behavior
Tablet restrictions
Component naming examples
Table/Pricing/Row
Table/Cell/Currency
Pricing/Source/Supplier
Estimate/Health/Warning
Labour/CrewMember/Row
Quote/Section/Scope
AI/Suggestion/CountMarker
AI/Confidence/Medium
Permissions/Matrix/Cell
Export-ready assets

Prepare:

SVG icons
Product logo
Quote PDF template
Email preview
Empty-state visuals
Loading indicators
Report templates
25. Final Quality Standard

The final application should feel:

Cleaner and easier than McCormick
Familiar to users of Figma, Adobe, Bluebeam, and CAD software
Reliable enough for high-value electrical bids
Efficient for large material databases
Clear when displaying labour and financial calculations
Transparent when AI is involved
Scalable for multiple contractor companies
Accessible and responsive
Ready for client testing
Ready for development handoff

Keep the drawing and takeoff workflow central.

Keep assemblies, pricing, labour, estimate health, and quote generation closely connected.

Reveal advanced controls only when needed.

Ensure every automated result remains visible, explainable, reviewable, editable, and reversible.