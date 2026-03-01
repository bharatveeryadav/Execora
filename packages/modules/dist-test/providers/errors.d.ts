/**
 * Thrown when a provider is configured but its API key / SDK is not available.
 */
export declare class ProviderUnavailableError extends Error {
    constructor(provider: string, operation: string);
}
/**
 * Thrown when a provider is available but the API call itself fails.
 */
export declare class ProviderError extends Error {
    readonly provider: string;
    readonly operation: string;
    constructor(provider: string, operation: string, cause: unknown);
}
//# sourceMappingURL=errors.d.ts.map