import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./helper";

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
