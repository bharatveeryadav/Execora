"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderError = exports.ProviderUnavailableError = void 0;
/**
 * Thrown when a provider is configured but its API key / SDK is not available.
 */
class ProviderUnavailableError extends Error {
    constructor(provider, operation) {
        super(`Provider '${provider}' is not available for operation '${operation}'`);
        this.name = 'ProviderUnavailableError';
    }
}
exports.ProviderUnavailableError = ProviderUnavailableError;
/**
 * Thrown when a provider is available but the API call itself fails.
 */
class ProviderError extends Error {
    provider;
    operation;
    constructor(provider, operation, cause) {
        const msg = cause instanceof Error ? cause.message : String(cause);
        super(`Provider '${provider}' failed during '${operation}': ${msg}`);
        this.name = 'ProviderError';
        this.provider = provider;
        this.operation = operation;
        this.cause = cause;
    }
}
exports.ProviderError = ProviderError;
//# sourceMappingURL=errors.js.map