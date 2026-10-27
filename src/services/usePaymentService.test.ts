import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { usePaymentService } from "./usePaymentService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("usePaymentService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("createIntent posts the bookingId to /api/v1/payments/intent", async () => {
    const { result } = renderHook(() => usePaymentService());
    await result.current.createIntent(7);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/payments/intent", { bookingId: 7 });
  });

  it("getById hits GET /api/v1/payments/:id", async () => {
    const { result } = renderHook(() => usePaymentService());
    await result.current.getById(5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/payments/5");
  });

  it("getByBooking hits GET /api/v1/payments/booking/:bookingId", async () => {
    const { result } = renderHook(() => usePaymentService());
    await result.current.getByBooking(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/payments/booking/7");
  });
});
