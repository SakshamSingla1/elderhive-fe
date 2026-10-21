import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useCaretakerService } from "./useCaretakerService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useCaretakerService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("createOrUpdate hits POST /api/v1/caretaker-profiles with the payload", async () => {
    const { result } = renderHook(() => useCaretakerService());
    const payload = { bio: "Bio" };
    await result.current.createOrUpdate(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/caretaker-profiles", payload);
  });

  it("getMyProfile hits GET /api/v1/caretaker-profiles/me", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.getMyProfile();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/caretaker-profiles/me");
  });

  it("getById hits GET /api/v1/caretaker-profiles/:id with the id substituted", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.getById(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/caretaker-profiles/7");
  });

  it("getAll hits GET /api/v1/caretaker-profiles with page/size params, defaulting to page 0 size 20", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.getAll();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/caretaker-profiles", null, { params: { page: 0, size: 20 } });
  });

  it("uploadVerificationDocument posts multipart form data with the file and docType", async () => {
    const { result } = renderHook(() => useCaretakerService());
    const file = new File(["bytes"], "id.pdf", { type: "application/pdf" });
    await result.current.uploadVerificationDocument(file, "ID_PROOF");

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const [method, url, body, config] = mockedRequest.mock.calls[0];
    expect(method).toBe("POST");
    expect(url).toBe("/api/v1/caretaker-profiles/me/verification-documents");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
    expect((body as FormData).get("docType")).toBe("ID_PROOF");
    expect(config).toEqual({ headers: { "Content-Type": "multipart/form-data" } });
  });

  it("uploadVerificationDocument omits docType from the form data when not given", async () => {
    const { result } = renderHook(() => useCaretakerService());
    const file = new File(["bytes"], "id.pdf", { type: "application/pdf" });
    await result.current.uploadVerificationDocument(file);

    const body = mockedRequest.mock.calls[0][2] as FormData;
    expect(body.has("docType")).toBe(false);
  });

  it("listVerificationDocuments hits GET /api/v1/caretaker-profiles/:id/verification-documents", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.listVerificationDocuments(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/caretaker-profiles/7/verification-documents");
  });

  it("reviewVerificationDocument hits PUT /api/v1/caretaker-verification-documents/:id/review with the review status", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.reviewVerificationDocument(9, "APPROVED");
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/caretaker-verification-documents/9/review", { reviewStatus: "APPROVED" });
  });

  it("getAvailability hits GET /api/v1/caretaker-profiles/:id/availability", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.getAvailability(7);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/caretaker-profiles/7/availability");
  });

  it("addAvailabilitySlot hits POST /api/v1/caretaker-profiles/me/availability with the payload", async () => {
    const { result } = renderHook(() => useCaretakerService());
    const payload = { dayOfWeek: "MONDAY" as const, startTime: "09:00", endTime: "17:00" };
    await result.current.addAvailabilitySlot(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/caretaker-profiles/me/availability", payload);
  });

  it("updateAvailabilitySlot hits PUT /api/v1/caretaker-profiles/me/availability/:slotId with the payload", async () => {
    const { result } = renderHook(() => useCaretakerService());
    const payload = { dayOfWeek: "TUESDAY" as const, startTime: "10:00", endTime: "18:00" };
    await result.current.updateAvailabilitySlot(3, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/caretaker-profiles/me/availability/3", payload);
  });

  it("removeAvailabilitySlot hits DELETE /api/v1/caretaker-profiles/me/availability/:slotId", async () => {
    const { result } = renderHook(() => useCaretakerService());
    await result.current.removeAvailabilitySlot(3);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/caretaker-profiles/me/availability/3");
  });
});
