# Inventory & Stock Management — Competitor Research & User Insights

> **Purpose**: Deep research on Swipe, Vyapar, myBillBook, and related apps — features, user reviews, pain points, and UX recommendations for Execora's Items/Inventory experience.
>
> **Sources**: Play Store, App Store, Reddit, Trustpilot, LinkedIn, community forums, UX design guides.
> **Date**: March 2026

---

## 1. Competitor Feature Comparison

### Swipe (getswipe.in)

| Feature | Swipe | Notes |
|---------|-------|-------|
| **Stock tracking** | ✅ StockIn / StockOut | Live status visibility |
| **Bulk import** | ✅ Excel import | Large inventory upload |
| **Barcode** | ✅ Scan & print | Time-saver for billing |
| **Batch & expiry** | ✅ | For FMCG, pharma |
| **Serial number** | ✅ | Electronics, mobile phones |
| **Multi-location** | ✅ | Branches, warehouses |
| **Low-stock alerts** | ✅ | |
| **Integrations** | Shopify, Shiprocket | Order sync, shipping |
| **Category management** | ✅ | Assign on create/edit, bulk via CSV |
| **Item properties** | Name, SKU, price, image, tax, qty | Optional fields |
| **Favorites** | ✅ | Quick item access |
| **Reports** | StockIn/Out, item-wise sales | |

**User sentiment**: Simple, fast, good support. Concerns: Shopify limits not disclosed, feature removal mid-subscription.

---

### Vyapar (vyaparapp.in)

| Feature | Vyapar | Notes |
|---------|--------|------|
| **Items / Products** | ✅ | Add Product, bulk import |
| **Categories** | ✅ | Configurable in Settings |
| **Stock tracking** | ✅ | Opening stock, min stock alerts |
| **Batch / serial** | ✅ | Batch info, serial numbers |
| **Barcode** | ✅ | Generation & scanning |
| **Product images** | ✅ | Up to 5 images per product |
| **Bulk import** | ✅ | Utilities → Import Items (Excel) |
| **Bulk update** | ✅ | Desktop: Item Update in Bulk |
| **Low-stock alerts** | ✅ | |
| **Tally sync** | ✅ | Accounting integration |
| **e-Way, e-Invoice** | ✅ | GST compliance |

**Add Product flow** (6+ steps):
1. Items → Add Product  
2. Name, Category, Item Code, Unit  
3. Sale Price, Purchase Price  
4. Batch, serial, opening stock, min stock  
5. Location, up to 5 images  
6. Save  

**User sentiment**: 4.51/5 Play Store, 10M+ downloads. **Complaints**: No sort by quantity when adding items, barcode scanning not efficient for express billing, no batch-wise sell price, poor support, expensive, small icons, iOS has fewer features (2.3/5).

---

### myBillBook

| Feature | myBillBook | Notes |
|---------|------------|------|
| **Inventory** | ✅ | Low-stock alerts, categories |
| **GST billing** | ✅ | e-invoice, e-way |
| **Ease of use** | 4.8/5 | Strong on usability |
| **Offline** | ❌ Limited | Online-only, unstable in poor connectivity |
| **Customization** | Limited | Invoice templates, reports |
| **Data access** | ⚠️ | Data withheld after subscription expiry |

**User sentiment**: 4.6/5. **Complaints**: Slow product list loading, automatic shuffling of product/customer lists, GST errors, can't download multiple invoices, template support, software "operates automatically with minimal manual control."

---

### KiranaX, Billing Fast, Vikry (simpler alternatives)

| App | Key differentiator |
|-----|--------------------|
| **KiranaX** | Offline, 10K+ pre-loaded Indian brands, one-tap login, no typing for common items |
| **Billing Fast** | Invoice in &lt;5 sec, 50K+ businesses, Hindi/Marathi/Gujarati, 4.7/5 |
| **Vikry** | AI-powered, 4.9★, error-free billing, smart UPI tracking |
| **Stock Register** | Explicitly markets as "Vyapar alternative" — "too many unnecessary features," "complex interfaces," "steep learning curve" |

---

## 2. User Pain Points (Reviews & Forums)

### Inventory / Stock Management

| Pain point | Source | App(s) |
|------------|--------|--------|
| **Cumbersome import** | LinkedIn | Vyapar — Items section "cumbersome and unintuitive" |
| **30–35 essential features missing** | User feedback | Vyapar — across sections, inventory a major gap |
| **No sort by quantity** | Play Store | Vyapar — when adding items to invoice |
| **Barcode scanning not efficient** | Play Store | Vyapar — for express billing |
| **No batch-wise sell price** | Play Store | Vyapar |
| **Stock sync issues** | Documentation | Vyapar — common troubleshooting |
| **80% basic requirements missing** | Trustpilot | After 2 months use |
| **Slow product list loading** | Reviews | myBillBook |
| **Automatic shuffling of lists** | Reviews | myBillBook — product/customer lists without user control |
| **Too many steps to add product** | Implied | Vyapar 6-step flow |
| **Complex interfaces** | Stock Register marketing | Vyapar, others |
| **Steep learning curve** | Stock Register | General |
| **Difficult for staff** | Stock Register | General |
| **Small icons** | Play Store | Vyapar |
| **iOS fewer features** | App Store | Vyapar — 2.3/5 vs 4.5 Android |

### Kirana / Small Business Context

| Challenge | Source |
|----------|--------|
| **Stock management** | Balancing supply/demand, avoiding over/understock |
| **Expiry tracking** | Perishables, limited shelf life |
| **Product assortment** | Right mix by location, demographics, storage |
| **Manual billing errors** | Pen-and-paper vs POS |
| **Sales tracking** | Daily revenue visibility |
| **Setup time** | "Took some time to set up everything" (electronics shop) |

### What Users Want

- **Offline** — Works without internet  
- **Quick billing** — Barcode scan, invoice in seconds  
- **Low-stock alerts** — Visible at a glance  
- **Customer credit (udhaar)** — Track dues, WhatsApp reminders  
- **Hindi/regional** — Simple navigation  
- **GST compliance** — Automatic tax, e-invoice  
- **Pre-loaded products** — Less typing (KiranaX)  
- **One-tap stock adjust** — No drill-in (Execora differentiator) |
| **Minimal steps** | Add product in &lt;3 steps |
| **No automatic shuffling** | User controls sort/order |
| **Fast list loading** | Pagination, lazy load |
| **Clear visual hierarchy** | Stock status, alerts obvious |
| **Staff-friendly** | Easy for non-tech workers |

---

## 3. Mobile UI/UX Best Practices (Inventory Apps)

### Design Principles (UXPin, industry)

1. **Usability** — Navigate without manual; quick access to scan, stock update  
2. **Efficiency** — Quick data entry, easy search, clear visual cues  
3. **Visual hierarchy** — Clean layout, consistent colors, spacing  
4. **Accessibility** — Font size, contrast, screen reader  
5. **Responsive** — Works on phone, tablet  
6. **Minimize steps** — Reduce cognitive load, maximize task efficiency  
7. **Gestures** — Swipe, long-press for common actions  
8. **Clear labels** — Tooltips, error messages  
9. **Logical navigation** — Consistent patterns (menu, tabs)  

### Essential Features (UX research)

- Barcode scanning (camera or external)  
- Real-time inventory tracking  
- Low-stock notifications  
- Quick search  
- Order/reorder management  
- Reporting & analytics  
- User permissions  
- Offline capability  

### Kirana-Specific UX

- **Large touch targets** — 44pt minimum (Execora already uses)  
- **Category icons** — Visual recognition (Execora uses emoji)  
- **Inline stock adjust** — +/- without leaving list (Execora has this)  
- **Filter chips** — All / Low / Out (Execora has this)  
- **Search** — Instant filter  
- **Pre-loaded brands** — Reduce typing  
- **Voice input** — "Bolo aur becho" (Execora differentiator)  

---

## 4. Recommendations for Execora Items/Inventory

### Already Strong

- One-tap +/- stock adjustment inline  
- Color-coded stock badges (Out/Low/In Stock/Dead)  
- Low-stock alert banner  
- Barcode scan  
- OCR import from photo  
- Voice search  
- Filter chips (All, Low, Out, Dead)  
- Product images (recently added)  

### Gaps to Address (from research)

| Gap | Recommendation |
|-----|----------------|
| **Sort by quantity** | Add "Sort by stock" (Vyapar complaint) |
| **Batch/expiry** | Already have expiry batches; ensure mobile parity |
| **Bulk import** | Excel/CSV import for large catalogs |
| **Pre-loaded products** | Optional: common Indian FMCG SKUs |
| **List performance** | Pagination for 100k+ items (already documented) |
| **No automatic shuffling** | Keep user-controlled sort; don't auto-reorder |
| **Category management** | Easy add/edit category on product |
| **Favorites** | Quick-access list for frequently sold items |
| **Offline** | Consider offline-first for mobile |
| **Staff roles** | Role-based access (viewer vs manager) |

### Mobile UI/UX Improvements

1. **Larger product images** — Thumbnails in list (already added)  
2. **Swipe actions** — Swipe row for Quick Add/Edit (common pattern)  
3. **Pull-to-refresh** — Already present  
4. **Empty states** — Clear CTA ("Add first product")  
5. **Loading states** — Skeleton or spinner  
6. **Error recovery** — Retry, offline queue  
7. **Search prominence** — Always visible in header  
8. **Bottom sheet for adjust** — Already using modal; consider bottom sheet on mobile  
9. **Haptic feedback** — On +/- tap  
10. **Accessibility** — Label stock status for screen readers  

### Copy & Onboarding

- Use simple Hindi/Hinglish where appropriate  
- "Items" not "Inventory" or "Stock" (already done)  
- Tooltips for min stock, reorder level  
- First-time: "Tap + to add, tap +/- to adjust stock"  

---

## 5. Summary: User-Friendly Inventory Checklist

| Principle | Execora Status |
|-----------|----------------|
| Add product in &lt;5 steps | ✅ Draft flow, optional fields |
| One-tap stock adjust | ✅ Inline +/- |
| Low-stock visible at glance | ✅ Banner, filter, badges |
| Barcode scan | ✅ |
| Search products | ✅ |
| Filter by stock status | ✅ All/Low/Out/Dead |
| Product images | ✅ |
| No automatic list shuffling | ✅ User-controlled sort |
| Fast list load | ⚠️ Paginate for 100k+ |
| Offline | ❌ Future |
| Voice input | ✅ |
| Regional language | ⚠️ Partial |
| Batch/expiry | ✅ Web; mobile parity? |
| Bulk import | ❌ Future |
| Favorites | ❌ Future |

---

## 6. References

- Swipe: getswipe.in, community.getswipe.in, Play Store  
- Vyapar: vyaparapp.in, Play Store, Trustpilot, LinkedIn  
- myBillBook: TechJockey, HostingCharges, App Store  
- KiranaX, Billing Fast, Vikry, Stock Register: marketing sites, Play Store  
- UXPin: uxpin.com/studio/blog/inventory-app-design  
- Kirana challenges: kiranafriends.com, getswipe.in/blog  
- Square, Actual, Quicken: community forums (performance parallels)  
