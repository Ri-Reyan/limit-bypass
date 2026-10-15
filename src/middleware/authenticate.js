import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Authentication middleware validating the Bearer API key in the Authorization header.
 * Uses crypto.timingSafeEqual to defend against timing attacks.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization header. Expected Bearer token format.',
    });
  }

  const token = authHeader.slice(7).trim();
  const expectedKey = env.API_KEY;

  const tokenBuffer = Buffer.from(token, 'utf8');
  const expectedBuffer = Buffer.from(expectedKey, 'utf8');

  // Buffer length mismatch check prevents timingSafeEqual from throwing
  if (
    tokenBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key.',
    });
  }

  return next();
}

