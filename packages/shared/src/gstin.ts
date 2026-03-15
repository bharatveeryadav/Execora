/**
 * GSTIN (GST Identification Number) validation — India 15-char format.
 * Per S11-08: Reject malformed GSTIN at API; UI red border + message.
 *
 * Structure: 2 (state) + 10 (PAN) + 1 (entity) + Z + 1 (checksum)
 * Checksum: Luhn mod 36 algorithm on first 14 chars.
 */
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function charToCode(c: string): number {
  const idx = GSTIN_CHARS.indexOf(c.toUpperCase());
  return idx >= 0 ? idx : 0;
}

function codeToChar(code: number): string {
  return GSTIN_CHARS[((code % 36) + 36) % 36] ?? "0";
}

/**
 * Validates GSTIN format and checksum.
 * Returns true only if: 15 chars, regex match, and checksum digit correct.
 */
export function isValidGstin(gstin: string): boolean {
  const g = (gstin ?? "").trim().toUpperCase();
  if (g.length !== 15 || !GSTIN_REGEX.test(g)) return false;

  // Luhn mod 36 checksum on first 14 chars
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = charToCode(g[i]!);
    const multiplier = i % 2 === 0 ? 1 : 2;
    const product = code * multiplier;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }
  const remainder = sum % 36;
  const expectedChecksum = codeToChar(36 - remainder);
  const actualChecksum = g[14];
  return expectedChecksum === actualChecksum;
}

/**
 * Returns validation error message or null if valid.
 */
export function getGstinValidationError(gstin: string): string | null {
  const g = (gstin ?? "").trim();
  if (!g) return null;
  if (g.length !== 15)
    return "GSTIN must be 15 characters (state + PAN + entity + Z + checksum)";
  const upper = g.toUpperCase();
  if (!GSTIN_REGEX.test(upper))
    return "Invalid format: 2-digit state (01–38) + 10-char PAN + entity + Z + checksum";
  if (!isValidGstin(g))
    return "Invalid GSTIN checksum — verify the number";
  return null;
}
