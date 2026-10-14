import { useMemo } from "react";
import { request } from ".";
import type { UserStatusEnum, UserTypeEnum } from "../utils/enums";

const AUTH_URLS = {
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  REFRESH: "/auth/refresh",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
};

// Mirrors com.elderhive.dtos.Authentication.RegisterRequest field-for-field.
export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  userType: UserTypeEnum;
}

// Mirrors com.elderhive.dtos.Authentication.RegisterResponse field-for-field.
export interface RegisterResponse {
  id: number;
  email: string;
  fullName: string;
  userType: UserTypeEnum;
  status: UserStatusEnum;
}

// Mirrors com.elderhive.dtos.Authentication.LoginResponse field-for-field — deliberately
// no tokens here, since both are set as httpOnly cookies by the backend instead (see
// AuthController#setAuthCookies), never readable from or returned to JS.
export interface LoginResponse {
  id: number;
  email: string;
  userType: UserTypeEnum;
  roles: UserTypeEnum[];
}

export const useAuthService = () => {
  return useMemo(
    () => ({
      register: (payload: RegisterRequest) => request<RegisterResponse>("POST", AUTH_URLS.REGISTER, payload),
      login: (email: string, password: string) =>
        request<LoginResponse>("POST", AUTH_URLS.LOGIN, { email, password }),
      logout: () => request<void>("POST", AUTH_URLS.LOGOUT),
      // No body - the backend reads the refresh token from the httpOnly "refreshToken"
      // cookie, not the request payload (see AuthController#refresh). This same shape is
      // also exactly what services/index.ts's interceptor itself calls directly on a 401,
      // bypassing this hook entirely - that call site can't use a React hook anyway.
      refresh: () => request<void>("POST", AUTH_URLS.REFRESH),
      forgotPassword: (email: string) => request<string>("POST", AUTH_URLS.FORGOT_PASSWORD, { email }),
      resetPassword: (token: string, newPassword: string) =>
        request<string>("POST", AUTH_URLS.RESET_PASSWORD, { token, newPassword }),
    }),
    []
  );
};
