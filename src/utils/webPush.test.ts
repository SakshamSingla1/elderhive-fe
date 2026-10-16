import { describe, expect, it } from "vitest";
import { isPushSupported, urlBase64ToUint8Array } from "./webPush";

describe("urlBase64ToUint8Array", () => {
  it("decodes an unpadded base64url string into the matching bytes", () => {
    // "hello" -> base64 "aGVsbG8=" -> base64url (no padding) "aGVsbG8"
    const result = urlBase64ToUint8Array("aGVsbG8");
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
  });

  it("restores -/_ to +// before decoding", () => {
    // bytes [0xFB, 0xFF] -> base64 "+/8=" -> base64url "-_8"
    const result = urlBase64ToUint8Array("-_8");
    expect(Array.from(result)).toEqual([0xfb, 0xff]);
  });
});

describe("isPushSupported", () => {
  it("returns false in this jsdom test environment (no real PushManager)", () => {
    expect(isPushSupported()).toBe(false);
  });
});
