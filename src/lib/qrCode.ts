/**
 * QR Code Utilities for Event Check-in
 *
 * Issue #630: QR code check-in for event attendance
 *
 * Generates unique, non-guessable per-RSVP check-in tokens
 */

import crypto from 'crypto';

/**
 * Generate a unique QR code payload for an event RSVP.
 * Combines user ID, event ID, and a secure random nonce to prevent guessing.
 *
 * Format: `yuvahub:checkin:v1:{userId}:{eventId}:{nonce}`
 */
export function generateCheckInToken(userId: string, eventId: string): string {
  if (!userId || !eventId) {
    throw new Error('userId and eventId are required');
  }

  // Generate a 16-byte (128-bit) secure random nonce
  const nonce = crypto.randomBytes(16).toString('hex');

  return `yuvahub:checkin:v1:${userId}:${eventId}:${nonce}`;
}

/**
 * Parse and validate a check-in token.
 * Returns the extracted userId and eventId, or null if invalid.
 */
export function parseCheckInToken(token: string): { userId: string; eventId: string } | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split(':');
  if (parts.length !== 6) {
    return null;
  }

  const [prefix, action, version, userId, eventId, nonce] = parts;

  if (prefix !== 'yuvahub' || action !== 'checkin' || version !== 'v1') {
    return null;
  }

  if (!userId || !eventId || !nonce) {
    return null;
  }

  // Verify nonce is valid hex (32 chars = 16 bytes)
  if (!/^[a-f0-9]{32}$/.test(nonce)) {
    return null;
  }

  return { userId, eventId };
}

/**
 * Generate a data URI string for QR code payload.
 * This is what gets encoded into the QR code.
 */
export function getQRPayload(userId: string, eventId: string): string {
  return generateCheckInToken(userId, eventId);
}
