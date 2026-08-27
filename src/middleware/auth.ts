import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const auth = getAdminAuth();
    if (!auth) {
      // In dev environment without admin service credentials, decode or permit gracefully
      req.user = { uid: 'dev-user', email: 'dev@hhmineralwater.com' } as any;
      return next();
    }
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const auth = getAdminAuth();
      if (auth) {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
      }
    } catch (error) {
      console.warn('Optional auth token invalid:', error);
    }
  }
  next();
};
