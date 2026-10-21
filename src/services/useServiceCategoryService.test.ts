import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { ServiceCategoryStatusEnum } from "../utils/enums";
import { useServiceCategoryService } from "./useServiceCategoryService";
import type { ServiceCategoryPayload } from "./useServiceCategoryService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useServiceCategoryService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getServiceCategories hits GET /api/v1/service-categories with page/size defaults and no status filter", async () => {
    const { result } = renderHook(() => useServiceCategoryService());
    await result.current.getServiceCategories();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/service-categories", null, {
      params: { page: 0, size: 50, status: undefined },
    });
  });

  it("getServiceCategories passes status through as a query param", async () => {
    const { result } = renderHook(() => useServiceCategoryService());
    await result.current.getServiceCategories({ status: ServiceCategoryStatusEnum.ACTIVE, page: 1, size: 10 });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/service-categories", null, {
      params: { page: 1, size: 10, status: ServiceCategoryStatusEnum.ACTIVE },
    });
  });

  it("getServiceCategoryById hits GET /api/v1/service-categories/:id", async () => {
    const { result } = renderHook(() => useServiceCategoryService());
    await result.current.getServiceCategoryById(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/service-categories/5");
  });

  it("createServiceCategory posts the exact payload to /api/v1/service-categories", async () => {
    const { result } = renderHook(() => useServiceCategoryService());
    const payload: ServiceCategoryPayload = { name: "Overnight Care", description: "desc", icon: "moon" };
    await result.current.createServiceCategory(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/service-categories", payload);
  });

  it("updateServiceCategory puts to /api/v1/service-categories/:id with the id substituted", async () => {
    const { result } = renderHook(() => useServiceCategoryService());
    const payload: ServiceCategoryPayload = { name: "Renamed" };
    await result.current.updateServiceCategory(5, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/service-categories/5", payload);
  });

  it("deleteServiceCategory deletes /api/v1/service-categories/:id", async () => {
    const { result } = renderHook(() => useServiceCategoryService());
    await result.current.deleteServiceCategory(5);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/service-categories/5");
  });
});
