import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { UserTypeEnum } from "../utils/enums";
import { useAuthService } from "../services/useAuthService";
import type { LoginResponse } from "../services/useAuthService";

const STORAGE_KEY = "elderhive_user";

export interface AuthenticatedUser {
  id: number;
  email: string;
  // The account's current primary role - same value the backend's own User entity
  // javadoc calls "the single PRIMARY role (which of the 5 portals this account logs
  // into)". Kept under the backend's own field name here...
  userType: UserTypeEnum;
  // ...and exposed again under this name for route guards / portal-switching logic,
  // which read "primary role" far more naturally than "user type" - same value as
  // `userType` above, never a separate source of truth.
  primaryRole: UserTypeEnum;
  // Every role this account holds (multi-role support via UserRoleMapping, Phase 2
  // backend) - `userType`/`primaryRole` above is just whichever of these is current.
  roles: UserTypeEnum[];
}

export interface AuthenticatedUserContextType {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  /**
   * Re-validates the session against the server by calling POST /auth/refresh (the
   * access/refresh token cookies are httpOnly, so this round trip is the ONLY way to
   * find out whether a cached session is still alive - there's nothing readable from
   * JS to check locally). The endpoint itself returns no user payload (see
   * AuthServiceImpl#refresh), so on success this keeps whatever user is already cached
   * rather than rehydrating it from the response; there's no GET /users/me endpoint
   * yet (a later phase) to refetch full profile data from. On failure, clears the
   * local user - the session is genuinely gone.
   */
  refreshFromServer: () => Promise<AuthenticatedUser | null>;
}

const defaultContextValue: AuthenticatedUserContextType = {
  user: null,
  isLoading: false,
  login: async () => {
    throw new Error("AuthenticatedUserProvider is missing from the component tree");
  },
  logout: async () => {},
  refreshFromServer: async () => null,
};

export const AuthenticatedUserContext = createContext<AuthenticatedUserContextType>(defaultContextValue);

function toAuthenticatedUser(response: LoginResponse): AuthenticatedUser {
  return {
    id: response.id,
    email: response.email,
    userType: response.userType,
    primaryRole: response.userType,
    roles: response.roles,
  };
}

function readCachedUser(): AuthenticatedUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthenticatedUser) : null;
  } catch {
    return null;
  }
}

export const AuthenticatedUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authService = useAuthService();
  const [user, setUser] = useState<AuthenticatedUser | null>(readCachedUser);
  // Starts true only when there's a cached user whose session still needs validating
  // against the server on mount - an anonymous visitor has nothing to resolve, so
  // there's no loading state to show them.
  const [isLoading, setIsLoading] = useState<boolean>(() => readCachedUser() !== null);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const refreshFromServer = useCallback(async (): Promise<AuthenticatedUser | null> => {
    setIsLoading(true);
    try {
      await authService.refresh();
      setIsLoading(false);
      // Success just confirms the existing session is still valid - see this method's
      // own doc comment above for why there's no response payload to rehydrate from.
      return user;
    } catch (error) {
      setUser(null);
      setIsLoading(false);
      throw error;
    }
    // `user` is a real dependency, not an oversight - this must return the CURRENT
    // cached user, not whichever one was in scope when this callback was first
    // created, or a refresh called after a later login() would return a stale value.
  }, [authService, user]);

  // On mount, a cached user from a previous session is only a CLAIM until the server
  // confirms it - silently re-validate once here rather than trusting localStorage, so
  // a session that actually expired while the tab was closed doesn't look logged-in
  // until the first API call happens to 401.
  useEffect(() => {
    if (readCachedUser()) {
      refreshFromServer().catch(() => {
        // Session genuinely expired - refreshFromServer already cleared the user.
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthenticatedUser> => {
      setIsLoading(true);
      try {
        const response = await authService.login(email, password);
        const authenticatedUser = toAuthenticatedUser(response);
        setUser(authenticatedUser);
        return authenticatedUser;
      } finally {
        setIsLoading(false);
      }
    },
    [authService]
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Best-effort only - a network/server-side failure here must not prevent the
      // local session from clearing.
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, [authService]);

  const value: AuthenticatedUserContextType = {
    user,
    isLoading,
    login,
    logout,
    refreshFromServer,
  };

  return <AuthenticatedUserContext.Provider value={value}>{children}</AuthenticatedUserContext.Provider>;
};

export const useAuthenticatedUser = (): AuthenticatedUserContextType => useContext(AuthenticatedUserContext);
