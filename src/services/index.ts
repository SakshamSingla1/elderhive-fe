import axios, { type AxiosRequestConfig, type Method } from "axios";
import type { ApiEnvelope } from "../utils/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// The backend issues BOTH tokens as httpOnly cookies on login (see AuthController's
// setAuthCookies, Phase 2 Prompt 16) and its JwtAuthFilter reads the access token ONLY
// from the "accessToken" cookie — never an Authorization header (that's a deliberate
// ElderHive deviation from ElderSphere's JwtAuthFilter, which accepts a Bearer header
// too). So there is nothing for this client to attach manually: every request just needs
// withCredentials so the browser sends the cookies, and the tokens are never readable
// from JS anyway since they're httpOnly. CORS on the backend has allowCredentials(true)
// for the configured frontend origin (SecurityConfig's corsConfigurationSource), so this
// works cross-port in local dev (Vite on 5173, API on 8080).
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

const notifySubscribers = (ok: boolean) => {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
};

// Every path under AuthController (Phase 2) that's reachable without a valid access
// token — SecurityConfig permits all of "/auth/**", so none of these can ever
// legitimately 401 for "token expired" reasons, and none should ever trigger (or be
// retried after) a refresh. /auth/logout is included here — ElderSphere's equivalent
// list omits it, but ElderHive's logout endpoint is just as public, so a stray 401 from
// it must never kick off a refresh loop either.
const AUTH_FREE_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | null;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthFreePath = AUTH_FREE_PATHS.some((p) => requestUrl.includes(p));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthFreePath) {
      if (isRefreshing) {
        // A refresh is already in flight for some other request that hit 401 first —
        // queue this one rather than firing a second concurrent /auth/refresh call
        // (which would race RefreshTokenServiceImpl's rotate-the-old-token-and-issue-
        // a-new-one logic and revoke the very token the other request is about to use).
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((ok) => (ok ? resolve(apiClient(originalRequest)) : reject(error)));
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        // Via plain axios, not apiClient, so this call never re-enters this same
        // interceptor — AUTH_FREE_PATHS above is the defense for every OTHER call site
        // that might hit apiClient.post("/auth/refresh", ...) directly.
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        isRefreshing = false;
        notifySubscribers(true);
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        notifySubscribers(false);
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login?auth=expired";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Calls the backend and unwraps com.elderhive.payload.ResponseModel<T> (Phase 1, Prompt 5)
 * down to just `T`. Throws the original axios error on failure so callers can read
 * `err.response?.data?.message` (the human-readable message GlobalExceptionHandler always
 * sets) and `err.response?.data?.errorCode` (one of enums.ExceptionCodeEnum's values).
 */
export async function request<T = unknown>(
  method: Method,
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request<ApiEnvelope<T>>({
    method,
    url,
    data,
    ...config,
  });
  return response.data.data;
}
