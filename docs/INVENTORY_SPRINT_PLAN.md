# Inventory & Stock — Sprint Plan (Research-Based)

> **Source**: [INVENTORY_STOCK_RESEARCH.md](./INVENTORY_STOCK_RESEARCH.md) — competitor analysis, user pain points, UX best practices.
> **Scope**: Web + Mobile parity where applicable.

---

## Sprint Overview

| Sprint | Focus | Web | Mobile | API |
|--------|-------|-----|--------|-----|
| **24** | Sort by quantity, swipe actions, accessibility | ✅ | ✅ | — |
| **25** | Favorites / quick-access items | ✅ | ✅ | ✅ |
| **26** | Bulk import (Excel/CSV) | ✅ | — | ✅ |
| **27** | Product list pagination (100k+) | ✅ | ✅ | ✅ |
| **28** | Category management UX | ✅ | ✅ | — |
| **29** | Tooltips, onboarding copy | ✅ | ✅ | — |
| **30** | Pre-loaded products (optional) | — | — | Future |
| **31** | Offline parity, staff roles | — | — | Future |

---

## Sprint 24 — Sort by Quantity, Swipe Actions, Accessibility

**User pain point**: Vyapar — "No sort by quantity when adding items"

### Web (Inventory.tsx)
- [x] Sort by stock already exists (Stock Qty, Value, Price)
- [ ] Ensure sort persists or is obvious

### Mobile (ItemsScreen.tsx)
- [ ] Add sort control: Name A→Z, Stock (low first), Stock (high first), Price
- [ ] Swipe row: left = Quick Add to bill, right = Adjust stock (or long-press menu)
- [ ] `accessibilityLabel` on stock badges: "Out of stock", "Low stock", "In stock"
- [ ] Haptic on +/- tap (Sprint 19 may have this — verify)

### Deliverables
- Mobile: Sort chips or dropdown (Name, Stock ↑, Stock ↓, Price)
- Mobile: Swipeable ProductCard or long-press context menu
- Both: Accessibility labels for screen readers

---

## Sprint 25 — Favorites / Quick-Access Items

**Competitor**: Swipe has "Favorites" for quick item access.

### Schema
- `Product.isFeatured` already exists — use for favorites

### API
- [ ] `PATCH /api/v1/products/:id/favorite` — toggle `isFeatured`
- [ ] `GET /api/v1/products?featured=true` — or filter in list

### Web
- [ ] Star icon on product row — toggle favorite
- [ ] "Favorites" filter chip or tab
- [ ] Billing: show favorites at top of product search

### Mobile
- [ ] Star on ProductCard — toggle favorite
- [ ] "⭐ Favorites" filter chip
- [ ] BillingScreen: favorites first in product picker

### Deliverables
- API: PATCH favorite toggle
- Web: star icon, favorites filter
- Mobile: star icon, favorites filter, billing integration

---

## Sprint 26 — Bulk Import (Excel/CSV)

**User pain point**: Vyapar — "Cumbersome and unintuitive importing"

### API
- [ ] `POST /api/v1/products/import` — multipart CSV/Excel
- [ ] Parse: name, sku, barcode, category, price, stock, unit, minStock
- [ ] Return: { imported: N, failed: M, errors: [...] }
- [ ] Async option: queue job for large files (1000+ rows)

### Web
- [ ] Inventory: "Import" button → file picker
- [ ] Upload progress, result summary (imported/failed)
- [ ] Download template CSV

### Mobile
- [ ] Defer: use web for bulk import (or share sheet → open in web)

### Deliverables
- API: CSV import endpoint
- Web: Import UI, template download
- Docs: CSV column format

---

## Sprint 27 — Product List Pagination

**User pain point**: myBillBook — "Slow product list loading"

### API
- [ ] `GET /api/v1/products?page=1&limit=50` — paginated
- [ ] Response: `{ products, total, page, limit, hasMore }`
- [ ] Keep `GET /api/v1/products` for backward compat (all products, or default limit 500)

### Web
- [ ] Infinite scroll or "Load more" on Inventory
- [ ] Or: virtualized list for 1000+ items

### Mobile
- [ ] FlatList with `onEndReached` — fetch next page
- [ ] Or: limit to 200, "Load more" button

### Deliverables
- API: paginated products endpoint
- Web: infinite scroll or pagination
- Mobile: FlatList pagination

---

## Sprint 28 — Category Management UX

**Competitor**: Swipe — assign category on create/edit, create on-the-fly.

### Web
- [ ] Product form: category dropdown + "Add new" inline
- [ ] Edit product: same
- [ ] List: filter by category (already may exist)

### Mobile
- [ ] Add product: category picker with add-new
- [ ] Edit product: same

### Deliverables
- Inline "Add category" when creating/editing product
- Category list from existing products + manual add

---

## Sprint 29 — Tooltips, Onboarding Copy

**UX best practice**: Clear labels, tooltips, first-time hints.

### Web
- [ ] Tooltip: "Min stock — alert when below this"
- [ ] Tooltip: "Reorder level"
- [ ] First-time: "Tap + to add product, tap +/- to adjust stock"

### Mobile
- [ ] Same tooltips (or info icon)
- [ ] Optional: one-time "Tap +/- to adjust stock" hint on first ItemsScreen visit

### Deliverables
- Tooltips on min stock, reorder
- Optional first-time onboarding hint

---

## Sprint 30 — Pre-Loaded Products (Future)

**Competitor**: KiranaX — 10K+ pre-loaded Indian brands.

- [ ] Curated list of common FMCG (atta, rice, oil, etc.)
- [ ] "Add from catalog" in product form
- [ ] Tenant can add to their catalog with one tap

### Defer to later sprint.

---

## Sprint 31 — Offline, Staff Roles (Future)

- **Offline**: Sprint 18 already has offline billing; extend to Items read/queue.
- **Staff roles**: Viewer vs Manager — restrict stock edit, product add.

### Defer to later sprint.

---

## Implementation Order

1. **Sprint 24** — Quick wins (sort, swipe, a11y)
2. **Sprint 25** — Favorites (high user value, schema ready)
3. **Sprint 27** — Pagination (performance, 100k+ readiness)
4. **Sprint 26** — Bulk import (power users)
5. **Sprint 28** — Category UX
6. **Sprint 29** — Tooltips, copy
