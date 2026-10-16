import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsPage from "./Notifications.page";
import { useNotificationService } from "../../../services/useNotificationService";
import { NotificationTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useNotificationService", () => ({
  useNotificationService: vi.fn(),
}));

const mockedUseNotificationService = vi.mocked(useNotificationService);

const SAMPLE_PAGE = {
  content: [
    { id: 1, type: NotificationTypeEnum.BOOKING, title: "Booking confirmed", message: "See you soon", isRead: false, createdAt: "2026-10-20T10:00:00" },
    { id: 2, type: NotificationTypeEnum.SYSTEM, title: "Welcome", message: "Thanks for joining", isRead: true, createdAt: "2026-10-19T09:00:00" },
  ],
  totalElements: 2, totalPages: 1, number: 0, size: 10, first: true, last: true, numberOfElements: 2, empty: false,
};

describe("Notifications.page", () => {
  let list: ReturnType<typeof vi.fn>;
  let markAsRead: ReturnType<typeof vi.fn>;
  let markAllAsRead: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    list = vi.fn().mockResolvedValue(SAMPLE_PAGE);
    markAsRead = vi.fn().mockResolvedValue("Marked");
    markAllAsRead = vi.fn().mockResolvedValue("Marked");
    mockedUseNotificationService.mockReturnValue(
      { list, unreadCount: vi.fn(), markAsRead, markAllAsRead } as ReturnType<typeof useNotificationService>
    );
  });

  it("lists every notification with its read/unread status", async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText("Booking confirmed")).toBeInTheDocument();
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("shows a Mark Read action only for unread rows, and it marks that row read", async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await screen.findByText("Booking confirmed");

    const markReadButtons = screen.getAllByRole("button", { name: "Mark Read" });
    expect(markReadButtons).toHaveLength(1);

    await user.click(markReadButtons[0]);

    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mark Read" })).not.toBeInTheDocument());
  });

  it("Mark All Read is disabled once nothing is unread, and calls the bulk endpoint when clicked", async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await screen.findByText("Booking confirmed");

    const markAllButton = screen.getByRole("button", { name: /Mark All Read/i });
    expect(markAllButton).toBeEnabled();

    await user.click(markAllButton);

    await waitFor(() => expect(markAllAsRead).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(markAllButton).toBeDisabled());
  });

  it("shows an empty state when there are no notifications", async () => {
    list.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true, numberOfElements: 0, empty: true });
    render(<NotificationsPage />);

    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });

  it("shows a load error banner when the list call fails", async () => {
    list.mockRejectedValue({ response: { data: { message: "Could not load notifications" } } });
    render(<NotificationsPage />);

    expect(await screen.findByText("Could not load notifications")).toBeInTheDocument();
  });
});
