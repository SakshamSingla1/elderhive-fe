import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { ColorThemeStatusEnum } from "../utils/enums";
import { useColorThemeService } from "./useColorThemeService";
import type { ColorThemePayload } from "./useColorThemeService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useColorThemeService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getColorTheme hits GET /api/v1/color-themes with page/size defaults and no filters", async () => {
    const { result } = renderHook(() => useColorThemeService());
    await result.current.getColorTheme();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/color-themes", null, {
      params: { page: 0, size: 50, search: undefined, status: undefined },
    });
  });

  it("getColorTheme passes search/status through as query params", async () => {
    const { result } = renderHook(() => useColorThemeService());
    await result.current.getColorTheme({ search: "forest", status: ColorThemeStatusEnum.ACTIVE, page: 1, size: 10 });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/color-themes", null, {
      params: { page: 1, size: 10, search: "forest", status: ColorThemeStatusEnum.ACTIVE },
    });
  });

  it("getColorThemeById hits GET /api/v1/color-themes/:id", async () => {
    const { result } = renderHook(() => useColorThemeService());
    await result.current.getColorThemeById(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/color-themes/5");
  });

  it("createColorTheme posts the exact payload to /api/v1/color-themes", async () => {
    const { result } = renderHook(() => useColorThemeService());
    const payload: ColorThemePayload = {
      themeName: "Forest Green",
      palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] },
      status: ColorThemeStatusEnum.ACTIVE,
    };
    await result.current.createColorTheme(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/color-themes", payload);
  });

  it("updateColorTheme puts to /api/v1/color-themes/:id with the id substituted", async () => {
    const { result } = renderHook(() => useColorThemeService());
    const payload: ColorThemePayload = { themeName: "Renamed" };
    await result.current.updateColorTheme(5, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/color-themes/5", payload);
  });

  it("deleteColorTheme deletes /api/v1/color-themes/:id", async () => {
    const { result } = renderHook(() => useColorThemeService());
    await result.current.deleteColorTheme(5);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/color-themes/5");
  });
});
