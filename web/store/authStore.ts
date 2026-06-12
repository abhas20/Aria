import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type HealthConcern = "pcos" | "menopause" | "mental_health" | "general";
export type Language = "en" | "hi";

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  dateOfBirth: string | null; 
  createdAt?: string;
  healthConcerns: HealthConcern[];
  preferredLanguage: Language;
  onboardingComplete: boolean;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  setToken: (token: string) => void;
  setUser: (user: UserProfile) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: true,

      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "aria-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? sessionStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      partialize: () => ({}), 
    },
  ),
);
