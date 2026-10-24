import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { User } from './types';
import { findSessionByTokenHash, findUserById } from './db.ts';

export const SESSION_COOKIE_NAME = 'brandlens_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Derives a cryptographic password hash using Node's standard scrypt algorithm.
 * Format: scrypt:<salt_hex>:<derived_key_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Constant-time password verification using crypto.timingSafeEqual.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const salt = parts[1];
    const key = parts[2];
    const keyBuffer = Buffer.from(key, 'hex');

    const derivedKey = crypto.scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    });

    if (derivedKey.length !== keyBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically strong 256-bit random session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes session token using SHA-256 before database storage so tokens are not stored raw.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Resolves the authenticated user from a NextRequest's HTTP-only session cookie.
 * Returns null if no valid, non-expired session is present.
 */
export function getServerSessionUser(request: NextRequest): User | null {
  try {
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieToken || cookieToken.trim().length < 16) {
      return null;
    }

    const tokenHash = hashToken(cookieToken.trim());
    const session = findSessionByTokenHash(tokenHash);
    if (!session) {
      return null;
    }

    // Check expiry
    const now = new Date().toISOString();
    if (session.expires_at <= now) {
      return null;
    }

    const user = findUserById(session.user_id);
    return user || null;
  } catch (err) {
    console.error('Error in getServerSessionUser:', err);
    return null;
  }
}
