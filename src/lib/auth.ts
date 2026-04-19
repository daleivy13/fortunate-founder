import { NextRequest } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK (server-side only)
function getFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // In development without admin credentials, skip verification
    console.warn("[auth] Firebase Admin not configured — API routes are unprotected. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to .env.local");
    return null;
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export interface AuthResult {
  uid:       string;
  email:     string | undefined;
  verified:  boolean;
}

export async function verifyFirebaseToken(req: NextRequest): Promise<AuthResult | null> {
  const app = getFirebaseAdmin();

  // If admin not configured (dev mode), extract uid from header for basic auth
  if (!app) {
    const uid = req.headers.get("x-user-uid");
    if (!uid) return null;
    return { uid, email: undefined, verified: false };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, verified: true };
  } catch (err) {
    console.error("[auth] Token verification failed:", err);
    return null;
  }
}

// Helper — use in API routes that require auth
export async function requireAuth(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) {
    return { auth: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { auth, error: null };
}
