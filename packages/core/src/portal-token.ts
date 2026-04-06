/**
 * Customer-facing invoice portal — HMAC-based public token.
 *
 * Generates a URL-safe token from the invoice ID using the JWT secret.
 * No DB column needed — token is deterministic and can be re-verified any time.
 *
 * URL format:  /pub/invoice/:invoiceId/:token
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from './config';

const PURPOSE = 'portal-v1';

/**
 * Generate a public portal token for an invoice.
 * The token is 32 hex chars derived from HMAC-SHA256(secret, purpose:invoiceId).
 */
export function makePortalToken(invoiceId: string): string {
  return createHmac('sha256', config.jwt.secret)
    .update(`${PURPOSE}:${invoiceId}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Verify that a portal token matches the invoice ID.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyPortalToken(invoiceId: string, token: string): boolean {
  if (!token || token.length !== 32) return false;
  const expected = makePortalToken(invoiceId);
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
