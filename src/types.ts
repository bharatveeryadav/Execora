// Intent types
export enum IntentType {
  CREATE_INVOICE = 'CREATE_INVOICE',
  CREATE_REMINDER = 'CREATE_REMINDER',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  ADD_CREDIT = 'ADD_CREDIT',
  CHECK_BALANCE = 'CHECK_BALANCE',
  CHECK_STOCK = 'CHECK_STOCK',
  CANCEL_INVOICE = 'CANCEL_INVOICE',
  CANCEL_REMINDER = 'CANCEL_REMINDER',
  LIST_REMINDERS = 'LIST_REMINDERS',
  CREATE_CUSTOMER = 'CREATE_CUSTOMER',
  MODIFY_REMINDER = 'MODIFY_REMINDER',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  UPDATE_CUSTOMER_PHONE = 'UPDATE_CUSTOMER_PHONE',
  GET_CUSTOMER_INFO = 'GET_CUSTOMER_INFO',
  DELETE_CUSTOMER_DATA = 'DELETE_CUSTOMER_DATA',
  SWITCH_LANGUAGE = 'SWITCH_LANGUAGE',
  UNKNOWN = 'UNKNOWN',
  LIST_CUSTOMER_BALANCES = 'LIST_CUSTOMER_BALANCES',
  TOTAL_PENDING_AMOUNT = 'TOTAL_PENDING_AMOUNT',
}

// Intent extraction response
export interface IntentExtraction {
  intent: IntentType;
  entities: Record<string, any>;
  confidence: number;
  originalText: string;
  normalizedText?: string;
  conversationSessionId?: string;
  adminEmail?: string;
  operatorId?: string;
  operatorRole?: 'admin' | 'user';
}

// Customer search result
export interface CustomerSearchResult {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  nickname?: string | null;
  landmark?: string | null;
  balance: number;
  matchScore: number;
}

// Invoice item
export interface InvoiceItemInput {
  productName: string;
  quantity: number;
}

// Business execution result
export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// WebSocket message types
export enum WSMessageType {
  VOICE_START = 'voice:start',
  VOICE_STARTED = 'voice:started',
  VOICE_TRANSCRIPT = 'voice:transcript',
  VOICE_INTENT = 'voice:intent',
  VOICE_RESPONSE = 'voice:response',
  VOICE_TTS_STREAM = 'voice:tts-stream',
  VOICE_END = 'voice:end',
  VOICE_STOPPED = 'voice:stopped',
  ERROR = 'error',
  RECORDING_STARTED = 'recording:started',
  RECORDING_STOPPED = 'recording:stopped',
  TASK_QUEUED = 'task:queued',
  TASK_STARTED = 'task:started',
  TASK_COMPLETED = 'task:completed',
  TASK_FAILED = 'task:failed',
  TASK_CANCELLED = 'task:cancelled',
  TASK_STATUS = 'task:status',
  QUEUE_STATUS = 'queue:status',
}

export interface WSMessage {
  type: WSMessageType | string;
  data?: any;
  timestamp: string;
}

// Reminder job data
export interface ReminderJobData {
  reminderId: string;
  customerId: string;
  customerName: string;
  phone: string;
  amount: number;
  message: string;
}

// WhatsApp message job data
export interface WhatsAppJobData {
  reminderId?: string;
  phone: string;
  message: string;
  messageType: 'text' | 'template';
}

// Date/time parsing result
export interface ParsedDateTime {
  date: Date;
  description: string;
}
