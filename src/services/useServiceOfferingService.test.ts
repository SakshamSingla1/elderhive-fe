import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { ServiceOfferingStatusEnum } from "../utils/enums";
import { useServiceOfferingService } from "./useServiceOfferingService";
import type { ServiceOfferingPayload } from "./useServiceOfferingService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useServiceOfferingService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getServiceOfferings hits GET /api/v1/service-offerings with page/size defaults and no filters", async () => {
    const { result } = renderHook(() => useServiceOfferingService());
    await result.current.getServiceOfferings();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/service-offerings", null, {
      params: { page: 0, size: 50, categoryId: undefined, status: undefined },
    });
  });

  it("getServiceOfferings passes categoryId/status through as query params", async () => {
    const { result } = renderHook(() => useServiceOfferingService());
    await result.current.getServiceOfferings({ categoryId: 3, status: ServiceOfferingStatusEnum.ACTIVE, page: 1, size: 10 });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/service-offerings", null, {
      params: { page: 1, size: 10, categoryId: 3, status: ServiceOfferingStatusEnum.ACTIVE },
    });
  });

  it("getServiceOfferingById hits GET /api/v1/service-offerings/:id", async () => {
    const { result } = renderHook(() => useServiceOfferingService());
    await result.current.getServiceOfferingById(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/service-offerings/5");
  });

  it("createServiceOffering posts the exact payload to /api/v1/service-offerings", async () => {
    const { result } = renderHook(() => useServiceOfferingService());
    const payload: ServiceOfferingPayload = { name: "Weekly Temple Visit", categoryId: 1, description: "desc", basePrice: 40, durationMinutes: 60 };
    await result.current.createServiceOffering(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/service-offerings", payload);
  });

  it("updateServiceOffering puts to /api/v1/service-offerings/:id with the id substituted", async () => {
    const { result } = renderHook(() => useServiceOfferingService());
    const payload: ServiceOfferingPayload = { name: "Renamed", categoryId: 2 };
    await result.current.updateServiceOffering(5, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/service-offerings/5", payload);
  });

  it("deleteServiceOffering deletes /api/v1/service-offerings/:id", async () => {
    const { result } = renderHook(() => useServiceOfferingService());
    await result.current.deleteServiceOffering(5);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/service-offerings/5");
  });
});
