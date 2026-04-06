# Odoo Architecture Research — Applied to Execora

> Source: https://github.com/odoo/odoo (branch 17.0)
> Research date: April 2026
> Purpose: Extract structural patterns from Odoo and map them to Execora's TypeScript/Fastify monorepo

---

## 1. Odoo's Top-Level Layout

```
odoo/
├── addons/              ← ~300 business modules (each is a domain)
│   ├── account/         ← Accounting + Invoicing
│   ├── sale/            ← Sales Orders + Quotations
│   ├── purchase/        ← Purchase Orders
│   ├── stock/           ← Inventory / Warehouse
│   ├── crm/             ← CRM / Contacts
│   ├── hr/              ← HR / Employees
│   ├── product/         ← Products / Catalog
│   ├── payment/         ← Payment Providers
│   ├── l10n_in/         ← India localization (GST, e-Invoice)
│   └── ...
├── odoo/
│   ├── addons/          ← Core framework modules (base, web, bus)
│   └── ...              ← Framework kernel (ORM, HTTP, registry)
└── setup/
```

**Key insight**: Odoo has NO single "services" folder, NO god-class, NO barrel index.
Every business domain is its own self-contained folder ("module/addon").

---

## 2. Internal Structure of ONE Odoo Module

Using `addons/account/` as reference:

```
account/
├── __manifest__.py      ← declares dependencies on other modules
├── __init__.py          ← Python package entry (just imports)
│
├── models/              ← DATA LAYER — one file per entity
│   ├── account_move.py          → Invoice / Journal Entry
│   ├── account_move_line.py     → Invoice Line
│   ├── account_payment.py       → Payment
│   ├── account_journal.py       → Journal / Ledger
│   ├── account_tax.py           → Tax rules
│   ├── partner.py               → extends res.partner with accounting fields
│   ├── product.py               → extends product.template with account fields
│   └── __init__.py
│
├── controllers/         ← HTTP LAYER — one file per route group
│   ├── portal.py                → customer-facing portal routes
│   └── __init__.py
│
├── views/               ← UI layer (XML form/list/kanban views)
│   ├── account_move_views.xml
│   └── ...
│
├── data/                ← seed data (CSV/XML fixtures)
├── security/            ← access control rules (ir.model.access.csv)
├── tests/               ← tests co-located with the module
│   ├── test_account_move.py
│   └── ...
├── wizard/              ← multi-step dialog logic (like create-credit-note wizard)
├── report/              ← PDF report templates
└── static/              ← frontend JS/CSS for this module only
```

Using `addons/sale/` — same pattern, different entity files:

```
sale/
├── models/
│   ├── sale_order.py            → Order entity + business logic
│   ├── sale_order_line.py       → Order Line
│   ├── account_move.py          → extends Invoice for sale-origin
│   ├── product_template.py      → extends Product for sale fields
│   └── res_partner.py           → extends Customer for sale fields
├── controllers/
│   ├── portal.py
│   └── main.py
└── tests/
```

---

## 3. Key Patterns Odoo Uses

### 3.1 — One file per entity in `models/`

Each file contains ONE class (model). The file is named after the database table:

- `account_move.py` → table `account.move`
- `sale_order.py` → table `sale.order`
- `res_partner.py` → table `res.partner`

**NO** god-service files like `InvoiceService` that handle 20 operations in 600 lines.

### 3.2 — Business logic lives on the model (record methods)

```python
# account_move.py
class AccountMove(models.Model):
    _name = 'account.move'

    def action_post(self):          ← "confirm invoice" logic ON the entity
        ...
    def _get_reconciled_info(self): ← query logic ON the entity
        ...
    def _reverse_moves(self):       ← credit note logic ON the entity
        ...
```

Odoo does NOT have a separate `InvoiceService` class that gets injected.
The model IS the service.

### 3.3 — Controllers are thin (like Fastify routes should be)

```python
# controllers/portal.py
class PortalAccount(CustomerPortal):
    @route(['/my/invoices'], auth='user')
    def portal_my_invoices(self, **kw):
        invoices = request.env['account.move'].search([...])  # direct ORM call
        return request.render('account.portal_my_invoices', {'invoices': invoices})
```

Controllers call the ORM (Prisma equivalent) directly — no intermediate service layer.

### 3.4 — Cross-module dependencies are explicit

```python
# __manifest__.py for account
{
    'depends': ['base', 'product', 'analytic', 'mail'],
}
```

Modules can only import from modules they declare as dependencies.
No circular imports. No god-barrel that exports everything.

### 3.5 — Tests are co-located inside the module

```
account/tests/test_account_move.py
sale/tests/test_sale_order.py
```

NOT in a top-level `__tests__/` folder.

---

## 4. Mapping Odoo → Execora (TypeScript / Fastify)

| Odoo concept                    | Execora equivalent                      | Current state                     | Target state                      |
| ------------------------------- | --------------------------------------- | --------------------------------- | --------------------------------- |
| `addons/account/`               | `packages/finance/`                     | mixed into `packages/modules/`    | split into domain packages        |
| `addons/sale/`                  | `packages/sales/`                       | mixed into `packages/modules/`    | split into domain packages        |
| `addons/crm/`                   | `packages/crm/`                         | mixed into `packages/modules/`    | split into domain packages        |
| `addons/stock/`                 | `packages/inventory/`                   | mixed into `packages/modules/`    | split into domain packages        |
| `models/account_move.py`        | `src/invoice.ts` (flat functions)       | `invoice.service.ts` (god class)  | one file per entity               |
| `models/account_payment.py`     | `src/payment.ts` (flat functions)       | `ledger.service.ts` (god class)   | ✅ done for ledger                |
| `models/res_partner.py`         | `src/customer.ts` (flat functions)      | `customer.service.ts` (god class) | pending                           |
| `controllers/portal.py`         | `packages/api/src/routes/invoice.routes.ts` | imports `invoiceService` class    | should call functions directly    |
| `tests/test_account_move.py`    | `src/__tests__/invoice.test.ts`         | top-level `__tests__/` ✅         | move inside domain module         |
| `__manifest__.py` declares deps | `package.json` `dependencies`           | single monolithic package         | split packages with explicit deps |
| `security/` access rules        | `middleware/require-auth.ts`            | ✅ exists                         | keep as-is                        |

---

## 5. Proposed Execora Target Structure (Odoo-inspired)

```
packages/
├── infrastructure/        ← KEEP (Prisma, Redis, logger, auth, queue)
├── types/                 ← KEEP (shared TS types)
│
├── crm/                   ← NEW (Odoo: addons/crm + addons/contacts)
│   ├── src/
│   │   ├── customer.ts    ← flat fns: createCustomer, updateCustomer, getCustomer...
│   │   ├── supplier.ts    ← flat fns: createSupplier, listSuppliers...
│   │   └── types.ts
│   ├── src/__tests__/
│   │   └── customer.test.ts
│   └── package.json
│
├── sales/                 ← NEW (Odoo: addons/sale + addons/account invoice side)
│   ├── src/
│   │   ├── invoice.ts     ← flat fns: createInvoice, confirmInvoice, cancelInvoice...
│   │   ├── credit-note.ts ← flat fns: createCreditNote...
│   │   ├── draft.ts       ← flat fns: saveDraft, loadDraft...
│   │   └── types.ts
│   ├── src/__tests__/
│   └── package.json
│
├── finance/               ← NEW (Odoo: addons/account payment side)
│   ├── src/
│   │   ├── ledger.ts      ← ✅ DONE (7 flat fns)
│   │   ├── expense.ts     ← flat fns: createExpense, approveExpense...
│   │   └── types.ts
│   ├── src/__tests__/
│   └── package.json
│
├── inventory/             ← NEW (Odoo: addons/stock + addons/product)
│   ├── src/
│   │   ├── product.ts     ← flat fns: createProduct, updateProduct...
│   │   ├── stock.ts       ← flat fns: adjustStock, getStockLevel...
│   │   └── types.ts
│   ├── src/__tests__/
│   └── package.json
│
├── purchases/             ← NEW (Odoo: addons/purchase)
│   ├── src/
│   │   ├── purchase-order.ts
│   │   ├── supplier.ts
│   │   └── types.ts
│   └── package.json
│
└── voice/                 ← KEEP AS-IS (no Odoo equivalent, stateful AI engine)
    ← class-based is correct here (conversation state, session management)
```

---

## 6. File-Level Pattern (Odoo → Execora translation)

### Odoo `models/account_move.py`:

```python
class AccountMove(models.Model):
    _name = 'account.move'

    def action_post(self):
        for move in self:
            move.write({'state': 'posted'})

    def _reverse_moves(self, default_values_list):
        ...
```

### Execora equivalent `packages/sales/src/invoice.ts`:

```typescript
import { prisma } from '@execora/infrastructure';
import type { Prisma } from '@prisma/client';

// One function per operation — like one method per model method in Odoo
export async function createInvoice(input: CreateInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    // all logic here, direct Prisma
  });
}

export async function confirmInvoice(invoiceId: string) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'pending' }
  });
}

export async function reverseInvoice(invoiceId: string) {
  // credit note logic
}

export async function cancelInvoice(invoiceId: string) { ... }
export async function getInvoice(invoiceId: string) { ... }
export async function listInvoices(businessId: string, filters: InvoiceFilters) { ... }
```

### Execora `packages/api/src/routes/invoice.routes.ts` (controller = Odoo's controller):

```typescript
import { createInvoice, confirmInvoice, cancelInvoice } from "@execora/sales";

// Thin route — no service class, direct function call
fastify.post("/invoices", async (req, reply) => {
  const invoice = await createInvoice(req.body);
  return reply.send(invoice);
});
```

---

## 7. What Odoo Does NOT Have (and Execora Shouldn't Either)

| Anti-pattern                                            | Why Odoo avoids it                                      | Execora action                                       |
| ------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `InvoiceService` god class                              | Model IS the service                                    | Remove service classes from barrel                   |
| Central `index.py` that exports everything              | Each module is independently imported                   | Remove `export *` barrel lines ✅ (ledger done)      |
| Service container / DI                                  | Plain class instantiation in Odoo; Fastify uses plugins | Keep using module-level singletons only where needed |
| Triple-layer indirection (route → service → model → DB) | Controllers call ORM directly                           | Routes should call flat fns directly → Prisma        |
| Cross-module circular imports                           | `__manifest__.py` enforces one-way deps                 | `no-restricted-imports` ESLint rule ✅               |

---

## 8. Odoo's `l10n_in` Module — Perfect Analogy for Execora's GST

Odoo has a dedicated `addons/l10n_in/` module for Indian localization:

```
l10n_in/
├── models/
│   ├── account_tax.py         → GST tax computation
│   ├── account_move.py        → extends Invoice with GST fields (GSTIN, HSN, etc.)
│   └── res_company.py         → GST registration on company
├── data/
│   ├── account_tax_template_gst.xml   → GST rate templates
│   └── ...
└── report/
    └── gst_invoice_report.xml  → Tax invoice PDF template
```

**Execora analogy**: Our `gst.service.ts` and `gstr1.service.ts` should become:

```
packages/finance/src/
├── gst.ts          ← flat fns: computeGST, validateGSTIN, getHSNRate...
├── gstr1.ts        ← flat fns: generateGSTR1, computeGSTR1Summary...
└── types.ts
```

---

## 9. Concrete Migration Plan (Odoo as North Star)

### Phase 1 — Already done ✅

- Ledger: `finance/payments/ledger.ts` has 7 flat functions, class removed from barrel

### Phase 2 — Easy (no logic changes, just structure)

- `inventory/stock/item-catalog.ts` → merge into `inventory/stock/product.ts`
  - Replace delegation to `productService` with direct Prisma calls
  - Remove `export * from "./modules/product/product.service"` from barrel

### Phase 3 — Medium

- `sales/invoicing/create-invoice.ts` → expand with all operations (confirm, cancel, list, get)
- `finance/expenses/expense.ts` → expand (already partially direct)
- `purchases/purchase/purchase-order.ts` → expand

### Phase 4 — Complex

- `sales/invoicing/invoice.ts` → full rewrite of `invoice.service.ts` (~600 lines) as flat fns
  - This handles: PDF, email, WhatsApp, GST, counters, stock deduction
  - Break into: `invoice.ts`, `invoice-pdf.ts`, `invoice-notifications.ts`
- `crm/parties/customer.ts` → full rewrite of `customer.service.ts` (~400 lines) as flat fns
  - This handles: fuzzy matching, voice context, profile building

### Phase 5 — Long-term (optional)

- Split `packages/modules/` into:
  - `packages/crm/`
  - `packages/sales/`
  - `packages/finance/`
  - `packages/inventory/`
  - `packages/purchases/`
- Each gets its own `package.json` with explicit deps
- Turborepo builds them in dependency order

### Never change

- `packages/modules/src/modules/voice/` — keep class-based (stateful engine, justified)
- `packages/modules/src/modules/ai/` — keep class-based (LLM client wrapper)
- `packages/modules/src/modules/monitoring/` — keep class-based

---

## 11. How Odoo Keeps Each Addon Small — Deep Research (April 2026)

This section is based on directly reading the `addons/` tree and manifest files from Odoo 17.0.

### 11.1 — The two-layer addon system

```
odoo/
├── odoo/addons/         ← CORE: base, test_* (framework kernel — do not touch)
└── addons/              ← BUSINESS: 300+ addons, one per capability
```

`odoo/addons/base` is the ORM, HTTP server, res.partner — the absolute minimum.
Everything else is an opt-in addon.

---

### 11.2 — Addon count breakdown (17.0 addons/ folder)

Largest category groups visible at a glance:

| Prefix          | Count (approx) | Purpose                                                                |
| --------------- | -------------- | ---------------------------------------------------------------------- |
| `l10n_*`        | ~90            | Country localizations (one per country or compliance area)             |
| `website_*`     | ~40            | eCommerce / portal surface                                             |
| `sale_*`        | ~15            | Extensions of core `sale` addon                                        |
| `account_*`     | ~15            | Extensions of core `account` addon                                     |
| `pos_*`         | ~20            | Extensions of core `point_of_sale`                                     |
| `hr_*`          | ~18            | HR sub-features                                                        |
| `mrp_*`         | ~8             | Manufacturing sub-features                                             |
| `payment_*`     | ~15            | Payment provider adapters                                              |
| `spreadsheet_*` | ~12            | Dashboard and spreadsheet extensions                                   |
| Core domains    | ~30            | `account`, `sale`, `stock`, `purchase`, `crm`, `product`, `mail`, etc. |

**Total: ~300 addons in `addons/` alone.**

Key insight: **even a large domain like `account` is ONE addon with ~10 model files.** All 300 other addons are extensions or bridges — they are not copies of account logic.

---

### 11.3 — Three sizes of addon (with real examples)

#### Size 1 — Micro bridge addon (2-3 files total)

**`sale_sms`** — bridges `sale` + `sms` capabilities:

```
sale_sms/
├── security/          ← 2 files (access rules for SMS templates in sale context)
├── __init__.py
└── __manifest__.py
```

`__manifest__.py`:

```python
{
    'name': "Sale - SMS",
    'depends': ['sale', 'sms'],          # exactly 2 deps
    'data': ['security/ir.model.access.csv', 'security/security.xml'],
    'auto_install': True,                # auto-installs when both sale + sms are installed
}
```

**`account_lock`** — adds accounting period locking:

```
account_lock/
├── models/            ← 1 file (adds lock_date field to res.company)
├── i18n/
├── __init__.py
└── __manifest__.py
```

**All bridge/glue addons use `auto_install: True`** — they exist purely to connect two capabilities without polluting either core addon.

---

#### Size 2 — Small feature addon (5-8 files total)

**`account_debit_note`** — adds debit note functionality to accounting:

```
account_debit_note/
├── models/
│   ├── __init__.py
│   └── account_move.py       ← ONE model file: extends AccountMove with debit note fields
├── wizard/
│   └── account_debit_note_view.xml
├── views/
│   └── account_move_view.xml
├── security/
│   └── ir.model.access.csv
├── i18n/
├── tests/
├── __init__.py
└── __manifest__.py
```

`__manifest__.py`:

```python
{
    'name': 'Debit Notes',
    'depends': ['account'],              # only ONE dep
    'data': [
        'wizard/account_debit_note_view.xml',
        'views/account_move_view.xml',
        'security/ir.model.access.csv',
    ],
}
```

**The `models/` folder has exactly ONE Python file.** Debit notes are one concern — they extend `account_move` only. Nothing else.

---

#### Size 3 — Compliance/localization addon (4 model files)

**`l10n_in_edi`** — entire Indian e-invoicing (IRP/IRN/GSTIN compliance):

```
l10n_in_edi/
├── models/
│   ├── __init__.py
│   ├── account_edi_format.py   ← IRP API call + payload building + IRN response handling
│   ├── account_move.py         ← extends Invoice with IRN, QR code, e-invoice status
│   ├── res_company.py          ← adds GSTIN + IRP credentials to company settings
│   └── res_config_settings.py  ← settings page fields for IRP credentials
├── data/
├── views/
├── tests/
├── demo/
├── i18n/
├── __init__.py
└── __manifest__.py
```

`__manifest__.py`:

```python
{
    'name': "Indian - E-invoicing",
    'depends': ['account_edi', 'l10n_in', 'iap'],   # 3 explicit deps
    'countries': ['in'],                             # India-only
    'data': [
        'data/account_edi_data.xml',
        'views/res_config_settings_views.xml',
        'views/edi_pdf_report.xml',
        'views/account_move_views.xml',
    ],
}
```

**4 model files handles the ENTIRE Indian e-invoicing compliance system.** Each file has exactly one responsibility.

---

### 11.4 — The naming convention reveals the splitting rule

Odoo's naming pattern is: **`<base-domain>_<specific-feature>`**

```
crm                   ← core CRM
crm_iap_enrich        ← CRM + IAP enrichment (auto-qualify leads)
crm_livechat          ← CRM + LiveChat integration
crm_mail_plugin       ← CRM + email plugin
crm_sms               ← CRM + SMS

sale                  ← core Sales Orders
sale_crm              ← Sales + CRM (link orders to leads)
sale_sms              ← Sales + SMS
sale_stock            ← Sales + Inventory (delivery orders from sale)
sale_mrp              ← Sales + Manufacturing

account               ← core Accounting
account_debit_note    ← account + debit notes
account_lock          ← account + period locking
account_audit_trail   ← account + audit trail
account_payment       ← account + payment flows
account_check_printing ← account + printed checks

l10n_in               ← India base (GST chart of accounts)
l10n_in_edi           ← India + e-invoice (IRP/IRN)
l10n_in_edi_ewaybill  ← India + e-way bill (separate from e-invoice!)
l10n_in_pos           ← India + POS
l10n_in_purchase      ← India + purchase localization
l10n_in_sale          ← India + sale localization

point_of_sale         ← core POS
pos_adyen             ← POS + Adyen terminal
pos_razorpay          ← POS + Razorpay terminal
pos_restaurant        ← POS + Restaurant features (tables, KOT)
pos_loyalty           ← POS + Loyalty programs

payment               ← base payment provider API
payment_razorpay      ← Razorpay provider
payment_stripe        ← Stripe provider
payment_paypal        ← PayPal provider
payment_cashfree      ← (Cashfree would follow this pattern)
```

**The rule**: when a feature crosses two domains, create a new addon `domainA_domainB`. Never put cross-domain code inside either core addon.

---

### 11.5 — What makes an addon "done" (minimal viable addon)

The absolute minimum for a valid Odoo addon:

```
my_addon/
├── __manifest__.py    ← REQUIRED: name, depends, data
└── __init__.py        ← REQUIRED: empty or imports models
```

That's it. `sale_sms` is essentially just these two files plus a `security/` folder. This proves a valid addon can be:

- **2-3 total files**
- **0 model files** (pure configuration addon)
- **0 controller files** (no new HTTP routes)
- **exactly 1 purpose**

---

### 11.6 — Template: Execora TypeScript equivalent of one Odoo addon

Odoo `addons/account_debit_note/` (debit notes, depends: `['account']`):

```python
# account_debit_note/models/account_move.py — 1 file, 1 concern
class AccountMove(models.Model):
    _inherit = 'account.move'
    debit_origin_id = fields.Many2one(...)
    def _reverse_moves(self): ...
```

Execora TypeScript equivalent (credit-note extension within `packages/sales`):

```typescript
// packages/sales/src/credit-note.ts — 1 file, 1 concern
import { prisma } from '@execora/infrastructure';

export async function createCreditNote(invoiceId: string, reason: string) { ... }
export async function listCreditNotes(businessId: string) { ... }
export async function cancelCreditNote(creditNoteId: string) { ... }
```

There is NO `CreditNoteService` class. There is NO injection. There is no barrel re-export. **One file, flat functions, exactly one domain concern.**

---

### 11.7 — Bridge addon pattern in TypeScript (Execora)

Odoo's `auto_install` bridge addons have a TypeScript equivalent in Execora: a thin adapter file in the `integrations` domain.

Odoo `sale_sms` (bridges sale + sms, `auto_install: True`):

```python
# adds SMS template access for sale context — no model logic
```

Execora equivalent: `packages/integrations/src/whatsapp.ts`

```typescript
// bridges sales domain events → WhatsApp API
// no business logic — pure adapter
export async function sendInvoiceWhatsApp(invoiceId: string, phone: string) {
  const invoice = await getInvoice(invoiceId); // from @execora/sales
  return gupshupClient.sendTemplate("invoice_share", phone, { invoice });
}
```

**Rule**: if a file imports from two different domain packages (`@execora/sales` + `@execora/integrations`), it belongs in `@execora/integrations` — not in either domain.

---

### 11.8 — Summary: The 6 rules Odoo uses to keep addons small

| Rule                       | Odoo mechanism                                    | Execora equivalent                                           |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| **1. Single purpose**      | One addon = one business capability               | One `.ts` file = one entity or one concern                   |
| **2. Explicit deps**       | `__manifest__.py` `depends` list                  | `package.json` `dependencies` in each domain package         |
| **3. Bridge addon**        | `auto_install: True` addon for cross-domain       | `integrations/` domain owns all bridges                      |
| **4. One file per entity** | `models/account_move.py`, `models/sale_order.py`  | `invoice.ts`, `purchase-order.ts`, `customer.ts`             |
| **5. No god-barrel**       | No central `__init__.py` re-exporting 300 classes | No `export *` from `packages/modules/src/index.ts`           |
| **6. Co-located tests**    | `account/tests/`, `sale/tests/`                   | `packages/sales/src/__tests__/` (not top-level `__tests__/`) |

---

## 10. Key Takeaways

1. **Odoo's god is the entity file** — all logic for "invoice" lives in `account_move.py`. Execora's equivalent is a single `invoice.ts` with flat functions named after the operations.

2. **Controllers (routes) are dumb** — they call model methods / flat functions and return results. No business logic in routes.

3. **No service layer** — Odoo has no `InvoiceService`. We should have no `InvoiceService`. Routes → flat functions → Prisma.

4. **Co-located tests** — `account/tests/` not a top-level `__tests__/`. Consider moving tests inside each domain folder eventually.

5. **Explicit dependencies** — `__manifest__.py` is Odoo's `package.json`. When we split into `@execora/sales`, `@execora/crm` etc., their `package.json` must list what they depend on.

6. **No barrel exports** — Odoo never has an `__init__.py` that re-exports 300 classes. Turborepo docs also say avoid barrels. Our `packages/modules/src/index.ts` is the anti-pattern we're eliminating.
