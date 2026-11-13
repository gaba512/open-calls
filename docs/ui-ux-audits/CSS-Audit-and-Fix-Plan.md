# Tikorix CSS: Audit and Fix Plan

**Date:** 13 November 2026
**Scope:** `frontend/styles.css` + `frontend/css/*.css` (the GitHub Pages / Apps Script HtmlService bundle).
**Author:** Claude Code (opus 4.7)

---

## 0. Findings at a glance

Numbers taken from `frontend/css/` on 13 Nov 2026.

| Signal | Count | Where it hurts most |
|---|---|---|
| `!important` declarations | ~1,512 | `07-views.css` (734), `04-workspace.css` (516), `05-responsive.css` (121) |
| Hard-coded hex outside tokens | 773 | `07-views.css`, `04-workspace.css` |
| `font-size: Npx` (no rem/clamp) | 224 | everywhere |
| `outline: none` / `outline: 0` | 12 | `02-refresh.css`, `04-workspace.css` |
| `:focus-visible` rules | 3 | too few for the number of interactive elements |
| `prefers-reduced-motion` blocks | 1 | 69 `transition:` declarations |
| Distinct `z-index` values | 20 | ad-hoc (1, 2, 10, 15, 20, 25, 28, 40, 45, 50, 100, 120, 121, 130, 999, 1000, 9999…) |
| `@media` queries | 41 | breakpoints are not unified |
| Hard-coded colours overriding tokens with `!important` | `color: #111827`×44, `background: #ffffff`×39, `color: #151e11`×21 | breaks dark mode |

### Top five concrete risks

1. **Dark mode is leaking light-mode colours.** 44× `color:#111827 !important` and 39× `background:#ffffff !important` in the legacy layer win over `[data-theme="dark"]` token overrides.
2. **Root `css/` tree is out of sync with `frontend/css/`.** `01-base`, `02-refresh`, `04-workspace`, `06-dark` differ by hash. Anyone editing the wrong tree will see no effect. Root is legacy only — `frontend/` is canonical per `CLAUDE.md`.
3. **Accessibility: focus rings are suppressed.** 12 `outline:none` for only 3 `:focus-visible` replacements. Keyboard users lose focus state on most controls.
4. **Motion has no reduced-motion fallback.** 69 transitions, 1 `prefers-reduced-motion` block.
5. **Cascade layers set up but unused.** `styles.css` declares `reset, tokens, layout, components, views, legacy`, but 6 of 7 stylesheets still load into `legacy`, so the layer system gives no benefit yet.

---

## 1. Live tree confirmation

- Both `index.html` files (repo root and `frontend/index.html`) are byte-identical (MD5 `9071AEDB…`). Each references `styles.css` next to it.
- GitHub Pages serves the repo root; the root `styles.css` imports `./css/*` (7 files, no `01-layout`, no `02-components`).
- `frontend/styles.css` imports 9 files, with the two migrated layers in place.
- **Canonical, per `CLAUDE.md`:** `frontend/`. Treat `frontend/css/` as the source of truth and plan a reconciliation step for the root copy (either delete the root duplicates or make root `styles.css` redirect to `frontend/`).

---

## 2. Step-by-step plan

Each step is a single commit. Visual regression check at every step: Overview, Open Calls (list + detail + editor), Artists, Analytics, Features, in both light and dark themes, at 375 px and 1280 px.

### Step 1 — Freeze a baseline (safety net)

- `git status` → commit any WIP.
- Tag the current tree: `git tag css-audit-baseline-20261113`.
- Snapshot screenshots of the six main views × 2 themes × 2 widths to `_archive/css-audit/baseline/`.
- No code changes.

### Step 2 — Reconcile the duplicate tree

- Confirm GitHub Pages' publish source (Settings → Pages). If it's `/root`, decide:
  - **Option A (recommended):** change source to `/frontend`, then delete root `index.html`, `styles.css`, `css/`, `js/`, `app.js` duplicates.
  - **Option B:** keep root as the live deploy and make root `styles.css` a one-liner that `@import`s from `./frontend/css/…` (or generate root from frontend via a sync script).
- Either way, end state: **one** CSS tree edited by hand.

### Step 3 — Unify breakpoints

- Add breakpoint tokens to `00-tokens.css`:
  ```css
  --bp-sm: 480px;  --bp-md: 768px;  --bp-lg: 1024px;  --bp-xl: 1280px;
  ```
- Search all 41 media queries, round each to the nearest token value, and leave a comment above each one noting which token it maps to. No visual change expected.

### Step 4 — Add a z-index scale

- In `00-tokens.css`:
  ```css
  --z-base:0; --z-raised:10; --z-sticky:100; --z-nav:200;
  --z-dropdown:300; --z-modal-backdrop:400; --z-modal:500; --z-toast:600; --z-tooltip:700;
  ```
- Replace the 20 ad-hoc `z-index` values with these. Keep a short mapping table in `04-workspace.css`.

### Step 5 — Restore keyboard focus

- Remove every `outline: none` / `outline: 0` that is not immediately followed by a `box-shadow` or `outline` replacement.
- Add a global focus-visible fallback near the top of `01-base.css`:
  ```css
  :where(a, button, [role="button"], input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
  ```
- Audit custom `:focus-visible` rules to make sure the ring is visible on dark backgrounds too.

### Step 6 — Reduced-motion support

- Near the end of `01-base.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- These `!important`s are intentional and documented.

### Step 7 prerequisite — layer order (DONE 14 Nov 2026)

> **Correction.** The first version of this plan said moving a whole legacy file into `views` would make its `!important`s redundant. That was wrong: `views` was declared *before* `legacy`, and `!important` reverses layer order, so the move changed which rules won app-wide. It was reverted.

Layer order is now `reset, tokens, layout, components, legacy, views`. `views` was empty, so the reorder changed nothing on screen; a before/after computed-style comparison of ~6,600 element checks (5 views × 2 themes × phone/tablet/desktop) showed zero differences. A `views` rule now beats a legacy rule without `!important`.

### Steps 7–9 — Drain `!important` (07-views 734, 04-workspace 516, 05-responsive 121)

Work **one component at a time** (e.g. the status tabs, the artist filter strip, the count badges), never one file at a time:

1. Collect every legacy rule that styles that component, across all legacy files.
2. Write one clean version in a `views`-layer file (e.g. `css/views/<component>.css`, imported with `layer(views)`), with **no** `!important` and only tokens for colour.
3. Delete the collected legacy rules. (A remaining legacy `!important` would still beat the clean rule.)
4. Run the before/after comparison (both themes, phone/tablet/desktop). Differences must be zero or intentional.
5. One component per commit.

### Step 10 — Typography scale

- In `00-tokens.css`:
  ```css
  --fs-xs: 0.75rem;   --fs-sm: 0.875rem;  --fs-base: 1rem;
  --fs-md: 1.125rem;  --fs-lg: 1.25rem;   --fs-xl: 1.5rem;
  --fs-2xl: 1.875rem; --fs-3xl: 2.25rem;  --fs-4xl: 3rem;
  ```
- Replace the 224 `font-size: Npx` with the nearest token. Keep `px` only for hairline borders, 1-px tweaks, and icon sizing.

### Step 11 — Dark mode pass

- Move `06-dark.css` content into its token overrides inside `00-tokens.css` wherever possible (surfaces, ink, borders). Any remaining dark-only rules stay in `06-dark.css` but load into the `views` layer so they don't need `!important`.
- Manually walk each view in dark mode and fix leaks.

### Step 12 — Accessibility sweep

- Contrast: audit text/background pairs for WCAG AA. Known risk areas: `--ink3` on `--sunk`, `--warn` on `--amber-bg`, lime on white.
- Tap targets: every interactive element ≥ 44×44 px at 375 px width.
- Form controls: labels linked, error states announced, `aria-invalid` on invalid fields.
- Run axe-core or Lighthouse on Overview, Open Calls list, Open Call editor, and Settings. Record deltas against baseline.

### Step 13 — Inline style cleanup (optional, lower priority)

- `index.html` and `app.js` hold ~294 `style=` attributes. Most are dynamic (progress widths, colours derived from data) — leave those. Promote any static ones to classes.

### Step 14 — Final verification

- Diff screenshots against `_archive/css-audit/baseline/`.
- Build the stage-4 rehearsal kit (`tests/stage4-rehearsal/`) and run it.
- Update `UI_UX_SPEC.md` with the new token scales and layer rules.
- Delete `_archive/claude-backups/audit-20261111-pre-fixes/` if its contents are now superseded.

---

## 3. Guardrails for the fix work

1. **One stylesheet per commit.** The cascade is fragile — never batch Step 7 and Step 8 together.
2. **No new `!important`.** If a rule can't win without it, the real problem is the wrong layer.
3. **No new hex literals** outside `00-tokens.css`. New shades go in the token file first.
4. **Grep gate** before each commit:
   ```powershell
   Select-String -Path frontend/css/*.css -Pattern '!important' | Measure-Object
   ```
   The number must only go down.
5. **Keep root and frontend trees in sync** until Step 2 is done. After Step 2, only `frontend/css/` is touched.

---

## 4. Suggested order of attack (short form)

1. Freeze baseline (Step 1).
2. Decide root vs. frontend (Step 2).
3. Breakpoint + z-index tokens (Steps 3–4).
4. Accessibility quick wins (Steps 5–6).
5. Big `!important` drain, one file at a time (Steps 7–9).
6. Typography and dark mode polish (Steps 10–11).
7. Accessibility sweep + verification (Steps 12, 14).

Estimated effort: ~2–3 focused days if the tree is reconciled first; ~1 week if both trees stay live.
