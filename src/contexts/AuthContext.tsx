"use client";

import {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from "react";
import {
  User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, googleProvider, appleProvider } from "@/lib/firebase";

interface Company { id: number; name: string; plan: string; subscriptionStatus: string }

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchCompany = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/companies?ownerId=${uid}`);
      const data = await res.json();
      setCompany(data.company ?? null);
      return data.company ?? null;
    } catch {
      setCompany(null);
      return null;
    }
  }, []);

  const refreshCompany = useCallback(async () => {
    if (user) await fetchCompany(user.uid);
  }, [user, fetchCompany]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const co = await fetchCompany(u.uid);
        if (!co && typeof window !== "undefined" && !window.location.pathname.startsWith("/onboarding")) {
          router.push("/onboarding");
        }
      } else {
        setCompany(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchCompany, router]);

  const afterSignIn = async (u: User) => {
    const co = await fetchCompany(u.uid);
    if (!co) router.push("/onboarding");
    else router.push("/dashboard");
  };

  const signInWithGoogle = async () => {
    const r = await signInWithPopup(auth, googleProvider);
    await afterSignIn(r.user);
  };

  const signInWithApple = async () => {
    const r = await signInWithPopup(auth, appleProvider);
    await afterSignIn(r.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const r = await signInWithEmailAndPassword(auth, email, password);
    await afterSignIn(r.user);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const r = await createUserWithEmailAndPassword(auth, email, password);
    await afterSignIn(r.user);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setCompany(null);
    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider value={{
      user, company, loading,
      signInWithGoogle, signInWithApple,
      signInWithEmail, signUpWithEmail,
      signOut, refreshCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
