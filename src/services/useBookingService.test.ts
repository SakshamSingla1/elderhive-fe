import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useBookingService } from "./useBookingService";
import type { BookingPayload } from "./useBookingService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useBookingService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("create posts the exact payload to /api/v1/bookings", async () => {
    const { result } = renderHook(() => useBookingService());
    const payload: BookingPayload = {
      elderProfileId: 10,
      caretakerId: 20,
      serviceOfferingId: 30,
      scheduledDate: "2026-03-02",
      scheduledTime: "09:00:00",
    };
    await result.current.create(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/bookings", payload);
  });

  it("getById hits GET /api/v1/bookings/:id", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.getById(100);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/bookings/100");
  });

  it("confirm hits PUT /api/v1/bookings/:id/confirm", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.confirm(100);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/bookings/100/confirm");
  });

  it("start hits PUT /api/v1/bookings/:id/start", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.start(100);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/bookings/100/start");
  });

  it("complete hits PUT /api/v1/bookings/:id/complete", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.complete(100);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/bookings/100/complete");
  });

  it("cancel hits PUT /api/v1/bookings/:id/cancel with cancelSeries defaulting to false", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.cancel(100);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/bookings/100/cancel", null, { params: { cancelSeries: false } });
  });

  it("cancel passes cancelSeries=true through when given", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.cancel(100, true);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/bookings/100/cancel", null, { params: { cancelSeries: true } });
  });

  it("getMyBookingsAsFamily hits GET /api/v1/bookings/me/as-family with page/size/sort params", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.getMyBookingsAsFamily(1, 10);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/bookings/me/as-family", null, {
      params: { page: 1, size: 10, sort: "scheduledDate,desc" },
    });
  });

  it("getMyBookingsAsCaretaker hits GET /api/v1/bookings/me/as-caretaker with page/size/sort params", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.getMyBookingsAsCaretaker();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/bookings/me/as-caretaker", null, {
      params: { page: 0, size: 20, sort: "scheduledDate,desc" },
    });
  });

  it("getRecurringGroup hits GET /api/v1/bookings/recurring-group/:recurringGroupId", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.getRecurringGroup("group-1");
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/bookings/recurring-group/group-1");
  });

  it("getAll hits GET /api/v1/bookings with page/size defaults and no filters", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.getAll();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/bookings", null, {
      params: { page: 0, size: 20, familyUserId: undefined, caretakerId: undefined, status: undefined, sort: "scheduledDate,desc" },
    });
  });

  it("getAll passes every filter through as query params", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.getAll({ familyUserId: 1, caretakerId: 20, status: "CONFIRMED", page: 2, size: 5 });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/bookings", null, {
      params: { page: 2, size: 5, familyUserId: 1, caretakerId: 20, status: "CONFIRMED", sort: "scheduledDate,desc" },
    });
  });

  it("adminOverrideStatus hits PUT /api/v1/bookings/:id/admin-override-status with the new status", async () => {
    const { result } = renderHook(() => useBookingService());
    await result.current.adminOverrideStatus(100, "COMPLETED");
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/bookings/100/admin-override-status", { status: "COMPLETED" });
  });
});
