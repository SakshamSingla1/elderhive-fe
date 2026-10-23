import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { UserStatusEnum, UserTypeEnum } from "../utils/enums";
import { useAdminUserService } from "./useAdminUserService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useAdminUserService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getAll defaults to page 0 size 20 with no filters", async () => {
    const { result } = renderHook(() => useAdminUserService());
    await result.current.getAll();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/admin/users", null, {
      params: { page: 0, size: 20, search: undefined, userType: undefined, status: undefined },
    });
  });

  it("getAll passes through search/userType/status filters", async () => {
    const { result } = renderHook(() => useAdminUserService());
    await result.current.getAll({ page: 2, size: 10, search: "sam", userType: UserTypeEnum.CARETAKER, status: UserStatusEnum.ACTIVE });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/admin/users", null, {
      params: { page: 2, size: 10, search: "sam", userType: UserTypeEnum.CARETAKER, status: UserStatusEnum.ACTIVE },
    });
  });

  it("getById hits GET /api/v1/admin/users/:id", async () => {
    const { result } = renderHook(() => useAdminUserService());
    await result.current.getById(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/admin/users/5");
  });

  it("suspend hits PUT /api/v1/admin/users/:id/suspend", async () => {
    const { result } = renderHook(() => useAdminUserService());
    await result.current.suspend(5);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/admin/users/5/suspend");
  });

  it("grantRole posts the roleType to /api/v1/admin/users/:id/roles", async () => {
    const { result } = renderHook(() => useAdminUserService());
    await result.current.grantRole(5, UserTypeEnum.CARETAKER);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/admin/users/5/roles", { roleType: UserTypeEnum.CARETAKER });
  });

  it("revokeRole deletes /api/v1/admin/users/:id/roles/:roleType", async () => {
    const { result } = renderHook(() => useAdminUserService());
    await result.current.revokeRole(5, UserTypeEnum.CARETAKER);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/admin/users/5/roles/CARETAKER");
  });
});
