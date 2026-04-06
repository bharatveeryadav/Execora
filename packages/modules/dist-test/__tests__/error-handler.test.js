"use strict";
/**
 * Error Handler — Test Suite
 * Tests all AppError subclasses, ErrorHandler static methods, and WebSocket formatting.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 *
 * Note: no DB/Redis needed — all logic is pure.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const core_1 = require("@execora/core");
// ── AppError base class ────────────────────────────────────────────────────────
(0, node_test_1.default)('AppError: default statusCode is 500 and category is UNKNOWN', () => {
    const err = new core_1.AppError('something went wrong');
    strict_1.default.equal(err.statusCode, 500);
    strict_1.default.equal(err.category, core_1.ErrorCategory.UNKNOWN);
    strict_1.default.equal(err.severity, core_1.ErrorSeverity.HIGH);
    strict_1.default.equal(err.message, 'something went wrong');
    strict_1.default.equal(err.name, 'AppError');
});
(0, node_test_1.default)('AppError: custom statusCode and category are preserved', () => {
    const err = new core_1.AppError('conflict', 409, core_1.ErrorCategory.CONFLICT, core_1.ErrorSeverity.MEDIUM);
    strict_1.default.equal(err.statusCode, 409);
    strict_1.default.equal(err.category, core_1.ErrorCategory.CONFLICT);
    strict_1.default.equal(err.severity, core_1.ErrorSeverity.MEDIUM);
});
// ── Subclass status codes ─────────────────────────────────────────────────────
(0, node_test_1.default)('ValidationError: statusCode is 400', () => {
    const err = new core_1.ValidationError('name required');
    strict_1.default.equal(err.statusCode, 400);
    strict_1.default.equal(err.name, 'ValidationError');
    strict_1.default.equal(err.category, core_1.ErrorCategory.VALIDATION);
    strict_1.default.equal(err.severity, core_1.ErrorSeverity.MEDIUM);
});
(0, node_test_1.default)('AuthenticationError: statusCode is 401', () => {
    const err = new core_1.AuthenticationError('not authenticated');
    strict_1.default.equal(err.statusCode, 401);
    strict_1.default.equal(err.name, 'AuthenticationError');
});
(0, node_test_1.default)('AuthorizationError: statusCode is 403', () => {
    const err = new core_1.AuthorizationError('forbidden');
    strict_1.default.equal(err.statusCode, 403);
    strict_1.default.equal(err.name, 'AuthorizationError');
});
(0, node_test_1.default)('NotFoundError: statusCode is 404 with resource message', () => {
    const err = new core_1.NotFoundError('Customer', 'cust-123');
    strict_1.default.equal(err.statusCode, 404);
    strict_1.default.ok(err.message.includes('Customer'));
    strict_1.default.ok(err.message.includes('cust-123'));
    strict_1.default.equal(err.name, 'NotFoundError');
    strict_1.default.equal(err.severity, core_1.ErrorSeverity.LOW);
});
(0, node_test_1.default)('NotFoundError: message without ID', () => {
    const err = new core_1.NotFoundError('Invoice');
    strict_1.default.equal(err.statusCode, 404);
    strict_1.default.ok(err.message.includes('Invoice'));
    strict_1.default.ok(!err.message.includes('undefined'));
});
(0, node_test_1.default)('ConflictError: statusCode is 409', () => {
    const err = new core_1.ConflictError('duplicate name');
    strict_1.default.equal(err.statusCode, 409);
    strict_1.default.equal(err.name, 'ConflictError');
    strict_1.default.equal(err.category, core_1.ErrorCategory.CONFLICT);
});
(0, node_test_1.default)('RateLimitError: statusCode is 429 with default message', () => {
    const err = new core_1.RateLimitError();
    strict_1.default.equal(err.statusCode, 429);
    strict_1.default.ok(err.message.length > 0);
    strict_1.default.equal(err.name, 'RateLimitError');
});
(0, node_test_1.default)('DatabaseError: statusCode is 500', () => {
    const original = new Error('connection refused');
    const err = new core_1.DatabaseError('db failed', original);
    strict_1.default.equal(err.statusCode, 500);
    strict_1.default.equal(err.name, 'DatabaseError');
    strict_1.default.equal(err.category, core_1.ErrorCategory.DATABASE);
    strict_1.default.equal(err.originalError, original);
});
(0, node_test_1.default)('ExternalServiceError: statusCode is 502 and includes service name', () => {
    const err = new core_1.ExternalServiceError('WhatsApp', 'timeout');
    strict_1.default.equal(err.statusCode, 502);
    strict_1.default.ok(err.message.includes('WhatsApp'));
    strict_1.default.ok(err.message.includes('timeout'));
    strict_1.default.equal(err.name, 'ExternalServiceError');
});
(0, node_test_1.default)('BusinessLogicError: statusCode is 422', () => {
    const err = new core_1.BusinessLogicError('opening balance already set');
    strict_1.default.equal(err.statusCode, 422);
    strict_1.default.equal(err.name, 'BusinessLogicError');
    strict_1.default.equal(err.category, core_1.ErrorCategory.BUSINESS_LOGIC);
});
(0, node_test_1.default)('WebSocketError: statusCode is 500', () => {
    const err = new core_1.WebSocketError('ws dropped');
    strict_1.default.equal(err.statusCode, 500);
    strict_1.default.equal(err.name, 'WebSocketError');
    strict_1.default.equal(err.category, core_1.ErrorCategory.WEBSOCKET);
});
// ── ErrorHandler.formatErrorResponse ─────────────────────────────────────────
(0, node_test_1.default)('formatErrorResponse: AppError returns structured error object', () => {
    const err = new core_1.ValidationError('name required');
    const response = core_1.ErrorHandler.formatErrorResponse(err);
    strict_1.default.ok(response.error);
    strict_1.default.equal(response.error.message, 'name required');
    strict_1.default.equal(response.error.statusCode, 400);
    strict_1.default.equal(response.error.category, core_1.ErrorCategory.VALIDATION);
    strict_1.default.ok(typeof response.error.timestamp === 'string');
});
(0, node_test_1.default)('formatErrorResponse: plain Error returns generic 500 response', () => {
    const err = new Error('something broke');
    const response = core_1.ErrorHandler.formatErrorResponse(err);
    strict_1.default.ok(response.error);
    strict_1.default.equal(response.error.statusCode, 500);
    strict_1.default.equal(response.error.message, 'Internal Server Error');
    strict_1.default.equal(response.error.category, core_1.ErrorCategory.UNKNOWN);
});
// ── ErrorHandler.formatWebSocketError ────────────────────────────────────────
(0, node_test_1.default)('formatWebSocketError: AppError returns type=error with correct message', () => {
    const err = new core_1.BusinessLogicError('balance insufficient');
    const ws = core_1.ErrorHandler.formatWebSocketError(err);
    strict_1.default.equal(ws.type, 'error');
    strict_1.default.ok(ws.data);
    strict_1.default.equal(ws.data.message, 'balance insufficient');
    strict_1.default.equal(ws.data.category, core_1.ErrorCategory.BUSINESS_LOGIC);
    strict_1.default.ok(typeof ws.data.timestamp === 'string');
});
(0, node_test_1.default)('formatWebSocketError: plain Error uses WEBSOCKET category', () => {
    const err = new Error('ws failure');
    const ws = core_1.ErrorHandler.formatWebSocketError(err);
    strict_1.default.equal(ws.type, 'error');
    strict_1.default.equal(ws.data.message, 'ws failure');
    strict_1.default.equal(ws.data.category, core_1.ErrorCategory.WEBSOCKET);
});
// ── ErrorHandler.tryCatch ─────────────────────────────────────────────────────
(0, node_test_1.default)('tryCatch: success path returns { success: true, data }', async () => {
    const result = await core_1.ErrorHandler.tryCatch(async () => 42);
    strict_1.default.equal(result.success, true);
    strict_1.default.equal(result.data, 42);
    strict_1.default.equal(result.error, undefined);
});
(0, node_test_1.default)('tryCatch: AppError path returns { success: false, error }', async () => {
    const result = await core_1.ErrorHandler.tryCatch(async () => {
        throw new core_1.ValidationError('bad input');
    });
    strict_1.default.equal(result.success, false);
    strict_1.default.ok(result.error instanceof core_1.AppError);
    strict_1.default.equal(result.error?.statusCode, 400);
    strict_1.default.equal(result.data, undefined);
});
(0, node_test_1.default)('tryCatch: unknown error is wrapped as AppError', async () => {
    const result = await core_1.ErrorHandler.tryCatch(async () => {
        throw new Error('unexpected');
    });
    strict_1.default.equal(result.success, false);
    strict_1.default.ok(result.error instanceof core_1.AppError);
    strict_1.default.equal(result.error?.statusCode, 500);
    strict_1.default.equal(result.error?.category, core_1.ErrorCategory.UNKNOWN);
});
// ── ErrorHandler.handle ───────────────────────────────────────────────────────
(0, node_test_1.default)('handle: success path returns resolved value', async () => {
    const value = await core_1.ErrorHandler.handle(async () => 'hello');
    strict_1.default.equal(value, 'hello');
});
(0, node_test_1.default)('handle: AppError is re-thrown', async () => {
    await strict_1.default.rejects(() => core_1.ErrorHandler.handle(async () => { throw new core_1.NotFoundError('Customer', '123'); }), (err) => {
        strict_1.default.ok(err instanceof core_1.AppError);
        strict_1.default.equal(err.statusCode, 404);
        return true;
    });
});
(0, node_test_1.default)('handle: plain Error is wrapped and thrown as AppError', async () => {
    await strict_1.default.rejects(() => core_1.ErrorHandler.handle(async () => { throw new Error('db gone'); }), (err) => {
        strict_1.default.ok(err instanceof core_1.AppError);
        strict_1.default.equal(err.statusCode, 500);
        return true;
    });
});
//# sourceMappingURL=error-handler.test.js.map