import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { usePermissionService } from "./usePermissionService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("usePermissionService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getAll hits GET /permissions with no params (flat list, no pagination)", async () => {
    const { result } = renderHook(() => usePermissionService());
    await result.current.getAll();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/permissions");
  });

  it("assignToRole posts to /permissions/roles/:roleId/:permissionId", async () => {
    const { result } = renderHook(() => usePermissionService());
    await result.current.assignToRole(3, 10);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/permissions/roles/3/10");
  });

  it("unassignFromRole deletes /permissions/roles/:roleId/:permissionId", async () => {
    const { result } = renderHook(() => usePermissionService());
    await result.current.unassignFromRole(3, 10);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/permissions/roles/3/10");
  });
});
