"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuthStore, UserProfile } from "@/store/authStore";
import api from "@/lib/api";

function mapUserProfile(data: Record<string, unknown>): UserProfile {
  return {
    id: data.id as string,
    firebaseUid: data.firebase_uid as string,
    email: (data.email as string) ?? null,
    name: (data.name as string) ?? null,
    dateOfBirth: (data.date_of_birth as string) ?? null,
    healthConcerns:
      (data.health_concerns as UserProfile["healthConcerns"]) ?? [],
    preferredLanguage:
      (data.preferred_language as UserProfile["preferredLanguage"]) ?? "en",
    onboardingComplete: data.onboarding_complete as boolean,
  };
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          clearAuth();
          setLoading(false);
          return;
        }

        try {
          // User is signed in — fetch their profile from backend
          // api.ts interceptor auto-injects the Firebase token
          const { data } = await api.get("/auth/me");
          setUser(mapUserProfile(data));
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response
            ?.status;
          if (status === 404) {
            try {
              const token = await firebaseUser.getIdToken();
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              const data = await res.json();
              setUser(mapUserProfile(data));
            } catch {
              clearAuth();
            }
          } else {
            clearAuth();
          }
        } finally {
          setLoading(false);
        }
      },
    );

    return () => unsubscribe();
  }, [setUser, setLoading, clearAuth]);

  return <>{children}</>;
}
