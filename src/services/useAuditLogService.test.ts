import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { ActionType, EntityTypeEnum } from "../utils/enums";
import { useAuditLogService } from "./useAuditLogService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useAuditLogService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("search hits GET /audit-logs with page/size defaults and no filters", async () => {
    const { result } = renderHook(() => useAuditLogService());
    await result.current.search();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/audit-logs", null, {
      params: { page: 0, size: 20, entityType: undefined, actionType: undefined, from: undefined, to: undefined },
    });
  });

  it("search passes entityType/actionType/date-range filters through", async () => {
    const { result } = renderHook(() => useAuditLogService());
    await result.current.search({
      page: 2,
      size: 10,
      entityType: EntityTypeEnum.ROLE,
      actionType: ActionType.GRANT,
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z",
    });
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/audit-logs", null, {
      params: {
        page: 2,
        size: 10,
        entityType: EntityTypeEnum.ROLE,
        actionType: ActionType.GRANT,
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z",
      },
    });
  });
});
