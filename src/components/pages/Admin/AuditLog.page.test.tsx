import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditLogPage from "./AuditLog.page";
import { useAuditLogService } from "../../../services/useAuditLogService";
import type { AuditLogResponse } from "../../../services/useAuditLogService";
import { ActionType, EntityTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useAuditLogService", () => ({
  useAuditLogService: vi.fn(),
}));

const mockedUseAuditLogService = vi.mocked(useAuditLogService);

function auditLog(overrides: Partial<AuditLogResponse> = {}): AuditLogResponse {
  return {
    id: 1,
    entityType: EntityTypeEnum.ROLE,
    entityId: "7",
    actionType: ActionType.GRANT,
    actorUserId: 99,
    actorEmail: "admin@example.com",
    data: '{"roleType":"CARETAKER"}',
    timestamp: "2026-10-20T10:00:00Z",
    ...overrides,
  };
}

function pageOf(content: AuditLogResponse[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

describe("Admin AuditLog.page", () => {
  let search: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    search = vi.fn().mockResolvedValue(pageOf([auditLog()]));
    mockedUseAuditLogService.mockReturnValue({ search } as unknown as ReturnType<typeof useAuditLogService>);
  });

  it("lists audit log entries returned by the backend", async () => {
    render(<AuditLogPage />);

    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Role #7")).toBeInTheDocument();
    expect(screen.getByText("Grant")).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", async () => {
    search.mockResolvedValue(pageOf([]));
    render(<AuditLogPage />);

    expect(await screen.findByText("No audit log entries found")).toBeInTheDocument();
  });

  it("re-fetches with the entityType filter applied", async () => {
    render(<AuditLogPage />);
    await screen.findByText("admin@example.com");
    search.mockClear();

    await userEvent.click(screen.getByLabelText("Entity type"));
    await userEvent.click(screen.getByRole("option", { name: "Role" }));

    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.objectContaining({ entityType: EntityTypeEnum.ROLE })));
  });

  it("re-fetches with the actionType filter applied", async () => {
    render(<AuditLogPage />);
    await screen.findByText("admin@example.com");
    search.mockClear();

    await userEvent.click(screen.getByLabelText("Action"));
    await userEvent.click(screen.getByRole("option", { name: "Grant" }));

    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.objectContaining({ actionType: ActionType.GRANT })));
  });
});
