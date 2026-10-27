import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { ContactUsStatusEnum } from "../utils/enums";
import { useContactUsService } from "./useContactUsService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useContactUsService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("submit posts the payload to /api/v1/contact-us", async () => {
    const { result } = renderHook(() => useContactUsService());
    const payload = { name: "Jane", email: "jane@example.com", message: "Hello" };
    await result.current.submit(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/contact-us", payload);
  });

  it("search hits GET /api/v1/contact-us with page/size defaults", async () => {
    const { result } = renderHook(() => useContactUsService());
    await result.current.search();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/contact-us", null, {
      params: { page: 0, size: 20, search: undefined, status: undefined },
    });
  });

  it("search passes search/status filters through", async () => {
    const { result } = renderHook(() => useContactUsService());
    await result.current.search({ page: 1, size: 10, search: "jane", status: ContactUsStatusEnum.NEW });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/contact-us", null, {
      params: { page: 1, size: 10, search: "jane", status: ContactUsStatusEnum.NEW },
    });
  });

  it("updateStatus puts the status as a query param", async () => {
    const { result } = renderHook(() => useContactUsService());
    await result.current.updateStatus(5, ContactUsStatusEnum.RESPONDED);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/contact-us/5/status", null, {
      params: { status: ContactUsStatusEnum.RESPONDED },
    });
  });

  it("remove deletes /api/v1/contact-us/:id", async () => {
    const { result } = renderHook(() => useContactUsService());
    await result.current.remove(5);
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/contact-us/5");
  });
});
