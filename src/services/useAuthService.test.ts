import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { UserTypeEnum } from "../utils/enums";
import { useAuthService } from "./useAuthService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useAuthService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("is memoized across re-renders (useMemo with an empty dependency array)", () => {
    const { result, rerender } = renderHook(() => useAuthService());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("register posts to /auth/register with the exact payload", async () => {
    const { result } = renderHook(() => useAuthService());
    const payload = {
      email: "elder@example.com",
      password: "strongpass123",
      fullName: "Test Elder",
      phone: "9000000000",
      userType: UserTypeEnum.ELDER,
    };

    await result.current.register(payload);

    expect(mockedRequest).toHaveBeenCalledWith("POST", "/auth/register", payload);
  });

  it("login posts to /auth/login with email and password only", async () => {
    const { result } = renderHook(() => useAuthService());

    await result.current.login("elder@example.com", "strongpass123");

    expect(mockedRequest).toHaveBeenCalledWith("POST", "/auth/login", {
      email: "elder@example.com",
      password: "strongpass123",
    });
  });

  it("logout posts to /auth/logout with no body", async () => {
    const { result } = renderHook(() => useAuthService());

    await result.current.logout();

    expect(mockedRequest).toHaveBeenCalledWith("POST", "/auth/logout");
  });

  it("refresh posts to /auth/refresh with no body", async () => {
    const { result } = renderHook(() => useAuthService());

    await result.current.refresh();

    expect(mockedRequest).toHaveBeenCalledWith("POST", "/auth/refresh");
  });

  it("forgotPassword posts to /auth/forgot-password with just the email", async () => {
    const { result } = renderHook(() => useAuthService());

    await result.current.forgotPassword("elder@example.com");

    expect(mockedRequest).toHaveBeenCalledWith("POST", "/auth/forgot-password", {
      email: "elder@example.com",
    });
  });

  it("resetPassword posts to /auth/reset-password with the token and new password", async () => {
    const { result } = renderHook(() => useAuthService());

    await result.current.resetPassword("some-token", "newpassword456");

    expect(mockedRequest).toHaveBeenCalledWith("POST", "/auth/reset-password", {
      token: "some-token",
      newPassword: "newpassword456",
    });
  });
});
