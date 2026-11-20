import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Role, User } from '../src/types';
import { getDb } from './db';

const TOKEN_SECRET = process.env.JWT_SECRET || 'societysync-local-dev-secret-key-change-in-prod';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function signToken(user: User): string {
  const payload = {
    sub: user.id,
    role: user.role,
    societyId: user.societyId,
    flatId: user.flatId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): { sub: string; societyId: string; role: Role; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }
  const db = getDb();
  const stored = db.users.find((u) => u.id === payload.sub && u.status === 'ACTIVE');
  if (!stored) {
    res.status(401).json({ error: 'User account is inactive or not found' });
    return;
  }
  const { passwordHash: _ignored, ...safeUser } = stored;
  req.user = safeUser;
  next();
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}
