/**
 * Thrown when a provider is configured but its API key / SDK is not available.
 */
export class ProviderUnavailableError extends Error {
  constructor(provider: string, operation: string) {
    super(`Provider '${provider}' is not available for operation '${operation}'`);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Thrown when a provider is available but the API call itself fails.
 */
export class ProviderError extends Error {
  readonly provider: string;
  readonly operation: string;

  constructor(provider: string, operation: string, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`Provider '${provider}' failed during '${operation}': ${msg}`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.operation = operation;
    this.cause = cause;
  }
}
