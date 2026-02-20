import { logger } from './logger';

/**
 * Error Severity Levels for monitoring and alerting
 */
export enum ErrorSeverity {
    LOW = 'low',           // Info-level, no action needed
    MEDIUM = 'medium',     // Warning, monitor but recoverable
    HIGH = 'high',         // Error, requires attention
    CRITICAL = 'critical', // Fatal, system down or data loss risk
}

/**
 * Error Categories for organization and filtering
 */
export enum ErrorCategory {
    VALIDATION = 'validation',       // Input validation failed
    AUTHENTICATION = 'authentication', // Auth/permission issue
    DATABASE = 'database',           // DB connection/query error
    EXTERNAL_SERVICE = 'external',   // OpenAI, WhatsApp, etc.
    BUSINESS_LOGIC = 'business',     // Business rule violation
    RESOURCE_NOT_FOUND = 'notfound', // 404 errors
    CONFLICT = 'conflict',           // 409 conflict errors
    RATE_LIMIT = 'rate_limit',       // Rate limiting
    WEBSOCKET = 'websocket',         // WebSocket specific
    UNKNOWN = 'unknown',             // Unclassified
}

/**
 * Structured Application Error Class
 * Centralized way to throw and handle all errors
 */
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public category: ErrorCategory = ErrorCategory.UNKNOWN,
        public severity: ErrorSeverity = ErrorSeverity.HIGH,
        public context: Record<string, any> = {},
        public originalError?: Error,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Validation Error - HTTP 400
 */
export class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 400, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, context);
        this.name = 'ValidationError';
    }
}

/**
 * Authentication Error - HTTP 401
 */
export class AuthenticationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 401, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, context);
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization Error - HTTP 403
 */
export class AuthorizationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 403, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, context);
        this.name = 'AuthorizationError';
    }
}

/**
 * Not Found Error - HTTP 404
 */
export class NotFoundError extends AppError {
    constructor(resource: string, id?: string | number) {
        const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
        super(message, 404, ErrorCategory.RESOURCE_NOT_FOUND, ErrorSeverity.LOW);
        this.name = 'NotFoundError';
    }
}

/**
 * Conflict Error - HTTP 409
 */
export class ConflictError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 409, ErrorCategory.CONFLICT, ErrorSeverity.MEDIUM, context);
        this.name = 'ConflictError';
    }
}

/**
 * Rate Limit Error - HTTP 429
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests', context?: Record<string, any>) {
        super(message, 429, ErrorCategory.RATE_LIMIT, ErrorSeverity.MEDIUM, context);
        this.name = 'RateLimitError';
    }
}

/**
 * Database Error - HTTP 500
 */
export class DatabaseError extends AppError {
    constructor(message: string, originalError?: Error, context?: Record<string, any>) {
        super(
            'Database operation failed',
            500,
            ErrorCategory.DATABASE,
            ErrorSeverity.HIGH,
            context,
            originalError,
        );
        this.name = 'DatabaseError';
    }
}

/**
 * External Service Error - HTTP 502
 */
export class ExternalServiceError extends AppError {
    constructor(
        service: string,
        message: string,
        originalError?: Error,
        context?: Record<string, any>,
    ) {
        super(
            `${service} service error: ${message}`,
            502,
            ErrorCategory.EXTERNAL_SERVICE,
            ErrorSeverity.HIGH,
            context,
            originalError,
        );
        this.name = 'ExternalServiceError';
    }
}

/**
 * Business Logic Error - HTTP 422
 */
export class BusinessLogicError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 422, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, context);
        this.name = 'BusinessLogicError';
    }
}

/**
 * WebSocket Error
 */
export class WebSocketError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 500, ErrorCategory.WEBSOCKET, ErrorSeverity.HIGH, context);
        this.name = 'WebSocketError';
    }
}

/**
 * Centralized Error Handler
 * Single place to log, track, and format all errors
 */
export class ErrorHandler {
    /**
     * Log error with full context and metadata
     */
    static logError(error: Error | AppError, additionalContext: Record<string, any> = {}) {
        const isAppError = error instanceof AppError;

        const errorData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(isAppError && {
                category: (error as AppError).category,
                severity: (error as AppError).severity,
                statusCode: (error as AppError).statusCode,
                context: { ...(error as AppError).context, ...additionalContext },
                originalError: (error as AppError).originalError?.message,
            }),
            ...(!isAppError && { context: additionalContext }),
            timestamp: new Date().toISOString(),
        };

        const severity = isAppError ? (error as AppError).severity : ErrorSeverity.HIGH;

        // Log based on severity
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                logger.fatal(errorData, `🚨 CRITICAL ERROR: ${error.message}`);
                break;
            case ErrorSeverity.HIGH:
                logger.error(errorData, `❌ ERROR: ${error.message}`);
                break;
            case ErrorSeverity.MEDIUM:
                logger.warn(errorData, `⚠️ WARNING: ${error.message}`);
                break;
            case ErrorSeverity.LOW:
                logger.info(errorData, `ℹ️ INFO: ${error.message}`);
                break;
        }

        return errorData;
    }

    /**
     * Create structured error response for API
     */
    static formatErrorResponse(error: Error | AppError) {
        const isAppError = error instanceof AppError;

        if (isAppError) {
            return {
                error: {
                    message: (error as AppError).message,
                    category: (error as AppError).category,
                    statusCode: (error as AppError).statusCode,
                    timestamp: new Date().toISOString(),
                    ...(process.env.NODE_ENV === 'development' && {
                        stack: (error as AppError).stack,
                        context: (error as AppError).context,
                    }),
                },
            };
        }

        // Unknown error
        return {
            error: {
                message: 'Internal Server Error',
                category: ErrorCategory.UNKNOWN,
                statusCode: 500,
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack,
                    originalMessage: error.message,
                }),
            },
        };
    }

    /**
     * Create error for WebSocket with proper formatting
     */
    static formatWebSocketError(error: Error | AppError) {
        const isAppError = error instanceof AppError;

        return {
            type: 'error',
            data: {
                message: isAppError ? (error as AppError).message : error.message,
                category: isAppError ? (error as AppError).category : ErrorCategory.WEBSOCKET,
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack,
                }),
            },
        };
    }

    /**
     * Wrap async functions with automatic error handling
     */
    static async handle<T>(
        fn: () => Promise<T>,
        errorContext: Record<string, any> = {},
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (error instanceof AppError) {
                this.logError(error, errorContext);
                throw error;
            }

            // Convert unknown errors to AppError
            const appError = new AppError(
                error instanceof Error ? error.message : String(error),
                500,
                ErrorCategory.UNKNOWN,
                ErrorSeverity.HIGH,
                errorContext,
                error instanceof Error ? error : undefined,
            );

            this.logError(appError);
            throw appError;
        }
    }

    /**
     * Safe async wrapper that returns result or error
     */
    static async tryCatch<T>(
        fn: () => Promise<T>,
        errorContext: Record<string, any> = {},
    ): Promise<{ success: boolean; data?: T; error?: AppError }> {
        try {
            return {
                success: true,
                data: await fn(),
            };
        } catch (error) {
            let appError: AppError;

            if (error instanceof AppError) {
                appError = error;
            } else {
                appError = new AppError(
                    error instanceof Error ? error.message : String(error),
                    500,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.HIGH,
                    errorContext,
                    error instanceof Error ? error : undefined,
                );
            }

            this.logError(appError, errorContext);

            return {
                success: false,
                error: appError,
            };
        }
    }
}

/**
 * Global error boundary - catches unhandled promise rejections
 */
export function setupGlobalErrorHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        ErrorHandler.logError(error, {
            type: 'unhandledRejection',
            promise: promise.toString(),
        });
    });

    process.on('uncaughtException', (error) => {
        ErrorHandler.logError(error, {
            type: 'uncaughtException',
        });
        // Exit process after logging critical error
        process.exit(1);
    });
}
