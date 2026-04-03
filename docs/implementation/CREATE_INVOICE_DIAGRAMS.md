# Create Invoice Diagrams

Status: Draft v1 (April 3, 2026)
Scope: Mobile create-invoice flow and backend execution path.

## 1) System Architecture

```mermaid
flowchart TD
    A[Mobile App\nBillingScreen + useBillingForm + formReducer] --> B[Payload Builder\nCreateInvoicePayload]
    B --> C[API Client\ninvoiceApi.create]
    C --> D[POST /api/v1/invoices\nFastify Route Validation]

    D --> E[Invoice Service\ncreateInvoice]

    subgraph TX[Prisma Transaction Boundary]
      E --> F[Find or Create Products]
      F --> G[Compute Totals + GST]
      G --> H[Create Invoice + Items]
      H --> I[Record Initial Payment Optional]
      I --> J[Deduct Stock]
      J --> K[Update Customer Balance]
    end

    K --> L[(PostgreSQL)]
    K --> M[Commit Transaction]

    M --> N[WebSocket Broadcaster\ninvoice:created]
    M --> O[Monitoring + Metrics]
    M --> P[Async PDF + Email/WhatsApp Dispatch]

    M --> Q[201 Response\ninvoice + autoCreatedProducts]
    Q --> R[Mobile Success Handler\ninvalidate queries + clear draft + success modal]

    A --> S[Offline Check]
    S -->|Offline| T[Queue Invoice Locally\nofflineQueue]
    T --> U[Sync Worker on Reconnect]
    U --> D
```

## 2) Runtime Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant M as Mobile BillingScreen
    participant A as invoiceApi
    participant R as Invoice Route
    participant S as Invoice Service
    participant DB as PostgreSQL
    participant W as WebSocket

    U->>M: Tap Create Invoice
    M->>M: Validate form and build payload

    alt Online
      M->>A: create(payload)
      A->>R: POST /api/v1/invoices
      R->>R: Schema and business guards
      R->>S: createInvoice(payload)

      S->>DB: Begin transaction
      S->>DB: Resolve products
      S->>DB: Insert invoice and items
      opt initialPayment provided
        S->>DB: Insert payment and update invoice status
      end
      S->>DB: Deduct stock
      S->>DB: Update customer balance
      S->>DB: Commit

      S-->>R: invoice result
      R->>W: broadcast invoice:created
      R-->>A: 201 invoice response
      A-->>M: success
      M->>M: Invalidate queries, clear draft, show success modal
    else Offline
      M->>M: enqueueInvoice(payload)
      M->>M: Show queued success state
    end
```

## 3) User Flow

```mermaid
flowchart TD
    A[Open New Invoice] --> B{Draft exists?}
    B -->|Yes| C[Restore Draft]
    B -->|No| D[Start Fresh]
    C --> E[Select Customer or Walk-in]
    D --> E

    E --> F[Add Items]
    F --> G[Optional: GST, Discount, Notes, Due Date]
    G --> H[Set Payment Mode and Amount]
    H --> I{Split Payment?}
    I -->|Yes| J[Add Split Entries]
    I -->|No| K[Proceed]
    J --> K

    K --> L[Tap Create Invoice]
    L --> M{Validation OK?}
    M -->|No| N[Show Inline Errors]
    N --> F

    M -->|Yes, Online| O[Create via API]
    M -->|Yes, Offline| P[Queue Locally]

    O --> Q[Show Success Modal]
    P --> Q

    Q --> R[Share, Print, View Invoice, New Invoice]
```

## Source Anchors

- apps/mobile/src/features/billing/screens/BillingScreen.tsx
- apps/mobile/src/features/billing/hooks/useBillingForm.ts
- apps/mobile/src/features/billing/lib/formReducer.ts
- apps/api/src/api/routes/invoice.routes.ts
- packages/modules/src/modules/invoice/invoice.service.ts
- apps/mobile/src/lib/offlineQueue.ts
- apps/mobile/src/shared/hooks/useOffline.ts
- docs/product/PRODUCT_REQUIREMENTS.md (Section 13)
