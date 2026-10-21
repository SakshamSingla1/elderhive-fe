import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useSearchService } from "./useSearchService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useSearchService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("searchCaretakers hits GET /api/v1/search/caretakers with the params", async () => {
    const { result } = renderHook(() => useSearchService());
    const params = { query: "carla", limit: 10 };
    await result.current.searchCaretakers(params);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/search/caretakers", null, { params });
  });

  it("searchElderProfiles hits GET /api/v1/search/elder-profiles with the params", async () => {
    const { result } = renderHook(() => useSearchService());
    const params = { query: "rose" };
    await result.current.searchElderProfiles(params);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/search/elder-profiles", null, { params });
  });
});
