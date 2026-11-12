# Opportunity Multi-Select & Fee Column Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Opportunity page multi-select bar to offer Clear, Archive, and Set owner actions (removing Send to artist / bulkSend), and rename the "APPLICATION FEE" table column header to "FEE" on both the Opportunity (Open Calls) and Pitch (Artists) pages.

**Architecture:** 
- Update table column headers in `app.js` (`renderListTable` for Opportunities and `loadArtistsList` for Pitches) from `APPLICATION FEE` to `FEE`.
- Update `#bulk` markup in `index.html` to contain `bulkClear`, `bulkArchive`, and `bulkSetOwner`, eliminating `bulkSend`.
- Update `app.js` `updateBulk()` and wire `bulkSetOwner` to open the team member picker and assign the selected curator as owner across all selected opportunities and their matched pitches.

**Tech Stack:** Vanilla JS (ES6+), HTML5, CSS3, Node.js test harness.

**Spec:** User requests on 12 Nov 2026:
- "the column name application fee on the opportunity and pitch page needs to be application fee -> fee"
- "On the opportunity page. the multi select should have clear, archive, set owner, send to artist" followed by "actually remove the send to artist mult select".

## Global Constraints

- No deployment or touch to live Google Sheets/Apps Script.
- Preserves all 34 passing test suites in `tools/`.
- Badge and palette colors remain consistent with existing design tokens.
- Works cleanly on desktop and mobile viewport sizes.

## Review Focus

1. Header text regression: ensure neither table displays "APPLICATION FEE" and both display "FEE".
2. Multi-select button list: `#bulk` has exactly Clear, Archive/Restore, and Set owner.
3. Multi-select owner assignment when opportunities have matched artists: each matched artist's pitch is updated with the owner.
4. Multi-select owner assignment when an opportunity has no matched artist: sets `assignedTo` on the opportunity without crashing.
5. Selection cleanup: clearing selection or completing bulk action correctly resets selection state and hides `#bulk`.

---

### Task 1: Rename Column Header "APPLICATION FEE" to "FEE" on Opportunity and Pitch Pages

**Files:**
- Modify: `C:/Users/hazel/Downloads/New folder (2)/app.js:1840`
- Modify: `C:/Users/hazel/Downloads/New folder (2)/app.js:2552`
- Test: `C:/Users/hazel/Documents/Claude/tools/audit-tests/a8-fee-header-and-bulk-test.js`

**Interfaces:**
- Consumes: `renderListTable`, `loadArtistsList`
- Produces: Updated HTML tables with `<th style="width:15%;">FEE</th>`

- [ ] **Step 1: Write the failing test**

In `C:/Users/hazel/Documents/Claude/tools/audit-tests/a8-fee-header-and-bulk-test.js`:
Add checks that verify:
- `renderListTable` output contains `<th style="width:15%;">FEE</th>` and does not contain `APPLICATION FEE`.
- `tableHeader` in `loadArtistsList` contains `<th style="width:15%;">FEE</th>` and does not contain `APPLICATION FEE`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node "C:\Users\hazel\Documents\Claude\tools\node\node.exe" "C:\Users\hazel\Documents\Claude\tools\audit-tests\a8-fee-header-and-bulk-test.js"`
Expected: FAIL (still contains `APPLICATION FEE`)

- [ ] **Step 3: Update `app.js` column headers**

In `app.js`:
- Line 1840: Change `<th style="width:15%;">APPLICATION FEE</th>` to `<th style="width:15%;">FEE</th>`.
- Line 2552: Change `<th style="width:15%;">APPLICATION FEE</th>` to `<th style="width:15%;">FEE</th>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node "C:\Users\hazel\Documents\Claude\tools\node\node.exe" "C:\Users\hazel\Documents\Claude\tools\audit-tests\a8-fee-header-and-bulk-test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "Rename column header APPLICATION FEE to FEE on opportunity and pitch tables"
```

---

### Task 2: Update Opportunity Page Multi-Select Bar with Clear, Archive, and Set Owner

**Files:**
- Modify: `C:/Users/hazel/Downloads/New folder (2)/index.html:543-548`
- Modify: `C:/Users/hazel/Downloads/New folder (2)/app.js:2660-2690`
- Test: `C:/Users/hazel/Documents/Claude/tools/audit-tests/a8-fee-header-and-bulk-test.js`

**Interfaces:**
- Consumes: `#bulk`, `selected`, `lists`, `p2_getPeople`, `p2_updateApplicationDetails`
- Produces: Multi-select owner assignment and updated bulk actions bar

- [ ] **Step 1: Write the failing test for multi-select bar and bulk owner assignment**

In `C:/Users/hazel/Documents/Claude/tools/audit-tests/a8-fee-header-and-bulk-test.js`:
- Check `index.html` for `#bulk`: contains `#bulkClear`, `#bulkArchive`, `#bulkSetOwner`; does not contain `#bulkSend`.
- Check bulk owner assignment logic updates multiple selected calls and their pitches.

- [ ] **Step 2: Run test to verify it fails**

Run: `node "C:\Users\hazel\Documents\Claude\tools\node\node.exe" "C:\Users\hazel\Documents\Claude\tools\audit-tests\a8-fee-header-and-bulk-test.js"`
Expected: FAIL (missing `#bulkSetOwner`, still has `#bulkSend`)

- [ ] **Step 3: Update `index.html` markup**

In `index.html`:
Replace `#bulkSend` with `<button type="button" class="solid" id="bulkSetOwner">Set owner</button>`.

- [ ] **Step 4: Update `app.js` bulk logic**

In `app.js`:
- In `updateBulk()`, remove any reference to `bulkSend`.
- Implement `openBulkAssignOwnerModal()`:
  - Reads `selected` rows.
  - Loads people via `p2_getPeople()`.
  - Opens curator picker sheet listing active team members.
  - On clicking a curator, calls `assignSelectedCallsToUser(userName, rows)`:
    - Loops over `rows`.
    - Updates local call `assignedTo = userName`.
    - For each matched artist on the call, calls `p2_updateApplicationDetails` with `{ assignedTo: userName }`.
    - Invalidates cache, re-renders list, clears selection (`clearSelection(true)`), and shows toast: `userName + ' set as owner for ' + count + ' opportunity' + (count === 1 ? '.' : 'ies.')`.
- Bind `$('bulkSetOwner').onclick = () => openBulkAssignOwnerModal();`.

- [ ] **Step 5: Run tests to verify all 35 test suites pass**

Run: `node "C:\Users\hazel\Documents\Claude\tools\run-all-tests.js"`
Expected: 35 files: 35 ok, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js tools/audit-tests/a8-fee-header-and-bulk-test.js
git commit -m "Add Set owner to opportunity multi-select bar and remove bulk send"
```
