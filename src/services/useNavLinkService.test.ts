import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { NavLinkStatusEnum } from "../utils/enums";
import { useNavLinkService } from "./useNavLinkService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useNavLinkService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getMine hits GET /nav-links/me", async () => {
    const { result } = renderHook(() => useNavLinkService());
    await result.current.getMine();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/nav-links/me");
  });

  it("create posts the exact payload to /nav-links", async () => {
    const { result } = renderHook(() => useNavLinkService());
    const payload = { name: "Manage Users", path: "/admin/users", status: NavLinkStatusEnum.ACTIVE };
    await result.current.create(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/nav-links", payload);
  });

  it("update puts to /nav-links/:id with the id substituted", async () => {
    const { result } = renderHook(() => useNavLinkService());
    const payload = { name: "Renamed", path: "/admin/users" };
    await result.current.update(7, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/nav-links/7", payload);
  });

  it("getById hits GET /nav-links/:id", async () => {
    const { result } = renderHook(() => useNavLinkService());
    await result.current.getById(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/nav-links/7");
  });

  it("list hits GET /nav-links with page/size params, defaulting to page 0 size 50", async () => {
    const { result } = renderHook(() => useNavLinkService());
    await result.current.list();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/nav-links", null, { params: { page: 0, size: 50 } });
  });

  it("remove deletes /nav-links/:id", async () => {
    const { result } = renderHook(() => useNavLinkService());
    await result.current.remove(7);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/nav-links/7");
  });
});
