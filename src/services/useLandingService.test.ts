import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useLandingService } from "./useLandingService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useLandingService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getPublicPage hits GET /api/v1/landing/page", async () => {
    const { result } = renderHook(() => useLandingService());
    await result.current.getPublicPage();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/landing/page");
  });

  it("updateConfig puts the payload to /api/v1/landing/config", async () => {
    const { result } = renderHook(() => useLandingService());
    const payload = { heroHeadline: "Welcome" };
    await result.current.updateConfig(payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/landing/config", payload);
  });

  it("createFeature posts to /api/v1/landing/features", async () => {
    const { result } = renderHook(() => useLandingService());
    const payload = { title: "Emergency SOS", isActive: true };
    await result.current.createFeature(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/landing/features", payload);
  });

  it("updateFeature puts to /api/v1/landing/features/:id", async () => {
    const { result } = renderHook(() => useLandingService());
    const payload = { title: "Updated", isActive: true };
    await result.current.updateFeature(3, payload);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/landing/features/3", payload);
  });

  it("deleteFeature deletes /api/v1/landing/features/:id", async () => {
    const { result } = renderHook(() => useLandingService());
    await result.current.deleteFeature(3);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/landing/features/3");
  });

  it("createFaq posts to /api/v1/landing/faqs", async () => {
    const { result } = renderHook(() => useLandingService());
    const payload = { question: "q", answer: "a", isActive: true };
    await result.current.createFaq(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/landing/faqs", payload);
  });

  it("createTestimonial posts to /api/v1/landing/testimonials", async () => {
    const { result } = renderHook(() => useLandingService());
    const payload = { authorName: "Jane", content: "Great", isActive: true };
    await result.current.createTestimonial(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/landing/testimonials", payload);
  });
});
