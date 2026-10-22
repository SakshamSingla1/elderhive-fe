import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime, getErrorMessage } from "./helper";

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

describe("formatDate", () => {
  it("formats a backend LocalDate string for display, date-only", () => {
    expect(formatDate("2026-03-02")).toBe("Mar 2, 2026");
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("returns an empty string for an unparsable value", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatTime", () => {
  it("formats a backend LocalTime string with seconds", () => {
    expect(formatTime("09:00:00")).toBe("9:00 AM");
    expect(formatTime("14:30:00")).toBe("2:30 PM");
  });

  it("formats a backend LocalTime string without seconds", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime(undefined)).toBe("");
    expect(formatTime("")).toBe("");
  });

  it("falls back to the raw value for an unparsable time", () => {
    expect(formatTime("not-a-time")).toBe("not-a-time");
  });
});
