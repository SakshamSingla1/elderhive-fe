import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useNotificationPreferenceService } from "./useNotificationPreferenceService";
import { NotificationTypeEnum } from "../utils/enums";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useNotificationPreferenceService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getPreferences hits GET /api/v1/notification-preferences", async () => {
    const { result } = renderHook(() => useNotificationPreferenceService());
    await result.current.getPreferences();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/notification-preferences");
  });

  it("updatePreferences PUTs { preferences } to /api/v1/notification-preferences", async () => {
    const { result } = renderHook(() => useNotificationPreferenceService());
    const payload = [{ type: NotificationTypeEnum.BOOKING, inAppEnabled: true, emailEnabled: false, smsEnabled: false, webPushEnabled: false }];
    await result.current.updatePreferences(payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/notification-preferences", { preferences: payload });
  });
});
