// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';
  permissions: string[];
  isActive: boolean;
  avatarUrl?: string;
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// ── Customer ──────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  nickname?: string;
  landmark?: string;
  balance: string | number;
  totalPurchases: string | number;
  totalPayments: string | number;
  createdAt: string;
  updatedAt: string;
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description?: string;
  price: string | number;
  unit: string;
  stock: number;
  hsnCode?: string;
  gstRate?: string | number;
  isGstExempt: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Invoice ───────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: string | number;
  itemTotal: string | number;
  gstApplicable: boolean;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  customer?: Customer;
  invoiceNo: string;
  status: InvoiceStatus;
  subtotal: string | number;
  gstAmount: string | number;
  total: string | number;
  notes?: string;
  dueDate?: string;
  items?: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

// ── Payment ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface Payment {
  id: string;
  tenantId: string;
  customerId: string;
  customer?: Customer;
  invoiceId?: string;
  amount: string | number;
  method: PaymentMethod;
  receivedAt: string;
  notes?: string;
  createdAt: string;
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  type: 'payment' | 'credit' | 'invoice';
  amount: string | number;
  description: string;
  method?: PaymentMethod;
  balanceAfter?: string | number;
  createdAt: string;
}

// ── Reminder ──────────────────────────────────────────────────────────────────

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface Reminder {
  id: string;
  tenantId: string;
  customerId: string;
  customer?: Customer;
  amount: string | number;
  reminderType: 'email' | 'whatsapp' | 'sms';
  status: ReminderStatus;
  scheduledTime: string;
  sentTime?: string;
  message?: string;
  createdAt: string;
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface ConversationSession {
  id: string;
  tenantId: string;
  customerId?: string;
  customer?: Customer;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ── Daily Summary ─────────────────────────────────────────────────────────────

export interface DailySummary {
  date: string;
  invoiceCount: number;
  totalSales: number;
  totalPayments: number;
  cashPayments: number;
  upiPayments: number;
  pendingAmount: number;
  extraPayments: number;
}

// ── WebSocket Messages ────────────────────────────────────────────────────────

export interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export interface PendingInvoicesUpdate {
  pendingInvoices: Invoice[];
  count: number;
}

// ── API responses ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
