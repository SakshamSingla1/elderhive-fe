import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useInviteService } from "./useInviteService";
import { UserTypeEnum } from "../utils/enums";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useInviteService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("createInvite hits POST /api/v1/elder-profiles/:elderProfileId/invites with the payload", async () => {
    const { result } = renderHook(() => useInviteService());
    const payload = { invitedEmail: "a@example.com", invitedRole: UserTypeEnum.FAMILY_MEMBER };
    await result.current.createInvite(5, payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/elder-profiles/5/invites", payload);
  });

  it("listForProfile hits GET /api/v1/elder-profiles/:elderProfileId/invites", async () => {
    const { result } = renderHook(() => useInviteService());
    await result.current.listForProfile(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/elder-profiles/5/invites");
  });

  it("accept hits PUT /api/v1/invites/accept/:token with the token substituted", async () => {
    const { result } = renderHook(() => useInviteService());
    await result.current.accept("abc-123");
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/invites/accept/abc-123");
  });

  it("decline hits PUT /api/v1/invites/decline/:token with the token substituted", async () => {
    const { result } = renderHook(() => useInviteService());
    await result.current.decline("abc-123");
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/invites/decline/abc-123");
  });
});
