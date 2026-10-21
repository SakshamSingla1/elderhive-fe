import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../services/useServiceCategoryService";
import { useServiceCategoryListing } from "./useServiceCategoryListing";

vi.mock("../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);

function mockService(overrides: Partial<ReturnType<typeof useServiceCategoryService>> = {}) {
  const service = {
    getServiceCategories: vi.fn().mockResolvedValue({
      content: [{ id: 1, name: "Temple Visit", status: "ACTIVE" }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 9,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }),
    getServiceCategoryById: vi.fn(),
    createServiceCategory: vi.fn(),
    updateServiceCategory: vi.fn(),
    deleteServiceCategory: vi.fn(),
    ...overrides,
  };
  mockedUseServiceCategoryService.mockReturnValue(service);
  return service;
}

describe("useServiceCategoryListing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches page 0 on mount and exposes the result", async () => {
    const service = mockService();
    const { result } = renderHook(() => useServiceCategoryListing());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(service.getServiceCategories).toHaveBeenCalledWith({ page: 0, size: 9 });
    expect(result.current.serviceCategories).toHaveLength(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.loadError).toBeNull();
  });

  it("refetches with the new page when setPage is called", async () => {
    const service = mockService();
    const { result } = renderHook(() => useServiceCategoryListing());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(1));

    await waitFor(() => expect(service.getServiceCategories).toHaveBeenLastCalledWith({ page: 1, size: 9 }));
  });

  it("surfaces a load error", async () => {
    mockService({ getServiceCategories: vi.fn().mockRejectedValue(new Error("network down")) });
    const { result } = renderHook(() => useServiceCategoryListing());

    await waitFor(() => expect(result.current.loadError).toBe("network down"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.serviceCategories).toEqual([]);
  });

  it("refetch() re-runs the fetch for the current page", async () => {
    const getServiceCategories = vi.fn().mockResolvedValue({
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
    mockService({ getServiceCategories });
    const { result } = renderHook(() => useServiceCategoryListing());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    getServiceCategories.mockClear();

    act(() => result.current.refetch());

    await waitFor(() => expect(getServiceCategories).toHaveBeenCalledTimes(1));
    expect(getServiceCategories).toHaveBeenCalledWith({ page: 0, size: 9 });
  });
});
