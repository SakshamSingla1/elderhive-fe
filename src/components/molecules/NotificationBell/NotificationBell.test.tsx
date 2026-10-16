import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "./NotificationBell";
import { useNotificationService } from "../../../services/useNotificationService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { UserTypeEnum, NotificationTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useNotificationService", () => ({
  useNotificationService: vi.fn(),
}));
vi.mock("../../../contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(),
}));
vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseNotificationService = vi.mocked(useNotificationService);
const mockedUseWebSocket = vi.mocked(useWebSocket);
const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

function mockUser() {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: { id: 7, email: "a@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

function renderBell() {
  return render(
    <MemoryRouter initialEntries={["/elder/dashboard"]}>
      <NotificationBell />
    </MemoryRouter>
  );
}

describe("NotificationBell", () => {
  let unreadCount: ReturnType<typeof vi.fn>;
  let list: ReturnType<typeof vi.fn>;
  let markAsRead: ReturnType<typeof vi.fn>;
  let subscribeCallback: ((frame: { body: string }) => void) | null;

  beforeEach(() => {
    unreadCount = vi.fn().mockResolvedValue(3);
    list = vi.fn().mockResolvedValue({
      content: [{ id: 1, type: NotificationTypeEnum.BOOKING, title: "Booking confirmed", message: "See you soon", isRead: false, createdAt: "2026-10-20T10:00:00" }],
      totalElements: 1, totalPages: 1, number: 0, size: 6, first: true, last: true, numberOfElements: 1, empty: false,
    });
    markAsRead = vi.fn().mockResolvedValue("Marked");
    mockedUseNotificationService.mockReturnValue(
      { list, unreadCount, markAsRead, markAllAsRead: vi.fn() } as ReturnType<typeof useNotificationService>
    );

    subscribeCallback = null;
    mockedUseWebSocket.mockReturnValue({
      connected: true,
      subscribe: vi.fn((_, cb) => {
        subscribeCallback = cb;
        return () => {};
      }),
    });
    mockUser();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("badges the unread count fetched on mount", async () => {
    renderBell();
    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("subscribes to this user's own notifications topic", () => {
    renderBell();
    const subscribeMock = mockedUseWebSocket.mock.results[0].value.subscribe as ReturnType<typeof vi.fn>;
    expect(subscribeMock).toHaveBeenCalledWith("/topic/notifications/7", expect.any(Function));
  });

  it("increments the badge and prepends a recent item when a live WS message arrives, without any refetch", async () => {
    renderBell();
    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(1));
    await screen.findByText("3");

    const pushed = { id: 99, type: NotificationTypeEnum.EMERGENCY, title: "Emergency alert", message: "Check now", isRead: false, createdAt: "2026-10-20T11:00:00" };
    subscribeCallback!({ body: JSON.stringify(pushed) });

    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
    // No second fetch triggered by the live push.
    expect(unreadCount).toHaveBeenCalledTimes(1);
  });

  it("opens the dropdown and lists fetched notifications", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("Booking confirmed")).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(0, 6);
  });

  it("marks a clicked unread notification as read and decrements the badge", async () => {
    const user = userEvent.setup();
    renderBell();
    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(1));
    await screen.findByText("3");

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    await user.click(await screen.findByText("Booking confirmed"));

    expect(markAsRead).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });
});
