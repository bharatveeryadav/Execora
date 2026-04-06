> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Settings — Complete Feature List

## Overview

Execora has two settings surfaces:

| Page | Route | Purpose |
|------|-------|---------|
| **Billing Settings** | `/settings/billing` | Classic Billing–specific: GST, legal, bank, invoice options. Shown when user taps Settings from Classic Billing. |
| **Full Settings** | `/settings` | All app settings: profile, team, payment gateways, AI, notifications, etc. |

---

## Billing Settings (`/settings/billing`)

**Only billing-related features.** Quick access from Classic Billing.

| Section | Fields / Options |
|---------|------------------|
| **Business Profile (GST & Legal)** | GSTIN, Legal Name, Phone, Address, City, State, PIN, UPI ID |
| **Bank Account Details** | Account Holder, Bank Name, Account Number, IFSC |
| **Invoice Options** | Round off total, GST Composition Scheme, Terms & Conditions |
| **Invoice Auto-Delivery** | Auto-send via Email, Auto-send via WhatsApp |
| **Invoice Template** | 4 templates: Classic, Modern, Minimal, Professional |

---

## Full Settings (`/settings`)

**Complete list of all features.**

### Business & Profile
- Your Name, Role, Email, Tenant ID
- **GST & Legal**: GSTIN, Legal Name, Phone, Address, City, State, PIN, UPI ID
- **Bank Account Details**: Holder, Bank Name, Account No, IFSC

### Invoice
- **Invoice Options**: Round off, Composition Scheme, Terms & Conditions
- **Invoice Template**: 4 templates
- **Invoice Auto-Delivery**: Email, WhatsApp toggles
- **Invoice Settings**: Prefix, Next number, Default payment terms, Default tax rate, Footer

### Payment Gateways & Sound Box
- **UPI Auto-Detect (Sound Box)**: Razorpay webhook
- **Razorpay** webhook secret
- **PhonePe** webhook secret
- **Cashfree** webhook secret
- **PayU** webhook secret
- **Paytm** merchant key
- **Instamojo** salt
- **Stripe** webhook secret
- **Easebuzz** salt
- **BharatPe** webhook secret

### Preferences
- Language
- Theme (handled elsewhere)
- AI / Voice features toggle

### Notifications
- WhatsApp, Email, SMS, Due payments, Low stock, Daily summary, New customer

### Team
- **Users & Permissions**: Add/remove team members, roles

### Data
- **Data & Backup**: Export, import

---

## Navigation

- **From Classic Billing**: Settings icon → `/settings/billing`
- **From Billing Settings**: "Full Settings" button → `/settings`
- **From Full Settings**: Back → home (or previous)
