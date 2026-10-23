import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { usePresenceService } from "./usePresenceService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("usePresenceService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getStatus hits GET /api/v1/presence/status with a comma-joined userIds param", async () => {
    const { result } = renderHook(() => usePresenceService());
    await result.current.getStatus([1, 2, 3]);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/presence/status", null, { params: { userIds: "1,2,3" } });
  });

  it("getStatus handles a single id without a trailing comma", async () => {
    const { result } = renderHook(() => usePresenceService());
    await result.current.getStatus([42]);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/presence/status", null, { params: { userIds: "42" } });
  });
});
