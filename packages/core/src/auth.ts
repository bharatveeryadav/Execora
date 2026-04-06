/**
 * Authentication infrastructure — JWT (HS256) + scrypt password hashing.
 *
 * Uses ONLY Node.js 20 built-in `crypto` module — no new dependencies.
 *
 * Token format: standard JWT (base64url(header).base64url(payload).sig)
 * Password format: "scrypt:<salt>:<hash>" stored in user.passwordHash
 *
 * Two-token strategy:
 *   access  token — short-lived (15 min default), stateless, not stored in DB
 *   refresh token — long-lived (7 days default), stored in DB Session.refreshToken
 *
 * On logout → delete Session row. Access tokens are not revocable before expiry
 * (acceptable for short TTL; upgrade to Redis blocklist if needed).
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { config } from './config';
import { prisma } from './database';
import { UserJwtPayload } from '@execora/types';

const scryptAsync = promisify(scrypt);

// ── JWT helpers (HS256, standards-compliant) ────────────────────────────────

const JWT_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function sign(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function jwtEncode(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig   = sign(config.jwt.secret, `${JWT_HEADER}.${body}`);
  return `${JWT_HEADER}.${body}.${sig}`;
}

function jwtDecode<T>(token: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const [header, body, sig] = parts;
  const expectedSig = sign(config.jwt.secret, `${header}.${body}`);
  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
    throw new Error('Invalid JWT signature');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp: number };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('JWT expired');
  return payload;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a signed access token and refresh token for a user.
 * The refresh token is stored in the DB Session table.
 */
export async function generateTokens(user: {
  id: string;
  tenantId: string;
  role: string;
  permissions: string[];
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const now          = Math.floor(Date.now() / 1000);
  const accessExpiry = now + config.jwt.accessExpiresInSec;
  const refreshExpiry = now + config.jwt.refreshExpiresInSec;

  const basePayload = {
    userId:      user.id,
    tenantId:    user.tenantId,
    role:        user.role,
    permissions: user.permissions,
    iat:         now,
  };

  const accessToken  = jwtEncode({ ...basePayload, type: 'access',  exp: accessExpiry });
  const refreshToken = jwtEncode({ ...basePayload, type: 'refresh', exp: refreshExpiry });

  // Persist refresh token in Session table for revocation support
  await prisma.session.create({
    data: {
      userId:       user.id,
      tenantId:     user.tenantId,
      token:        randomBytes(16).toString('hex'), // opaque session identifier
      refreshToken,
      expiresAt:    new Date(refreshExpiry * 1000),
      lastActivity: new Date(),
    },
  });

  return { accessToken, refreshToken, expiresIn: config.jwt.accessExpiresInSec };
}

/**
 * Verify an access token and return its payload.
 * Throws on invalid signature, expiry, or wrong type.
 */
export function verifyAccessToken(token: string): UserJwtPayload {
  if (!config.jwt.secret) throw new Error('JWT_SECRET is not configured');
  const payload = jwtDecode<UserJwtPayload>(token);
  if (payload.type !== 'access') throw new Error('Expected access token');
  return payload;
}

/**
 * Exchange a valid refresh token for a new token pair.
 * Rotates the refresh token (deletes old Session, creates new one).
 */
export async function rotateRefreshToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  if (!config.jwt.secret) throw new Error('JWT_SECRET is not configured');

  // Verify signature + expiry first (throws if invalid)
  const payload = jwtDecode<UserJwtPayload>(refreshToken);
  if (payload.type !== 'refresh') throw new Error('Expected refresh token');

  // Confirm the token is still in the DB (not revoked via logout)
  const session = await prisma.session.findUnique({ where: { refreshToken } });
  if (!session) throw new Error('Refresh token revoked or not found');

  // Delete old session
  await prisma.session.delete({ where: { refreshToken } });

  // Fetch current user state (role/permissions may have changed since token was issued)
  const user = await prisma.user.findUnique({
    where:  { id: payload.userId },
    select: { id: true, tenantId: true, role: true, permissions: true, isActive: true },
  });
  if (!user || !user.isActive) throw new Error('User not found or inactive');

  return generateTokens(user as any);
}

/**
 * Revoke a refresh token (logout). Access tokens expire naturally.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { refreshToken } }).catch(() => {});
}

/**
 * Remove all sessions for a user (force logout from all devices).
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// ── Password hashing (scrypt, Node.js built-in) ─────────────────────────────

const SCRYPT_PREFIX = 'scrypt:';

/**
 * Hash a plaintext password using scrypt.
 * Returns a string in the format "scrypt:<salt>:<hash>" safe to store in DB.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt   = randomBytes(16).toString('hex');
  const hash   = await scryptAsync(plaintext, salt, 64) as Buffer;
  return `${SCRYPT_PREFIX}${salt}:${hash.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Returns false (not throw) for non-scrypt hashes (locked/bcrypt placeholders).
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (!stored.startsWith(SCRYPT_PREFIX)) {
    // Not our format — locked placeholder or legacy hash, can't verify
    return false;
  }
  const withoutPrefix = stored.slice(SCRYPT_PREFIX.length);
  const colonIdx = withoutPrefix.indexOf(':');
  if (colonIdx === -1) return false;

  const salt     = withoutPrefix.slice(0, colonIdx);
  const hashHex  = withoutPrefix.slice(colonIdx + 1);
  const expected = Buffer.from(hashHex, 'hex');

  try {
    const actual = await scryptAsync(plaintext, salt, 64) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Check whether a stored hash is in our scrypt format (not a locked placeholder).
 */
export function isPasswordSet(stored: string): boolean {
  return stored.startsWith(SCRYPT_PREFIX);
}
