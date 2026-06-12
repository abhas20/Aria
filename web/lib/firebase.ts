import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
} from "firebase/auth";
import { useAuthStore, UserProfile } from "@/store/authStore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseAuth: Auth = getAuth(firebaseApp);

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

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

async function handleSuccessfulSignIn(
  credential: UserCredential,
): Promise<void> {
  const token = await credential.user.getIdToken();

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

  if (!res.ok) {
    throw new Error(`Auth verify failed: ${res.status}`);
  }

  const data = await res.json();
  useAuthStore.getState().setUser(mapUserProfile(data));

  // Write authentication cookie for Next.js middleware
  if (typeof window !== "undefined") {
    document.cookie = "aria-auth=true; path=/; max-age=31536000; SameSite=Lax";
  }
}

// ---------------------------------------------------------------------------
// Public auth functions
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(firebaseAuth, provider);
  await handleSuccessfulSignIn(credential);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );
  await handleSuccessfulSignIn(credential);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
  useAuthStore.getState().clearAuth();

  // Clear authentication cookie for Next.js middleware
  if (typeof window !== "undefined") {
    document.cookie = "aria-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
}

export async function getAuthToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken(); // Firebase auto-refreshes if expired
}

export default firebaseApp;
