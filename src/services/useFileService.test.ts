import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFileService } from "./useFileService";

describe("useFileService", () => {
  it("getDownloadUrl builds the /api/v1/files/:id/download path with the id substituted", () => {
    const { result } = renderHook(() => useFileService());
    expect(result.current.getDownloadUrl(42)).toMatch(/\/api\/v1\/files\/42\/download$/);
  });
});
