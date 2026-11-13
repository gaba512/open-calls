# Tikorix: Master Documentation Guide & Authority Index

**Last Updated:** 13 November 2026  
**Status:** Canonical Reference

---

## 1. Why Conflicting Rules Existed

As Tikorix evolved over the past two weeks, earlier documents introduced older concepts that have since been superseded:
- **Early Phase (1–4 Nov):** Monolithic Google Apps Script files (`Code.gs`) and generic terminology ("Open Calls", "Applications", "Assign to Artist").
- **Mid Phase (5–10 Nov):** Architecture overhaul documents that proposed different interim data schemas.
- **Current Canonical Phase (11–13 Nov):** The unified workflow agreed upon and implemented across `backend/` and `frontend/`.

All older historical architecture specs have been safely archived in `docs/_superseded/`.

---

## 2. The Single Source of Truth for Rules & Terms

When developing, reviewing, or operating Tikorix, **always consult these primary documents in order**:

| Priority | Document | Location | Purpose & Scope |
| :---: | :--- | :--- | :--- |
| **#1** | **Workflow & Terminology** | [`docs/tikorix-specs/6-Workflow-and-terms.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/6-Workflow-and-terms.md) | **The canonical business logic.** Defines: Opportunities vs. Pitches, Match rules, Owner assignments, Review steps, Pitch stages, and Running Packs. |
| **#2** | **Project Index & Navigation** | [`docs/tikorix-specs/0-START-HERE.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/0-START-HERE.md) | The master map of all current specifications, test tools, and directory paths. |
| **#3** | **Decisions & Visuals** | [`docs/tikorix-specs/10-Decisions-13-Nov-visuals.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/10-Decisions-13-Nov-visuals.md) | The authoritative UI/UX decisions resolved on 13 November. |
| **#4** | **Active Work List** | [`docs/tikorix-specs/11-Work-list-from-decisions.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/11-Work-list-from-decisions.md) | The current priority task list based on the approved decisions. |
| **#5** | **Deploy Checklist** | [`docs/Deploy checklist.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/Deploy%20checklist.md) | Step-by-step verification when releasing backend or frontend changes. |
| **#6** | **Manual Cloud & OAuth Setup** | [`docs/Manual setup.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/Manual%20setup.md) | Google Cloud Console OAuth 2.0 and Apps Script property configurations. |

---

## 3. Quick Rule Glossary (Canonical Terminology)

To prevent confusion across codebase and tickets, use only these terms:

* **Opportunity:** The open call record itself (formerly *call*, *open call*, *opp*).
* **Pitch:** One opportunity offered to one specific artist. All stage progress and deadlines live here (formerly *application*, *artist call*).
* **Match:** Assigning an artist to an opportunity (creates a pitch).
* **Owner:** The internal team member responsible for that artist's pitch.
* **Review Steps (Phase 1):** `Inbox` ➔ `Verified` ➔ `Matched` ➔ `Owner set`.
* **Pitch Stages (Phase 2):** Five explicit stages tracked per artist pitch.
* **Running Pack:** The automated Google Doc generated per artist that bundles matched pitches for presentation.

---

## 4. Archive & Legacy Reference

* `docs/_superseded/`: Holds historical phase 1–4 proposals and early audit notes. Kept for historical reference only; **do not use for active development**.
