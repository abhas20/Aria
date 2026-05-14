"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  useAuthStore,
  HealthConcern,
  Language,
  UserProfile,
} from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingPayload {
  name: string;
  date_of_birth: string;
  health_concerns: HealthConcern[]; 
  preferred_language: Language;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_CONCERNS: {
  value: HealthConcern;
  label: string;
  description: string;
}[] = [
  { value: "pcos", label: "PCOS", description: "Hormonal & cycle health" },
  {
    value: "menopause",
    label: "Menopause",
    description: "Perimenopause & beyond",
  },
  {
    value: "mental_health",
    label: "Mental health",
    description: "Stress, mood & anxiety",
  },
  {
    value: "general",
    label: "General wellness",
    description: "Overall health & fitness",
  },
];

const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "hi", label: "Hindi", native: "हिंदी" },
];

const STEPS = ["About you", "Your health", "Language"];

// ── Mapper ───────────────────────────────────────────

function mapUserProfile(data: Record<string, unknown>): UserProfile {
  return {
    id: data.id as string,
    firebaseUid: data.firebase_uid as string,
    email: (data.email as string) ?? null,
    name: (data.name as string) ?? null,
    dateOfBirth: (data.date_of_birth as string) ?? null,
    healthConcerns: (data.health_concerns as HealthConcern[]) ?? [],
    preferredLanguage: (data.preferred_language as Language) ?? "en",
    onboardingComplete: data.onboarding_complete as boolean,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [healthConcerns, setHealthConcerns] = useState<HealthConcern[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Multi-select toggle ───────────────────────────────────────────────────

  function toggleConcern(value: HealthConcern) {
    setHealthConcerns((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  }

  // ── Validation per step ───────────────────────────────────────────────────

  function validateStep(): string | null {
    if (step === 0) {
      if (!name.trim()) return "Please enter your name.";
      if (!dateOfBirth) return "Please enter your date of birth.";
      const age = getAge(dateOfBirth);
      if (age < 10 || age > 120) return "Please enter a valid date of birth.";
    }
    if (step === 1) {
      if (healthConcerns.length === 0)
        return "Please select at least one health concern.";
    }
    return null;
  }

  function getAge(dob: string): number {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError("");
    setStep((s) => s - 1);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!language) {
      setError("Please select a language.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: OnboardingPayload = {
        name: name.trim(),
        date_of_birth: dateOfBirth,
        health_concerns: healthConcerns,
        preferred_language: language,
      };

      const { data } = await api.post("/auth/onboarding", payload);

      setUser(mapUserProfile(data));

      router.push("/dashboard");
    } catch {
      setError("Could not save your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-rose-500">Aria</h1>
        </div>

        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`h-1 w-full rounded-full transition-colors ${
                      i <= step ? "bg-rose-400" : "bg-rose-100"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      i === step ? "text-rose-500 font-medium" : "text-gray-400"
                    }`}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Step 0: About you ───────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <p className="text-base font-medium text-gray-800 mb-1">
                    What should we call you?
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Aria will use this to personalise your experience.
                  </p>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya"
                    disabled={isLoading}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    autoComplete="bday"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    disabled={isLoading}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* ── Step 1: Health concerns ─────────────────────────────── */}
            {step === 1 && (
              <div>
                <p className="text-base font-medium text-gray-800 mb-1">
                  What brings you to Aria?
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  Select all that apply — you can change this later.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {HEALTH_CONCERNS.map(({ value, label, description }) => {
                    const selected = healthConcerns.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleConcern(value)}
                        disabled={isLoading}
                        className={`text-left p-4 rounded-xl border transition-all disabled:opacity-50 ${
                          selected
                            ? "border-rose-400 bg-rose-50"
                            : "border-gray-200 hover:border-rose-200 hover:bg-rose-50/50"
                        }`}>
                        {/* Checkbox indicator */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center mb-2 ${
                            selected
                              ? "bg-rose-500 border-rose-500"
                              : "border-gray-300"
                          }`}>
                          {selected && (
                            <svg
                              width="10"
                              height="8"
                              viewBox="0 0 10 8"
                              fill="none">
                              <path
                                d="M1 4l3 3 5-6"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <p
                          className={`text-sm font-medium ${selected ? "text-rose-700" : "text-gray-700"}`}>
                          {label}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${selected ? "text-rose-400" : "text-gray-400"}`}>
                          {description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Language ────────────────────────────────────── */}
            {step === 2 && (
              <div>
                <p className="text-base font-medium text-gray-800 mb-1">
                  Which language do you prefer?
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  Aria will respond in this language.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {LANGUAGES.map(({ value, label, native }) => {
                    const selected = language === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLanguage(value)}
                        disabled={isLoading}
                        className={`p-4 rounded-xl border text-center transition-all disabled:opacity-50 ${
                          selected
                            ? "border-rose-400 bg-rose-50"
                            : "border-gray-200 hover:border-rose-200"
                        }`}>
                        <p
                          className={`text-sm font-medium ${selected ? "text-rose-700" : "text-gray-700"}`}>
                          {native}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${selected ? "text-rose-400" : "text-gray-400"}`}>
                          {label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Navigation buttons ──────────────────────────────────── */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                  Back
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 text-sm transition disabled:opacity-50">
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 text-sm transition disabled:opacity-50">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Get started"
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 px-4">
          Aria provides general health information only — not medical advice.
        </p>
      </div>
    </main>
  );
}
