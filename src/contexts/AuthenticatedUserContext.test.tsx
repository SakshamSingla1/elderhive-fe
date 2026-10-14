import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserTypeEnum } from "../utils/enums";
import { useAuthService } from "../services/useAuthService";
import { AuthenticatedUserProvider, useAuthenticatedUser } from "./AuthenticatedUserContext";

vi.mock("../services/useAuthService", () => ({
  useAuthService: vi.fn(),
}));

const mockedUseAuthService = vi.mocked(useAuthService);

const STORAGE_KEY = "elderhive_user";

const loginResponse = {
  id: 42,
  email: "elder@example.com",
  userType: UserTypeEnum.ELDER,
  roles: [UserTypeEnum.ELDER],
};

function mockAuthService(overrides: Partial<ReturnType<typeof useAuthService>> = {}) {
  const authService = {
    register: vi.fn(),
    login: vi.fn().mockResolvedValue(loginResponse),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  };
  mockedUseAuthService.mockReturnValue(authService);
  return authService;
}

describe("AuthenticatedUserContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with no user and isLoading=false when nothing is cached, and never calls refresh", async () => {
    const authService = mockAuthService();

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper: AuthenticatedUserProvider });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    await act(async () => {});
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it("re-validates a cached user against the server on mount, starting isLoading=true until it resolves", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: 42, email: "elder@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] })
    );
    const authService = mockAuthService();

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper: AuthenticatedUserProvider });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(result.current.user?.id).toBe(42);
  });

  it("clears the cached user if the mount-time refresh fails (the session genuinely expired)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: 42, email: "elder@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] })
    );
    mockAuthService({ refresh: vi.fn().mockRejectedValue(new Error("token invalid")) });

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper: AuthenticatedUserProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("login() stores the user with primaryRole mirroring userType, and persists it to localStorage", async () => {
    mockAuthService();

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper: AuthenticatedUserProvider });

    let returned;
    await act(async () => {
      returned = await result.current.login("elder@example.com", "strongpass123");
    });

    expect(returned).toEqual({
      id: 42,
      email: "elder@example.com",
      userType: UserTypeEnum.ELDER,
      primaryRole: UserTypeEnum.ELDER,
      roles: [UserTypeEnum.ELDER],
    });
    expect(result.current.user).toEqual(returned);
    expect(result.current.isLoading).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(returned);
  });

  it("logout() clears the user and localStorage even when the server call fails", async () => {
    const authService = mockAuthService({ logout: vi.fn().mockRejectedValue(new Error("network error")) });

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper: AuthenticatedUserProvider });

    await act(async () => {
      await result.current.login("elder@example.com", "strongpass123");
    });
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("refreshFromServer() returns the CURRENT user, not a stale one captured before a later login (regression test)", async () => {
    mockAuthService();

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper: AuthenticatedUserProvider });

    // No user yet - refreshFromServer still succeeds (refresh() itself is mocked to
    // resolve) but there's nothing cached to return.
    let firstRefreshResult;
    await act(async () => {
      firstRefreshResult = await result.current.refreshFromServer();
    });
    expect(firstRefreshResult).toBeNull();

    await act(async () => {
      await result.current.login("elder@example.com", "strongpass123");
    });

    let secondRefreshResult;
    await act(async () => {
      secondRefreshResult = await result.current.refreshFromServer();
    });

    // Must reflect the user set by the login that happened AFTER the first
    // refreshFromServer call - a stale closure over the pre-login `user` would
    // incorrectly return null here instead.
    expect(secondRefreshResult).toEqual(result.current.user);
    expect(secondRefreshResult).not.toBeNull();
  });
});
