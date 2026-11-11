// Categories for open calls. The list lives on a "Categories" tab in the sheet, so the whole team shares it.
// It starts from P2.CATEGORIES in Config.js. Anyone can add one from the open call form.

const CATEGORIES_TAB = 'Categories';

function categoriesTab_() {
  const ss = SpreadsheetApp.getActive();
  let tab = ss.getSheetByName(CATEGORIES_TAB);
  if (!tab) {
    tab = ss.insertSheet(CATEGORIES_TAB);
    tab.appendRow(['Category']);
    tab.getRange(1, 1, 1, 1).setFontWeight('bold');
    tab.setFrozenRows(1);
    P2.CATEGORIES.forEach(function (c) { tab.appendRow([c]); });
  }
  return tab;
}

// The current list, in sheet order, without duplicates.
function categoryList_() {
  const tab = categoriesTab_(), last = tab.getLastRow(), seen = {}, out = [];
  if (last < 2) return out;
  tab.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
    const name = String(r[0] || '').trim();
    const key = name.toLowerCase();
    if (name && !seen[key]) { seen[key] = true; out.push(name); }
  });
  return out;
}

function getCategories() {
  return { ok: true, categories: categoryList_() };
}

function addCategoryFromPage(name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!clean) return { ok: false, message: 'Enter a category name.' };
  if (/,/.test(clean)) return { ok: false, message: 'Category names can’t contain commas.' };
  if (/^[=+\-@]/.test(clean)) return { ok: false, message: 'Category names can’t start with = + - or @.' };
  const existing = categoryList_();
  const hit = existing.find(function (c) { return c.toLowerCase() === clean.toLowerCase(); });
  if (hit) return { ok: true, categories: existing, selected: hit, message: hit + ' is already in the list.' };
  categoriesTab_().appendRow([clean]);
  return { ok: true, categories: categoryList_(), selected: clean, message: 'Added ' + clean + '.' };
}
