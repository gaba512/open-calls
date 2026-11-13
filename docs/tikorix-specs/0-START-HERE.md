# Tikorix Documentation Map: Start Here

This is your master map for navigating all documentation within **Tikorix**.  
**Canonical Project Location:** `C:\Users\hazel\Documents\Projects\tikorix`  
**Last Updated:** 13 November 2026

---

## 1. Primary Specifications & Business Logic (Read These First)

All canonical product rules, workflows, and terminology are stored in [`docs/tikorix-specs/`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/):

| Document | Purpose & When to Read |
| :--- | :--- |
| [**6-Workflow-and-terms.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/6-Workflow-and-terms.md) | **The single source of truth for business logic.** Defines Opportunities vs. Pitches, Review Steps (`Inbox` ➔ `Verified` ➔ `Matched` ➔ `Owner set`), 5 Pitch Stages, and Running Packs. |
| [**10-Decisions-13-Nov-visuals.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/10-Decisions-13-Nov-visuals.md) | The definitive UI/UX decisions resolved on 13 November. |
| [**11-Work-list-from-decisions.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/11-Work-list-from-decisions.md) | Current implementation checklist derived from the 13 November decisions. |
| [**1-Status-and-decisions.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/1-Status-and-decisions.md) | High-level status snapshot of active modules, completed repairs, and open items. |
| [**9-UIUX-gap-analysis.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/9-UIUX-gap-analysis.md) | In-depth UI/UX gap analysis with visual issue catalog. |
| [**3-Change-log.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/3-Change-log.md) | Granular changelog tracking every code repair and test suite verification since 11 November. |
| [**2-Four-buttons-workflow.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/2-Four-buttons-workflow.md) | Technical spec for the Artists page action workflow. |
| [**8-Persona-journeys-review.md**](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/8-Persona-journeys-review.md) | Journey walkthroughs across curatorial and artist personas. |

---

## 2. Technical, Architectural & Operational Guides

| Document | Location | Purpose |
| :--- | :--- | :--- |
| **Project README** | [`README.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/README.md) | Main project overview, directory layout, test commands. |
| **System Architecture** | [`ARCHITECTURE.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/ARCHITECTURE.md) | Detailed data flow, routing mechanics, API layer, and state management. |
| **Deploy Checklist** | [`Deploy checklist.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/Deploy%20checklist.md) | Step-by-step release process for Google Apps Script, GitHub Pages, and Cloudflare Worker. |
| **Cloud & OAuth Setup** | [`Manual setup.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/Manual%20setup.md) | Google Cloud Console OAuth 2.0 configuration, Apps Script properties, and permissions. |
| **Notifications Plan** | [`Notifications and features plan.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/Notifications%20and%20features plan.md) | Delivery rules, schedule triggers, and email digest settings. |
| **Design Specifications** | [`UI_UX_SPEC.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/UI_UX_SPEC.md) | 145 discrete design and layout requirements. |

---

## 3. UI/UX Audits & Design Translations

Stored in [`docs/ui-ux-audits/`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/ui-ux-audits/):
- **`Tikorix-Framer-Design-Translation.html`**: Interactive HTML guide mapping Framer components to production code.
- **`Tikorix-Redesign-Plan.html`**: Redesign rollout plan.
- **`Tikorix-UIUX-Audit-Report.html`**: Visual audit report with reference screenshots.

---

## 4. Archived / Superseded Documents

Stored in [`docs/_superseded/`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/_superseded/):
Contains early draft proposals and preliminary audits from November 5 (`phase1_5_reconciled_audit_report.md`, `website_architecture_phase1-4.md`). These are kept purely for historical record and must **not** be used for active development.
