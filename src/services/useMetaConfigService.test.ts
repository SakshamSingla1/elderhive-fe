import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useMetaConfigService } from "./useMetaConfigService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useMetaConfigService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("list hits GET /meta-configs with no params", async () => {
    const { result } = renderHook(() => useMetaConfigService());
    await result.current.list();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/meta-configs");
  });

  it("get hits GET /meta-configs/:context with the context substituted", async () => {
    const { result } = renderHook(() => useMetaConfigService());
    await result.current.get("EMERGENCY_SETTINGS");
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/meta-configs/EMERGENCY_SETTINGS");
  });

  it("upsert puts the exact payload to /meta-configs/:context", async () => {
    const { result } = renderHook(() => useMetaConfigService());
    const payload = { data: '{"searchRadiusKm":10}' };
    await result.current.upsert("EMERGENCY_SETTINGS", payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/meta-configs/EMERGENCY_SETTINGS", payload);
  });

  it("remove deletes /meta-configs/:context", async () => {
    const { result } = renderHook(() => useMetaConfigService());
    await result.current.remove("EMERGENCY_SETTINGS");
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/meta-configs/EMERGENCY_SETTINGS");
  });
});
