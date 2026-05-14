import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

// ── Request interceptor — inject Firebase ID token ──────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      try {
        const { getAuthToken } = await import("@/lib/firebase");
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // No token available — request proceeds without auth header
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — handle 401 (session expiry) ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const { useAuthStore } = await import("@/store/authStore");
      useAuthStore.getState().clearAuth();
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  },
);

export default api;
