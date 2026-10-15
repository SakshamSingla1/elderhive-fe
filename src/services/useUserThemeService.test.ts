import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useUserThemeService } from "./useUserThemeService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useUserThemeService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getActiveTheme hits GET /api/v1/user-themes with no id - the backend resolves the caller from the JWT", async () => {
    const { result } = renderHook(() => useUserThemeService());
    await result.current.getActiveTheme();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/user-themes");
  });

  it("setActiveTheme posts { themeId } to /api/v1/user-themes", async () => {
    const { result } = renderHook(() => useUserThemeService());
    await result.current.setActiveTheme(7);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/user-themes", { themeId: 7 });
  });

  it("resetTheme deletes /api/v1/user-themes", async () => {
    const { result } = renderHook(() => useUserThemeService());
    await result.current.resetTheme();
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/user-themes");
  });

  it("getUsersByTheme hits GET /api/v1/user-themes/theme/:themeId", async () => {
    const { result } = renderHook(() => useUserThemeService());
    await result.current.getUsersByTheme(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/user-themes/theme/7");
  });

  it("countUsersByTheme hits GET /api/v1/user-themes/theme/:themeId/count", async () => {
    const { result } = renderHook(() => useUserThemeService());
    await result.current.countUsersByTheme(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/user-themes/theme/7/count");
  });
});
