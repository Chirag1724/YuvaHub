import { Request, Response, NextFunction } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { dbCommand } from '../api/db.js';
import jwt from 'jsonwebtoken';

let isFirebaseInitialized = false;
let firebaseInitAttempted = false;

// Lazy initialization — runs on first request so .env vars are guaranteed to be loaded
function ensureFirebaseAdminInit() {
  if (firebaseInitAttempted) return;
  firebaseInitAttempted = true;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
      );
      initializeApp({ credential: cert(serviceAccount) });
      isFirebaseInitialized = true;
      console.log('[Auth] Firebase Admin initialized with service account.');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
      isFirebaseInitialized = true;
      console.log('[Auth] Firebase Admin initialized with Project ID (ADC).');
    } else {
      console.warn('[Auth] No Firebase Admin credentials found — using REST API token verification.');
    }
  } catch (error) {
    console.warn('[Auth] Firebase Admin init error — will use REST API fallback:', (error as Error).message);
  }
}

// Extend Request interface to include the user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateUser = (db: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ensure Firebase Admin is initialized on first request (after dotenv loads)
    ensureFirebaseAdminInit();

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid token format',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      let decodedToken: any = null;
      let isCustomToken = false;

      // 1. Try Custom JWT first
      const jwtSecret = process.env.JWT_SECRET || "default_secret_for_development_only";
      try {
        decodedToken = jwt.verify(token, jwtSecret);
        isCustomToken = true;
      } catch (err) {
        // Fallback to Firebase
      }

      // 2. If not a custom token, verify with Firebase
      if (!isCustomToken) {
        if (isFirebaseInitialized) {
          // Firebase Admin SDK available — use it directly
          try {
            decodedToken = await getAuth().verifyIdToken(token);
          } catch (adminErr) {
            // Firebase Admin failed — fall through to REST API verification
            console.warn('[Auth] Firebase Admin verifyIdToken failed, trying REST API fallback...');
          }
        }

        // REST API fallback — works without service account (uses apiKey from firebase-applet-config.json)
        if (!decodedToken) {
          let firebaseApiKey = '';
          try {
            const fs = await import('fs');
            const path = await import('path');
            const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
            if (fs.existsSync(configPath)) {
              const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
              firebaseApiKey = cfg.apiKey || '';
            }
          } catch (_) {}

          if (firebaseApiKey) {
            const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`;
            const verifyRes = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            });
            if (verifyRes.ok) {
              const data = await verifyRes.json();
              const fbUser = data.users?.[0];
              if (fbUser) {
                decodedToken = {
                  uid: fbUser.localId,
                  email: fbUser.email || '',
                  name: fbUser.displayName || '',
                  picture: fbUser.photoUrl || '',
                };
              }
            }
          }

          // Final fallback: try to decode JWT payload without verification (dev only)
          if (!decodedToken && isDevelopment) {
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
                decodedToken = {
                  uid: payload.user_id || payload.sub || '',
                  email: payload.email || '',
                  name: payload.name || '',
                  picture: payload.picture || '',
                };
              }
            } catch (_) {}
          }

          if (!decodedToken) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or unverifiable token' });
          }
        }
      }

      req.user = decodedToken;

      const activeDb = db || dbCommand;

      if (activeDb) {
        try {
          const usersCollection = activeDb.collection('users');

          const userDoc = await usersCollection.findOneAndUpdate(
            { firebaseUid: decodedToken.uid },
            {
              $setOnInsert: {
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || '',
                picture: decodedToken.picture || '',
                created_at: new Date(),
              },
            },
            {
              upsert: true,
              returnDocument: 'after',
            },
          );

          const returnedDoc = userDoc && userDoc.value ? userDoc.value : userDoc;
          if (returnedDoc && returnedDoc.role) {
            req.user.role = returnedDoc.role;
          } else {
            req.user.role = 'student';
          }
        } catch (dbError) {
          console.error(
            '[Auth] Error during JIT user profile creation:',
            dbError,
          );
        }
      }

      next();
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      return res.status(401).json({
        error: 'Unauthorized: Invalid token',
      });
    }
  };
};

export const deleteFirebaseUser = async (uid: string) => {
  if (isFirebaseInitialized) {
    await getAuth().deleteUser(uid);
  } else if (isDevelopment && mockAuthEnabled) {
    console.warn(
      `[Auth] Mock mode: Firebase user ${uid} deletion skipped.`,
    );
  }
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Access denied: No role assigned.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied: Requires one of ${allowedRoles.join(', ')}` });
    }

    next();
  };
};

export const authMiddleware = authenticateUser(dbCommand);
export const adminOnly = authorizeRoles(['admin', 'superadmin']);