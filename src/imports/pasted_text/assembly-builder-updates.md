Update only the existing Libraries and Assembly Builder screens.

Do not regenerate the module, redesign layouts, change the design system, or modify unrelated screens. Reuse all current components, styles, variables, spacing, colors, typography, and navigation.

Make only the following targeted changes.

## 1. Add Context-Aware Recommendations

Below the guided configuration accordions, add a compact recommendation panel titled:

**Context-aware suggestions**

Show supporting text based on the current selections, for example:

**Based on ACT Ceiling + LED Troffer 2×4.**

Add a small **AI-assisted** label in the top-right.

Display suggestion chips such as:

* * Independent support wire
* * T-bar clip
* * MC connector
* * Wire connector set

Each suggestion chip must be clickable.

When clicked:

* Add the item to the Bill of Materials
* Change the chip to an added state with a checkmark
* Update component count
* Update material cost and labour where applicable
* Show brief success feedback
* Prevent duplicate additions

Suggestions must update when the user changes:

* Installation context
* Fixture or device
* Mounting method
* Wiring method
* Dimming
* Emergency option
* Project conditions

Use context-aware examples:

* ACT ceiling → support wire and T-bar clips
* Wood framing → wood screws
* Metal framing → self-drilling screws
* Concrete → concrete anchors
* Bar joist → beam clamps and suspension support
* Healthcare → HCF cable and hospital-grade components

Keep all AI recommendations optional and manually reviewable.

## 2. Add Advanced Manual Item Search

Directly below the recommendation panel, add a collapsed expandable section titled:

**Advanced: Search or add items manually**

When expanded, show:

* Search field
* Placeholder: “Search complete master item library…”
* Add Item button
* Search results dropdown
* Item name
* Item code
* Category
* Unit
* Add action

Allow users to:

* Search for a missing component
* Add a custom component
* Replace an existing BOM item
* Add manufacturer-specific items

The Add Item button must add the selected item to the BOM and update calculations.

Keep manual search secondary to the guided configurator.

## 3. Replace Library List with Dropdown

In the left panel, replace the permanently visible library list with one compact dropdown selector.

Label:

**Active Library**

Default value:

**BPL – Primary Library**

Dropdown options:

* BPL – Primary Library
* Riverside Medical Office
* Dollar Tree Job Library

Each dropdown option should display:

* Library name
* Library type
* Assembly count
* Read-only or editable status

Example:

* BPL – Primary Library · System · 248 assemblies · Read only
* Riverside Medical Office · Customer · 34 assemblies
* Dollar Tree Job Library · Job · 12 assemblies

Below the dropdown, keep one secondary action:

**+ New Library**

Do not display all libraries as a long vertical list.

Changing the dropdown must update:

* Active library
* Assembly results
* Source labels
* Library assembly counts
* Save destination defaults

## 4. Make Bill of Materials Editable

Update every BOM row so users can edit its data directly.

Each row should support:

* Editable item name where permitted
* Editable quantity
* Editable unit
* Editable item code where permitted
* Replace item
* Remove item
* Optional or required toggle
* Manual override indicator

Use compact inline editing.

Example fields:

* Quantity input
* Unit dropdown
* Item selector or replace action
* Overflow menu

When quantity changes:

* Recalculate material cost
* Recalculate labour where applicable
* Update estimate-related values
* Briefly highlight the changed row
* Show “Manual override” when the calculated value is changed

For calculated items, show the original calculation below the editable value.

Example:

**6.3 LF**

Calculation:

**6 LF + 5% waste**

Include:

* Reset to calculated value
* Reset to suggested item
* Undo removal

Warn before removing required components.

## 5. Collapse All Configuration Accordions by Default

In Build Mode, all numbered configuration sections must be collapsed when the page first opens.

Sections include:

1. Selection
2. Mounting
3. Wiring
4. Options

Show only the section heading and a short selected-value summary when collapsed.

Example:

**Selection — LED Troffer 2×4 · ACT Ceiling**

**Wiring — MC-PCS 12/3 · 8 LF · 5% waste**

Only one accordion should be open at a time by default.

When another section opens, collapse the previously opened section.

Add two compact actions above the accordion group:

* Expand All
* Collapse All

The actions must work.

Accordion states:

* Collapsed
* Expanded
* Complete
* Incomplete
* Validation error
* Disabled

Use a chevron that clearly changes direction.

Preserve entered data when sections collapse.

## 6. Add Missing Bottom Actions

Ensure the following actions are present and functional in the Assembly Builder footer:

* Duplicate
* Edit
* Save to Library
* Save as Company Assembly
* Save to Current Job Library
* Preview BOM
* Start Takeoff

Avoid oversized buttons.

Use one clear primary action and place less-used actions inside an overflow menu when space is limited.

Recommended primary action:

**Start Takeoff**

Recommended secondary actions:

* Preview BOM
* Save to Library

Overflow actions:

* Duplicate
* Edit
* Save as Company Assembly
* Save to Current Job Library

## 7. Interaction Requirements

Make these interactions functional:

* Add an AI recommendation
* Remove an added recommendation
* Search a manual item
* Add a manual item
* Change active library from the dropdown
* Edit BOM quantity
* Change BOM unit
* Replace BOM item
* Remove BOM item
* Reset calculated quantity
* Expand one accordion
* Collapse one accordion
* Expand all
* Collapse all
* Preview BOM
* Save assembly
* Start Takeoff

## 8. Credit-Efficient Execution

Do not recreate existing screens.

Do not rewrite existing components.

Do not generate alternate versions.

Patch only the affected components and states:

* Library selector
* Recommendation panel
* Manual item search
* BOM rows
* Accordion behavior
* Footer actions

Keep all other design and functionality unchanged.
