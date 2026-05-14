import { create } from "zustand";

interface User {
  uid:          string;
  email:        string | null;
  displayName:  string | null;
  photoURL:     string | null;
}

interface Company {
  id:          number;
  name:        string;
  plan:        string;
  ownerId:     string;
  accountType?: string;
}

export type UserRole = "homeowner" | "employee" | "employer";

interface AppState {
  user:                      User | null;
  company:                   Company | null;
  idToken:                   string | null;
  role:                      UserRole | null;
  isInitializing:            boolean;
  // Lightning safety settings
  lightningAlertsEnabled:    boolean;
  lightningRadiusMiles:      number;
  setUser:                   (user: User | null) => void;
  setCompany:                (company: Company | null) => void;
  setIdToken:                (token: string | null) => void;
  setRole:                   (role: UserRole | null) => void;
  setInitializing:           (v: boolean) => void;
  setLightningAlertsEnabled: (v: boolean) => void;
  setLightningRadiusMiles:   (v: number) => void;
  clear:                     () => void;
}

export const useStore = create<AppState>((set) => ({
  user:                      null,
  company:                   null,
  idToken:                   null,
  role:                      null,
  isInitializing:            true,
  lightningAlertsEnabled:    true,   // on by default for safety
  lightningRadiusMiles:      5,
  setUser:                   (user)    => set({ user }),
  setCompany:                (company) => set({ company }),
  setIdToken:                (idToken) => set({ idToken }),
  setRole:                   (role)    => set({ role }),
  setInitializing:           (v)       => set({ isInitializing: v }),
  setLightningAlertsEnabled: (v)       => set({ lightningAlertsEnabled: v }),
  setLightningRadiusMiles:   (v)       => set({ lightningRadiusMiles: v }),
  clear:                     ()        => set({ user: null, company: null, idToken: null, role: null }),
}));
