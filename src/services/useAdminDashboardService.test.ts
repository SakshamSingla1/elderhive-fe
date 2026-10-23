import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useAdminDashboardService } from "./useAdminDashboardService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useAdminDashboardService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getStats hits GET /api/v1/dashboard/stats", async () => {
    const { result } = renderHook(() => useAdminDashboardService());
    await result.current.getStats();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/dashboard/stats");
  });
});
