# Domain: Integrations

> Odoo equivalent: `addons/payment_*` + `addons/mail` + `addons/hw_*` + `addons/website_sale`
>
> Owner squad: App Composition Squad
>
> Status: WhatsApp OTP active — payment gateways, hardware, and ecommerce pending

---

## Mission

Own all external integration adapters: payment gateways, WhatsApp, SMS, hardware peripherals, ecommerce channels, and third-party compliance services (TaxOne). Integrations domain is the boundary layer — it translates between Execora domain events and external APIs without owning business logic.

---

## Products Enabled By This Domain

| Product             | Domains consumed                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------ |
| POS Software        | `integrations.payment` (card/UPI terminal), `integrations.hardware` (printer, cash drawer) |
| Invoicing Software  | `integrations.whatsapp` (send invoice PDF), `integrations.payment` (payment links)         |
| Billing Software    | `integrations.sms` (OTP), `integrations.whatsapp`                                          |
| Compliance Software | `integrations.taxone` (GSP adapter for e-invoicing)                                        |
| Pro+ plans          | `integrations.ecommerce` (online store)                                                    |

---

## Sub-modules

```
integrations/
  payment/
    razorpay/            ← payment link generation, webhook, refund
    cashfree/            ← payment link + UPI collection + settlements
    paytm/               ← Paytm PG + Paytm EDC terminal
    stripe/              ← international payments (Scale+)

  whatsapp/
    twilio/              ← WhatsApp Business via Twilio API
    gupshup/             ← WhatsApp via Gupshup (India-preferred)
    message-templates/   ← HSM template registry (invoice, reminder, OTP, payment link)

  sms/
    twilio/              ← SMS via Twilio
    msg91/               ← SMS via MSG91 (India)
    fast2sms/            ← SMS via Fast2SMS (India, OTP)

  hardware/
    printer/             ← thermal receipt printer (ESC/POS, 58mm, 80mm)
    barcode-scanner/     ← USB/Bluetooth barcode scanner input
    weighing-scale/      ← serial/USB weighing scale (auto-fill qty)
    edc-machine/         ← EDC/POS terminal (Razorpay, Pine Labs, Worldline)
    cash-drawer/         ← cash drawer trigger (ESC/POS pin 2/5)

  ecommerce/
    online-store/        ← product catalogue → storefront (Pro+)
    order-sync/          ← ecommerce order → Execora invoice
    delivery-tracking/   ← link delivery provider to order

  taxone/
    irp-adapter/         ← TaxOne GSP bridge for IRP submissions
    ewb-adapter/         ← TaxOne e-way bill bridge
```

---

## Capabilities

### Payment gateways

- generate payment link (Razorpay, Cashfree) and embed in invoice WhatsApp message
- webhook: payment confirmed → fire `PaymentConfirmedExternal` → finance records payment
- refund initiation from Execora UI
- EDC terminal integration: show payment on terminal, poll for confirmation

### WhatsApp

- send invoice PDF via WhatsApp (after `InvoiceCreated`)
- payment reminders via WhatsApp HSM template
- OTP for login via WhatsApp (alternative to email OTP)
- message delivery status tracking (sent / delivered / read)

### SMS

- OTP for login / transaction confirmation
- payment reminder SMS (fallback when WhatsApp not opted in)

### Hardware (local network / USB)

- thermal printer: print receipt on POS sale, print invoice on confirm
- barcode scanner: listen for scan events → lookup product
- weighing scale: serial read → auto-fill item qty in POS
- EDC/POS terminal: initiate card payment, wait for approval
- cash drawer: trigger open on Cash payment in POS

### E-Commerce (Pro+)

- sync product catalogue to hosted online store
- receive online orders → auto-create invoice in Execora
- delivery partner tracking link embedded in confirmation

### TaxOne (Enterprise)

- GSP proxy for IRP e-invoice submissions (compliance.einvoicing uses this as transport)
- e-way bill generation via TaxOne

---

## Events Produced

| Event                      | Trigger                          | Consumers                         |
| -------------------------- | -------------------------------- | --------------------------------- |
| `PaymentConfirmedExternal` | payment gateway webhook received | finance.payments (record payment) |
| `WhatsAppDelivered`        | message delivery callback        | crm.communication.history         |
| `OnlineOrderReceived`      | ecommerce order webhook          | sales.invoicing (create invoice)  |
| `HardwareScanEvent`        | barcode scan received            | sales.pos (product lookup)        |

## Events Consumed

| Event               | From                  | Action                                     |
| ------------------- | --------------------- | ------------------------------------------ |
| `InvoiceCreated`    | sales.invoicing       | send invoice WhatsApp if customer opted in |
| `ReminderScheduled` | crm.reminders         | send reminder via WhatsApp or SMS          |
| `PosSessionClosed`  | sales.pos             | open cash drawer if cash session           |
| `EInvoiceRequested` | compliance.einvoicing | submit to IRP via TaxOne if configured     |

---

## API Contracts

```
POST   /api/v1/integrations/payment/link/:invoiceId     createPaymentLink
POST   /api/v1/integrations/payment/webhook/:provider   processWebhook (x-webhook-secret)
POST   /api/v1/integrations/payment/refund/:paymentId   initiateRefund
POST   /api/v1/integrations/whatsapp/send               sendWhatsApp (templateId, partyId)
GET    /api/v1/integrations/whatsapp/status/:messageId  getMessageStatus
POST   /api/v1/integrations/sms/send                    sendSMS
GET    /api/v1/integrations/hardware/printers           listConnectedPrinters
POST   /api/v1/integrations/hardware/print              printDocument (invoiceId, printerId)
GET    /api/v1/integrations/ecommerce/orders            listPendingOrders
POST   /api/v1/integrations/ecommerce/sync              syncProductCatalogue

# Admin config
PATCH  /api/v1/settings/integrations/payment            configurePaymentGateway
PATCH  /api/v1/settings/integrations/whatsapp           configureWhatsApp
```

---

## Backend Package (target)

```
packages/integrations/src/                (or packages/modules/src/integrations/)
├── payment.ts          ← createPaymentLink, processWebhook, initiateRefund
├── whatsapp.ts         ← sendInvoice, sendReminder, sendOTP, getStatus
├── sms.ts              ← sendOTP, sendReminder
├── taxone.ts           ← submitToIRP, generateEWayBill (GSP proxy)
├── ecommerce.ts        ← syncCatalogue, processIncomingOrder
└── types.ts
```

Hardware adapters are in `apps/api/src/hardware/` (device-local, not modules).

---

## Security Notes

- payment gateway webhooks must validate HMAC signature before processing — unauthenticated webhook requests must be rejected
- WhatsApp OTP messages must use HSM templates only (Meta policy) — no free-form text for OTP
- TaxOne API credentials stored in environment variables / Secret Manager — never in DB or source
- online store order webhook IPs should be allowlisted (Shopify/WooCommerce ranges)
- hardware device communication is LAN-local — no external exposure of printer/scanner ports

---

## Guardrails

- integrations domain is a boundary adapter — it must not contain business logic (no tax calc, no ledger writes)
- each payment gateway adapter implements the same interface (`PaymentAdapter`) — swap without domain changes
- WhatsApp and SMS adapters implement the same `MessagingAdapter` interface
- webhook endpoints are `/api/v1/integrations/*/webhook/:provider` — always behind HMAC validation middleware
- hardware adapters are optional and gracefully degraded — missing hardware does not block billing

---

## Current Status

| Sub-module                | Status     |
| ------------------------- | ---------- |
| WhatsApp OTP (Gupshup)    | ✅ active  |
| Invoice WhatsApp send     | ⏳ pending |
| Payment reminder WhatsApp | ⏳ pending |
| Razorpay payment link     | ⏳ pending |
| Razorpay webhook          | ⏳ pending |
| SMS OTP (Fast2SMS)        | ✅ partial |
| TaxOne IRP adapter        | ⏳ pending |
| TaxOne e-way bill         | ⏳ pending |
| Thermal printer (ESC/POS) | ⏳ pending |
| Barcode scanner           | ⏳ pending |
| Weighing scale            | ⏳ pending |
| EDC terminal              | ⏳ pending |
| E-Commerce order sync     | ⏳ pending |
