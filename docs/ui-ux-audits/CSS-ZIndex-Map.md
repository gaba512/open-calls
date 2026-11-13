# z-index mapping — current values → new tokens

> **⚠ Do not apply this table as-is (found 14 Nov 2026).** The token scale in `00-tokens.css` does not preserve the app's current stacking order: today the FAB (`.fab`, 28) sits *above* the nav (`nav.tabs`, 20; hover nav 40), but the scale puts `--z-fab` (150) *below* `--z-nav` (200). Several groups also collapse distinct values into one token (1/2, 10/15, 120/121/130, 999/1000), which can reorder siblings that overlap. Before swapping, re-derive the scale from the real order (sorted: 1, 2, 10, 15, 20, 25, 28, 40, 45, 50, 100, 120, 121, 130, 999, 1000, 9999) and check overlapping elements visually — the computed-style comparison can't verify this, because the numbers change by design.

**Date:** 13 November 2026
**Source:** `frontend/css/*.css`

The new scale lives in `00-tokens.css`. Existing raw numbers map as follows. Each will be replaced when the containing file is touched during Steps 7–9 of the audit plan (the big `!important` drain), to keep the risk per commit small.

| Current | File | Selector (approx) | Should become |
|---|---|---|---|
| `1` | `01-base.css` | `.trail-step.step-done:not(:last-child)::before` | `var(--z-raised)` |
| `1` | `07-views.css` | (misc badge/pseudo) | `var(--z-raised)` |
| `2` | `07-views.css` | (misc) | `var(--z-raised)` |
| `10` | `01-base.css` | `.toolbar` | `var(--z-sticky)` |
| `10` | `07-views.css` | `main` | `var(--z-sticky)` |
| `15` | `01-base.css` | `.actions` | `var(--z-sticky)` |
| `20` | `07-views.css` | `nav.tabs` | `var(--z-nav)` |
| `25` | `02-refresh.css` | (overlay) | `var(--z-nav)` |
| `28` | `01-base.css` | `.fab` | `var(--z-fab)` |
| `40` | `01-base.css` | hover-opened nav | `var(--z-nav)` |
| `45` | `07-views.css` | `.tk-filter-select` | `var(--z-dropdown)` |
| `50` | `04-workspace.css` | (overlay / dropdown) | `var(--z-dropdown)` |
| `100` | `07-views.css` | (sticky) | `var(--z-sticky)` |
| `120` | `02-components.css` | (component overlay) | `var(--z-dropdown)` |
| `121` | `02-components.css` | (sibling of 120) | `var(--z-dropdown)` (or `calc(var(--z-dropdown) + 1)`) |
| `130` | `02-components.css` | (menu above sibling) | `var(--z-dropdown)` (or calc) |
| `999` | `05-responsive.css` | mobile overlay | `var(--z-modal)` |
| `1000` | `04-workspace.css` | modal / backdrop | `var(--z-modal)` or `var(--z-backdrop)` depending on role |
| `9999` | `07-views.css` | toast | `var(--z-toast)` |

### Guardrails for replacement

- Open the file, confirm what the element actually does (nav, overlay, dropdown, modal, toast) before picking a token. Don't trust the table blindly for ambiguous cases.
- If two sibling elements genuinely need to stack against each other (e.g. a menu above its own overlay), use `calc(var(--z-dropdown) + 1)` rather than inventing a new token.
- After replacement, open the view and check: can you still see the modal? the dropdown? the toast? the menu while the drawer is open?
