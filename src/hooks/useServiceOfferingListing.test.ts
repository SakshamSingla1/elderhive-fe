import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceOfferingService } from "../services/useServiceOfferingService";
import { ServiceOfferingStatusEnum } from "../utils/enums";
import { useServiceOfferingListing } from "./useServiceOfferingListing";

vi.mock("../services/useServiceOfferingService", () => ({
  useServiceOfferingService: vi.fn(),
}));

const mockedUseServiceOfferingService = vi.mocked(useServiceOfferingService);

function mockService(overrides: Partial<ReturnType<typeof useServiceOfferingService>> = {}) {
  const service = {
    getServiceOfferings: vi.fn().mockResolvedValue({
      content: [{ id: 1, name: "Weekly Temple Visit", categoryId: 1, status: "ACTIVE" }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 9,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }),
    getServiceOfferingById: vi.fn(),
    createServiceOffering: vi.fn(),
    updateServiceOffering: vi.fn(),
    deleteServiceOffering: vi.fn(),
    ...overrides,
  };
  mockedUseServiceOfferingService.mockReturnValue(service);
  return service;
}

describe("useServiceOfferingListing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches page 0 on mount with no category/status filter and exposes the result", async () => {
    const service = mockService();
    const { result } = renderHook(() => useServiceOfferingListing());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(service.getServiceOfferings).toHaveBeenCalledWith({ page: 0, size: 9, categoryId: undefined, status: undefined });
    expect(result.current.serviceOfferings).toHaveLength(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.loadError).toBeNull();
    expect(result.current.categoryId).toBeNull();
  });

  it("passes a fixed statusFilter through on every fetch", async () => {
    const service = mockService();
    renderHook(() => useServiceOfferingListing(ServiceOfferingStatusEnum.ACTIVE));

    await waitFor(() =>
      expect(service.getServiceOfferings).toHaveBeenCalledWith({
        page: 0,
        size: 9,
        categoryId: undefined,
        status: ServiceOfferingStatusEnum.ACTIVE,
      })
    );
  });

  it("setCategoryId refetches with the category filter and resets to page 0", async () => {
    const service = mockService();
    const { result } = renderHook(() => useServiceOfferingListing());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(1));
    await waitFor(() => expect(service.getServiceOfferings).toHaveBeenLastCalledWith({ page: 1, size: 9, categoryId: undefined, status: undefined }));

    act(() => result.current.setCategoryId(3));

    await waitFor(() =>
      expect(service.getServiceOfferings).toHaveBeenLastCalledWith({ page: 0, size: 9, categoryId: 3, status: undefined })
    );
    expect(result.current.categoryId).toBe(3);
    expect(result.current.page).toBe(0);
  });

  it("surfaces a load error", async () => {
    mockService({ getServiceOfferings: vi.fn().mockRejectedValue(new Error("network down")) });
    const { result } = renderHook(() => useServiceOfferingListing());

    await waitFor(() => expect(result.current.loadError).toBe("network down"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.serviceOfferings).toEqual([]);
  });

  it("refetch() re-runs the fetch for the current page and category", async () => {
    const getServiceOfferings = vi.fn().mockResolvedValue({
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
    mockService({ getServiceOfferings });
    const { result } = renderHook(() => useServiceOfferingListing());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    getServiceOfferings.mockClear();

    act(() => result.current.refetch());

    await waitFor(() => expect(getServiceOfferings).toHaveBeenCalledTimes(1));
    expect(getServiceOfferings).toHaveBeenCalledWith({ page: 0, size: 9, categoryId: undefined, status: undefined });
  });
});
