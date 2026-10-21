import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useElderProfileService } from "./useElderProfileService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useElderProfileService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("create hits POST /api/v1/elder-profiles with the payload", async () => {
    const { result } = renderHook(() => useElderProfileService());
    const payload = { fullName: "Grandma Rose" };
    await result.current.create(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/elder-profiles", payload);
  });

  it("getMyProfile hits GET /api/v1/elder-profiles/me", async () => {
    const { result } = renderHook(() => useElderProfileService());
    await result.current.getMyProfile();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/elder-profiles/me");
  });

  it("getMine hits GET /api/v1/elder-profiles with page/size params, defaulting to page 0 size 20", async () => {
    const { result } = renderHook(() => useElderProfileService());
    await result.current.getMine();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/elder-profiles", null, { params: { page: 0, size: 20 } });
  });

  it("getById hits GET /api/v1/elder-profiles/:id with the id substituted", async () => {
    const { result } = renderHook(() => useElderProfileService());
    await result.current.getById(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/elder-profiles/5");
  });

  it("update hits PUT /api/v1/elder-profiles/:id with the payload", async () => {
    const { result } = renderHook(() => useElderProfileService());
    const payload = { fullName: "Renamed" };
    await result.current.update(5, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/elder-profiles/5", payload);
  });

  it("remove hits DELETE /api/v1/elder-profiles/:id", async () => {
    const { result } = renderHook(() => useElderProfileService());
    await result.current.remove(5);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/elder-profiles/5");
  });

  it("listFamilyMembers hits GET /api/v1/elder-profiles/:id/family-members", async () => {
    const { result } = renderHook(() => useElderProfileService());
    await result.current.listFamilyMembers(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/elder-profiles/5/family-members");
  });

  it("removeFamilyMember hits DELETE /api/v1/elder-profiles/:id/family-members/:userId", async () => {
    const { result } = renderHook(() => useElderProfileService());
    await result.current.removeFamilyMember(5, 10);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/elder-profiles/5/family-members/10");
  });
});
