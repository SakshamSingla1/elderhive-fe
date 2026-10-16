import { describe, expect, it } from "vitest";
import { formatDateTime, getErrorMessage } from "./helper";

describe("getErrorMessage", () => {
  it("prefers the backend's ResponseModel.message from a failed axios response", () => {
    const error = { response: { data: { message: "Invalid email or password." } } };
    expect(getErrorMessage(error)).toBe("Invalid email or password.");
  });

  it("falls back to a plain Error's own message when there's no response", () => {
    expect(getErrorMessage(new Error("Network Error"))).toBe("Network Error");
  });

  it("falls back to the caller-supplied default for an unrecognizable error shape", () => {
    expect(getErrorMessage("just a string", "fallback copy")).toBe("fallback copy");
    expect(getErrorMessage(null, "fallback copy")).toBe("fallback copy");
  });

  it("uses the generic built-in fallback when none is supplied", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong. Please try again.");
  });
});

describe("formatDateTime", () => {
  it("formats a backend LocalDateTime ISO string for display", () => {
    expect(formatDateTime("2026-10-20T14:30:00")).toBe("Oct 20, 2026 2:30 PM");
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("")).toBe("");
  });

  it("returns an empty string for an unparsable value", () => {
    expect(formatDateTime("not-a-date")).toBe("");
  });
});
