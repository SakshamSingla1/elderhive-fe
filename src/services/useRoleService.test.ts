import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { RoleStatusEnum } from "../utils/enums";
import { useRoleService } from "./useRoleService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useRoleService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getAll hits GET /roles with page/size params, defaulting to page 0 size 50", async () => {
    const { result } = renderHook(() => useRoleService());
    await result.current.getAll();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/roles", null, { params: { page: 0, size: 50 } });
  });

  it("getById hits GET /roles/:id", async () => {
    const { result } = renderHook(() => useRoleService());
    await result.current.getById(3);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/roles/3");
  });

  it("create posts the exact payload to /roles", async () => {
    const { result } = renderHook(() => useRoleService());
    const payload = { name: "Support", status: RoleStatusEnum.ACTIVE };
    await result.current.create(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/roles", payload);
  });

  it("update puts to /roles/:id with the id substituted", async () => {
    const { result } = renderHook(() => useRoleService());
    const payload = { name: "Renamed" };
    await result.current.update(3, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/roles/3", payload);
  });

  it("remove deletes /roles/:id", async () => {
    const { result } = renderHook(() => useRoleService());
    await result.current.remove(3);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/roles/3");
  });
});
