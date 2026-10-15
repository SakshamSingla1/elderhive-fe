import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColorThemeService } from "../services/useColorThemeService";
import { useColorThemeListing } from "./useColorThemeListing";

vi.mock("../services/useColorThemeService", () => ({
  useColorThemeService: vi.fn(),
}));

const mockedUseColorThemeService = vi.mocked(useColorThemeService);

function mockService(overrides: Partial<ReturnType<typeof useColorThemeService>> = {}) {
  const service = {
    getColorTheme: vi.fn().mockResolvedValue({
      content: [{ id: 1, themeName: "Forest Green", status: "ACTIVE", palette: { colorGroups: [] } }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 9,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }),
    getColorThemeById: vi.fn(),
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn(),
    deleteColorTheme: vi.fn(),
    ...overrides,
  };
  mockedUseColorThemeService.mockReturnValue(service);
  return service;
}

describe("useColorThemeListing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches page 0 on mount and exposes the result", async () => {
    const service = mockService();
    const { result } = renderHook(() => useColorThemeListing());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(service.getColorTheme).toHaveBeenCalledWith({ page: 0, size: 9 });
    expect(result.current.colorThemes).toHaveLength(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.loadError).toBeNull();
  });

  it("refetches with the new page when setPage is called", async () => {
    const service = mockService();
    const { result } = renderHook(() => useColorThemeListing());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(1));

    await waitFor(() => expect(service.getColorTheme).toHaveBeenLastCalledWith({ page: 1, size: 9 }));
  });

  it("respects a custom page size", async () => {
    const service = mockService();
    renderHook(() => useColorThemeListing(24));

    await waitFor(() => expect(service.getColorTheme).toHaveBeenCalledWith({ page: 0, size: 24 }));
  });

  it("surfaces a load error and clears colorThemes/totalPages state is unaffected by it", async () => {
    mockService({ getColorTheme: vi.fn().mockRejectedValue(new Error("network down")) });
    const { result } = renderHook(() => useColorThemeListing());

    await waitFor(() => expect(result.current.loadError).toBe("network down"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.colorThemes).toEqual([]);
  });

  it("refetch() re-runs the fetch for the current page", async () => {
    const getColorTheme = vi.fn().mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 9,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    });
    mockService({ getColorTheme });
    const { result } = renderHook(() => useColorThemeListing());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    getColorTheme.mockClear();

    act(() => result.current.refetch());

    await waitFor(() => expect(getColorTheme).toHaveBeenCalledTimes(1));
    expect(getColorTheme).toHaveBeenCalledWith({ page: 0, size: 9 });
  });
});
