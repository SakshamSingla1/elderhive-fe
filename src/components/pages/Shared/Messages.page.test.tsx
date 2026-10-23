import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMessagingService } from "../../../services/useMessagingService";
import type { ConversationResponse, MessageResponse } from "../../../services/useMessagingService";
import { usePresenceService } from "../../../services/usePresenceService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../../../utils/enums";
import MessagesPage from "./Messages.page";

vi.mock("../../../services/useMessagingService", () => ({
  useMessagingService: vi.fn(),
}));
vi.mock("../../../services/usePresenceService", () => ({
  usePresenceService: vi.fn(),
}));
vi.mock("../../../contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(),
}));
vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseMessagingService = vi.mocked(useMessagingService);
const mockedUsePresenceService = vi.mocked(usePresenceService);
const mockedUseWebSocket = vi.mocked(useWebSocket);
const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

function conversation(overrides: Partial<ConversationResponse> = {}): ConversationResponse {
  return {
    id: 1,
    userAId: 100,
    userBId: 20,
    otherUserId: 20,
    otherUserName: "Jane Caretaker",
    bookingId: null,
    lastMessageAt: "2026-03-01T09:00:00",
    unreadCount: 0,
    ...overrides,
  };
}

function message(overrides: Partial<MessageResponse> = {}): MessageResponse {
  return {
    id: 10,
    conversationId: 1,
    senderId: 20,
    senderName: "Jane Caretaker",
    content: "Hello there",
    sentAt: "2026-03-01T09:00:00",
    readAt: null,
    fileAssetId: null,
    fileUrl: null,
    ...overrides,
  };
}

function pageOf<T>(content: T[], last = true) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 50, first: true, last, numberOfElements: content.length, empty: content.length === 0 };
}

function mockMessagingService(overrides: Partial<ReturnType<typeof useMessagingService>> = {}) {
  const service = {
    getOrCreateConversation: vi.fn(),
    getMyConversations: vi.fn().mockResolvedValue(pageOf([conversation()])),
    getMessages: vi.fn().mockResolvedValue(pageOf([message()])),
    markRead: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockedUseMessagingService.mockReturnValue(service);
  return service;
}

let subscribeCallbacks: Map<string, (frame: { body: string }) => void>;
let publishMock: ReturnType<typeof vi.fn>;

function mockWebSocket(connected = true) {
  subscribeCallbacks = new Map();
  publishMock = vi.fn();
  mockedUseWebSocket.mockReturnValue({
    connected,
    subscribe: vi.fn((destination, cb) => {
      subscribeCallbacks.set(destination, cb);
      return () => {};
    }),
    publish: publishMock,
  } as unknown as ReturnType<typeof useWebSocket>);
}

function mockPresenceService(getStatus: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({ "20": false })) {
  mockedUsePresenceService.mockReturnValue({ getStatus } as unknown as ReturnType<typeof usePresenceService>);
  return getStatus;
}

function mockUser() {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: { id: 100, email: "family@example.com", userType: UserTypeEnum.FAMILY_MEMBER, primaryRole: UserTypeEnum.FAMILY_MEMBER, roles: [UserTypeEnum.FAMILY_MEMBER] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

function renderPage(initialEntry = "/family/messages") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessagesPage />
    </MemoryRouter>
  );
}

describe("Messages.page", () => {
  beforeEach(() => {
    // jsdom doesn't implement Element.scrollIntoView - the page calls it to auto-scroll
    // a thread to its latest message, a real DOM API with nothing to assert on here.
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockWebSocket();
    mockPresenceService();
    mockUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays the conversation list", async () => {
    mockMessagingService();
    renderPage();

    expect(await screen.findByText("Jane Caretaker")).toBeInTheDocument();
  });

  it("shows an empty state when there are no conversations", async () => {
    mockMessagingService({ getMyConversations: vi.fn().mockResolvedValue(pageOf([])) });
    renderPage();

    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
  });

  it("shows a list load error", async () => {
    mockMessagingService({ getMyConversations: vi.fn().mockRejectedValue(new Error("server unavailable")) });
    renderPage();

    expect(await screen.findByText("server unavailable")).toBeInTheDocument();
  });

  it("opening a conversation loads its history and marks it read", async () => {
    const user = userEvent.setup();
    const service = mockMessagingService();
    renderPage();

    await user.click(await screen.findByText("Jane Caretaker"));

    expect(service.getMessages).toHaveBeenCalledWith(1, 0, 50);
    expect(await screen.findByText("Hello there")).toBeInTheDocument();
    await waitFor(() => expect(service.markRead).toHaveBeenCalledWith(1));
  });

  it("auto-opens the conversation named in ?conversationId= on load", async () => {
    const service = mockMessagingService();
    renderPage("/family/messages?conversationId=1");

    await waitFor(() => expect(service.getMessages).toHaveBeenCalledWith(1, 0, 50));
    expect(await screen.findByText("Hello there")).toBeInTheDocument();
  });

  it("sends a message over STOMP and clears the draft, without a REST call", async () => {
    const user = userEvent.setup();
    mockMessagingService();
    renderPage();
    await user.click(await screen.findByText("Jane Caretaker"));
    await screen.findByText("Hello there");

    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "How are you?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(publishMock).toHaveBeenCalledWith("/app/conversations/1/send", { content: "How are you?" });
    expect(input).toHaveValue("");
  });

  it("shows an error and does not publish when sending while disconnected", async () => {
    const user = userEvent.setup();
    mockWebSocket(false);
    mockMessagingService();
    renderPage();
    await user.click(await screen.findByText("Jane Caretaker"));
    await screen.findByText("Hello there");

    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "How are you?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(publishMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Not connected/)).toBeInTheDocument();
  });

  it("appends a live-broadcast message to the open thread and marks it read", async () => {
    const user = userEvent.setup();
    const service = mockMessagingService();
    renderPage();
    await user.click(await screen.findByText("Jane Caretaker"));
    await screen.findByText("Hello there");
    vi.mocked(service.markRead).mockClear();

    const incoming = message({ id: 11, content: "Second message", senderId: 20 });
    await waitFor(() => expect(subscribeCallbacks.has("/topic/conversations/1")).toBe(true));
    subscribeCallbacks.get("/topic/conversations/1")!({ body: JSON.stringify(incoming) });

    expect(await screen.findByText("Second message")).toBeInTheDocument();
    await waitFor(() => expect(service.markRead).toHaveBeenCalledWith(1));
  });

  it("bumps the unread badge for a live message on a conversation that is not open", async () => {
    mockMessagingService({
      getMyConversations: vi.fn().mockResolvedValue(pageOf([conversation({ id: 1, unreadCount: 0 }), conversation({ id: 2, otherUserId: 30, otherUserName: "Tom Family", unreadCount: 0 })])),
    });
    mockPresenceService(vi.fn().mockResolvedValue({ "20": false, "30": false }));
    renderPage();
    await screen.findByText("Jane Caretaker");

    await waitFor(() => expect(subscribeCallbacks.has("/topic/conversations/2")).toBe(true));
    subscribeCallbacks.get("/topic/conversations/2")!({ body: JSON.stringify(message({ id: 99, conversationId: 2, senderId: 30, content: "Hi!" })) });

    // MUI's Badge hides a badgeContent of 0 by default - a "1" appearing confirms the
    // not-currently-open conversation's unreadCount was bumped by the live broadcast.
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("shows an online presence dot in the conversation list once the initial snapshot resolves", async () => {
    mockMessagingService();
    mockPresenceService(vi.fn().mockResolvedValue({ "20": true }));
    renderPage();

    await screen.findByText("Jane Caretaker");
    expect(await screen.findByLabelText("Online")).toBeInTheDocument();
  });

  it("updates the list's presence dot live from a /topic/presence event", async () => {
    mockMessagingService();
    renderPage();
    await screen.findByText("Jane Caretaker");
    expect(screen.getByLabelText("Offline")).toBeInTheDocument();

    await waitFor(() => expect(subscribeCallbacks.has("/topic/presence")).toBe(true));
    subscribeCallbacks.get("/topic/presence")!({ body: JSON.stringify({ userId: 20, online: true }) });

    expect(await screen.findByLabelText("Online")).toBeInTheDocument();
  });

  it("shows a Load more button when the history page isn't the last, and fetches the next page", async () => {
    const user = userEvent.setup();
    const service = mockMessagingService({ getMessages: vi.fn().mockResolvedValue(pageOf([message()], false)) });
    renderPage();
    await user.click(await screen.findByText("Jane Caretaker"));
    await screen.findByText("Hello there");

    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(service.getMessages).toHaveBeenCalledWith(1, 1, 50);
  });
});
