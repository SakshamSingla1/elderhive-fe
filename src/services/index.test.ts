import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, request } from "./index";

/**
 * Exercises the REAL interceptor pipeline registered on `apiClient` — not a reimplementation
 * of its logic — by swapping in a custom axios adapter (the actual transport layer axios
 * calls under its interceptors) and spying on the module-level `axios.post` the refresh
 * call uses. This proves the subscriber-queue pattern, the auth-free-path allowlist, and
 * the hard-redirect-on-failure behavior all work over axios's real request/response
 * promise chain, the same one a real browser request goes through.
 */
describe("services/index.ts", () => {
  const originalLocation = window.location;

  function envelopeResponse(config: InternalAxiosRequestConfig, data: unknown) {
    return {
      data: { message: "ok", status: "SUCCESS" as const, data },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  }

  function unauthorizedError(config: InternalAxiosRequestConfig) {
    return new AxiosError(
      "Request failed with status code 401",
      "ERR_BAD_REQUEST",
      config,
      null,
      {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Unauthorized", status: "FAILED", errorCode: "TOKEN_INVALID" },
        headers: {},
        config,
      }
    );
  }

  beforeEach(() => {
    // jsdom's window.location doesn't allow reassigning .href directly - replace the
    // whole object for the duration of each test instead.
    // @ts-expect-error - deliberately deleting to allow replacement, restored in afterEach
    delete window.location;
    window.location = { ...originalLocation, href: "", pathname: "/dashboard" } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
    apiClient.defaults.adapter = undefined;
  });

  it("unwraps ResponseModel<T> down to T on a plain successful request", async () => {
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      envelopeResponse(config, { id: 1, name: "test" })
    );

    const result = await request<{ id: number; name: string }>("get", "/some/path");

    expect(result).toEqual({ id: 1, name: "test" });
  });

  it("on a 401, refreshes once then retries the original request and resolves with its result", async () => {
    let callCount = 0;
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      callCount++;
      if (callCount === 1) {
        throw unauthorizedError(config);
      }
      return envelopeResponse(config, { ok: true });
    });
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({ data: {} });

    const result = await request<{ ok: boolean }>("get", "/protected");

    expect(result).toEqual({ ok: true });
    expect(callCount).toBe(2);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      {},
      expect.objectContaining({ withCredentials: true })
    );
  });

  it("queues concurrent 401s behind a single in-flight refresh, retrying every one of them", async () => {
    let refreshResolve: (() => void) | null = null;
    const refreshGate = new Promise<void>((resolve) => {
      refreshResolve = resolve;
    });
    const postSpy = vi.spyOn(axios, "post").mockImplementation(async () => {
      await refreshGate;
      return { data: {} };
    });

    const attemptsByUrl = new Map<string, number>();
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";
      const attempt = (attemptsByUrl.get(url) ?? 0) + 1;
      attemptsByUrl.set(url, attempt);
      if (attempt === 1) {
        throw unauthorizedError(config);
      }
      return envelopeResponse(config, { url });
    });

    const first = request<{ url: string }>("get", "/protected-a");
    const second = request<{ url: string }>("get", "/protected-b");

    // Let both initial 401s land and both reach the interceptor before the refresh
    // resolves - this is what actually proves the second one gets queued rather than
    // firing its own concurrent refresh.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    refreshResolve!();

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual({ url: "/protected-a" });
    expect(secondResult).toEqual({ url: "/protected-b" });
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it("hard-redirects to /login?auth=expired and rejects the original request when refresh itself fails", async () => {
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorizedError(config);
    });
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh token invalid"));

    await expect(request("get", "/protected")).rejects.toThrow();

    expect(window.location.href).toBe("/login?auth=expired");
  });

  it("does not redirect again if already on the login page", async () => {
    window.location.pathname = "/login";
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorizedError(config);
    });
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh token invalid"));

    await expect(request("get", "/protected")).rejects.toThrow();

    expect(window.location.href).toBe("");
  });

  it("never attempts a refresh for a 401 on an auth-free path like /auth/login", async () => {
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorizedError(config);
    });
    const postSpy = vi.spyOn(axios, "post");

    await expect(request("post", "/auth/login", { email: "x", password: "y" })).rejects.toThrow();

    expect(postSpy).not.toHaveBeenCalled();
  });
});
