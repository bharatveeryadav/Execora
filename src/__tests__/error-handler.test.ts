/**
 * Error Handler — Test Suite
 * Tests all AppError subclasses, ErrorHandler static methods, and WebSocket formatting.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 *
 * Note: no DB/Redis needed — all logic is pure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  BusinessLogicError,
  WebSocketError,
  ErrorHandler,
  ErrorSeverity,
  ErrorCategory,
} from '../infrastructure/error-handler';

// ── AppError base class ────────────────────────────────────────────────────────

test('AppError: default statusCode is 500 and category is UNKNOWN', () => {
  const err = new AppError('something went wrong');
  assert.equal(err.statusCode, 500);
  assert.equal(err.category, ErrorCategory.UNKNOWN);
  assert.equal(err.severity, ErrorSeverity.HIGH);
  assert.equal(err.message, 'something went wrong');
  assert.equal(err.name, 'AppError');
});

test('AppError: custom statusCode and category are preserved', () => {
  const err = new AppError('conflict', 409, ErrorCategory.CONFLICT, ErrorSeverity.MEDIUM);
  assert.equal(err.statusCode, 409);
  assert.equal(err.category, ErrorCategory.CONFLICT);
  assert.equal(err.severity, ErrorSeverity.MEDIUM);
});

// ── Subclass status codes ─────────────────────────────────────────────────────

test('ValidationError: statusCode is 400', () => {
  const err = new ValidationError('name required');
  assert.equal(err.statusCode, 400);
  assert.equal(err.name, 'ValidationError');
  assert.equal(err.category, ErrorCategory.VALIDATION);
  assert.equal(err.severity, ErrorSeverity.MEDIUM);
});

test('AuthenticationError: statusCode is 401', () => {
  const err = new AuthenticationError('not authenticated');
  assert.equal(err.statusCode, 401);
  assert.equal(err.name, 'AuthenticationError');
});

test('AuthorizationError: statusCode is 403', () => {
  const err = new AuthorizationError('forbidden');
  assert.equal(err.statusCode, 403);
  assert.equal(err.name, 'AuthorizationError');
});

test('NotFoundError: statusCode is 404 with resource message', () => {
  const err = new NotFoundError('Customer', 'cust-123');
  assert.equal(err.statusCode, 404);
  assert.ok(err.message.includes('Customer'));
  assert.ok(err.message.includes('cust-123'));
  assert.equal(err.name, 'NotFoundError');
  assert.equal(err.severity, ErrorSeverity.LOW);
});

test('NotFoundError: message without ID', () => {
  const err = new NotFoundError('Invoice');
  assert.equal(err.statusCode, 404);
  assert.ok(err.message.includes('Invoice'));
  assert.ok(!err.message.includes('undefined'));
});

test('ConflictError: statusCode is 409', () => {
  const err = new ConflictError('duplicate name');
  assert.equal(err.statusCode, 409);
  assert.equal(err.name, 'ConflictError');
  assert.equal(err.category, ErrorCategory.CONFLICT);
});

test('RateLimitError: statusCode is 429 with default message', () => {
  const err = new RateLimitError();
  assert.equal(err.statusCode, 429);
  assert.ok(err.message.length > 0);
  assert.equal(err.name, 'RateLimitError');
});

test('DatabaseError: statusCode is 500', () => {
  const original = new Error('connection refused');
  const err = new DatabaseError('db failed', original);
  assert.equal(err.statusCode, 500);
  assert.equal(err.name, 'DatabaseError');
  assert.equal(err.category, ErrorCategory.DATABASE);
  assert.equal(err.originalError, original);
});

test('ExternalServiceError: statusCode is 502 and includes service name', () => {
  const err = new ExternalServiceError('WhatsApp', 'timeout');
  assert.equal(err.statusCode, 502);
  assert.ok(err.message.includes('WhatsApp'));
  assert.ok(err.message.includes('timeout'));
  assert.equal(err.name, 'ExternalServiceError');
});

test('BusinessLogicError: statusCode is 422', () => {
  const err = new BusinessLogicError('opening balance already set');
  assert.equal(err.statusCode, 422);
  assert.equal(err.name, 'BusinessLogicError');
  assert.equal(err.category, ErrorCategory.BUSINESS_LOGIC);
});

test('WebSocketError: statusCode is 500', () => {
  const err = new WebSocketError('ws dropped');
  assert.equal(err.statusCode, 500);
  assert.equal(err.name, 'WebSocketError');
  assert.equal(err.category, ErrorCategory.WEBSOCKET);
});

// ── ErrorHandler.formatErrorResponse ─────────────────────────────────────────

test('formatErrorResponse: AppError returns structured error object', () => {
  const err = new ValidationError('name required');
  const response = ErrorHandler.formatErrorResponse(err);
  assert.ok(response.error);
  assert.equal(response.error.message, 'name required');
  assert.equal(response.error.statusCode, 400);
  assert.equal(response.error.category, ErrorCategory.VALIDATION);
  assert.ok(typeof response.error.timestamp === 'string');
});

test('formatErrorResponse: plain Error returns generic 500 response', () => {
  const err = new Error('something broke');
  const response = ErrorHandler.formatErrorResponse(err);
  assert.ok(response.error);
  assert.equal(response.error.statusCode, 500);
  assert.equal(response.error.message, 'Internal Server Error');
  assert.equal(response.error.category, ErrorCategory.UNKNOWN);
});

// ── ErrorHandler.formatWebSocketError ────────────────────────────────────────

test('formatWebSocketError: AppError returns type=error with correct message', () => {
  const err = new BusinessLogicError('balance insufficient');
  const ws = ErrorHandler.formatWebSocketError(err);
  assert.equal(ws.type, 'error');
  assert.ok(ws.data);
  assert.equal(ws.data.message, 'balance insufficient');
  assert.equal(ws.data.category, ErrorCategory.BUSINESS_LOGIC);
  assert.ok(typeof ws.data.timestamp === 'string');
});

test('formatWebSocketError: plain Error uses WEBSOCKET category', () => {
  const err = new Error('ws failure');
  const ws = ErrorHandler.formatWebSocketError(err);
  assert.equal(ws.type, 'error');
  assert.equal(ws.data.message, 'ws failure');
  assert.equal(ws.data.category, ErrorCategory.WEBSOCKET);
});

// ── ErrorHandler.tryCatch ─────────────────────────────────────────────────────

test('tryCatch: success path returns { success: true, data }', async () => {
  const result = await ErrorHandler.tryCatch(async () => 42);
  assert.equal(result.success, true);
  assert.equal(result.data, 42);
  assert.equal(result.error, undefined);
});

test('tryCatch: AppError path returns { success: false, error }', async () => {
  const result = await ErrorHandler.tryCatch(async () => {
    throw new ValidationError('bad input');
  });
  assert.equal(result.success, false);
  assert.ok(result.error instanceof AppError);
  assert.equal(result.error?.statusCode, 400);
  assert.equal(result.data, undefined);
});

test('tryCatch: unknown error is wrapped as AppError', async () => {
  const result = await ErrorHandler.tryCatch(async () => {
    throw new Error('unexpected');
  });
  assert.equal(result.success, false);
  assert.ok(result.error instanceof AppError);
  assert.equal(result.error?.statusCode, 500);
  assert.equal(result.error?.category, ErrorCategory.UNKNOWN);
});

// ── ErrorHandler.handle ───────────────────────────────────────────────────────

test('handle: success path returns resolved value', async () => {
  const value = await ErrorHandler.handle(async () => 'hello');
  assert.equal(value, 'hello');
});

test('handle: AppError is re-thrown', async () => {
  await assert.rejects(
    () => ErrorHandler.handle(async () => { throw new NotFoundError('Customer', '123'); }),
    (err: any) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('handle: plain Error is wrapped and thrown as AppError', async () => {
  await assert.rejects(
    () => ErrorHandler.handle(async () => { throw new Error('db gone'); }),
    (err: any) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 500);
      return true;
    }
  );
});
