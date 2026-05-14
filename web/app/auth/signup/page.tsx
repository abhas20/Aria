"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { signInWithGoogle } from "@/lib/firebase";
import { useAuthStore, UserProfile } from "@/store/authStore";
import firebaseApp from "@/lib/firebase";

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

export default function SignupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) {
    router.replace(user.onboardingComplete ? "/dashboard" : "/onboarding");
    return null;
  }

  function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    };
    return messages[code] ?? "Something went wrong. Please try again.";
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuth(firebaseApp);
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Set display name in Firebase
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      // Verify with backend
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

      if (!res.ok) throw new Error("Backend verify failed");

      const data = await res.json();
      useAuthStore.getState().setUser(mapUserProfile(data));

      // New user always goes to onboarding
      router.replace("/onboarding");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      const { user } = useAuthStore.getState();
      router.replace(user?.onboardingComplete ? "/dashboard" : "/auth/onboarding");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getErrorMessage(code));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-rose-600">Aria</h1>
          <p className="text-gray-500 mt-1 text-sm">Your AI health companion</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Create your account
          </h2>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6">
            {googleLoading ? (
              <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">
                or sign up with email
              </span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Sharma"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-rose-500 font-medium hover:text-rose-600">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 px-4">
          By creating an account, you agree that Aria provides general health
          information only — not medical advice.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
