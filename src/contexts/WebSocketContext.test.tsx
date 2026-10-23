import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "./AuthenticatedUserContext";
import { WebSocketProvider, useWebSocket } from "./WebSocketContext";

vi.mock("./AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

let activateMock: () => void;
let deactivateMock: () => void;
let subscribeMock: (destination: string, callback: (msg: unknown) => void) => { unsubscribe: () => void };
let publishMock: (frame: { destination: string; body?: string }) => void;
let lastClientConfig: Record<string, unknown> | null = null;
let mockClientConnected = false;

vi.mock("@stomp/stompjs", () => {
  class MockClient {
    constructor(config: Record<string, unknown>) {
      lastClientConfig = config;
    }
    activate() {
      return activateMock();
    }
    deactivate() {
      return deactivateMock();
    }
    get connected() {
      return mockClientConnected;
    }
    subscribe(destination: string, callback: (msg: unknown) => void) {
      return subscribeMock(destination, callback);
    }
    publish(frame: { destination: string; body?: string }) {
      return publishMock(frame);
    }
  }
  return { Client: MockClient };
});

vi.mock("sockjs-client", () => ({
  default: vi.fn(),
}));

function TestConsumer() {
  const { connected, subscribe, publish } = useWebSocket();
  return (
    <div>
      <span>{connected ? "connected" : "not connected"}</span>
      <button onClick={() => subscribe("/topic/notifications/1", () => {})}>subscribe</button>
      <button onClick={() => publish("/app/conversations/5/send", { content: "hi" })}>publish</button>
    </div>
  );
}

function mockUser(id: number | null) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: id === null ? null : { id, email: "a@example.com", userType: "ELDER" as never, primaryRole: "ELDER" as never, roles: [] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

describe("WebSocketContext", () => {
  beforeEach(() => {
    activateMock = vi.fn();
    deactivateMock = vi.fn();
    subscribeMock = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    publishMock = vi.fn();
    lastClientConfig = null;
    mockClientConnected = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not open a STOMP client when there is no logged-in user", () => {
    mockUser(null);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    expect(activateMock).not.toHaveBeenCalled();
    expect(screen.getByText("not connected")).toBeInTheDocument();
  });

  it("activates a STOMP client and reflects connected once onConnect fires", async () => {
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    expect(activateMock).toHaveBeenCalledTimes(1);

    // Simulate the real Client flipping connected and invoking its own onConnect callback.
    mockClientConnected = true;
    (lastClientConfig!.onConnect as () => void)();

    await waitFor(() => expect(screen.getByText("connected")).toBeInTheDocument());
  });

  it("subscribe() is a no-op before the socket reports connected", () => {
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    screen.getByText("subscribe").click();
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("subscribe() delegates to the underlying STOMP client once connected", async () => {
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    mockClientConnected = true;
    (lastClientConfig!.onConnect as () => void)();
    await waitFor(() => expect(screen.getByText("connected")).toBeInTheDocument());

    screen.getByText("subscribe").click();
    expect(subscribeMock).toHaveBeenCalledWith("/topic/notifications/1", expect.any(Function));
  });

  it("publish() is a no-op before the socket reports connected", () => {
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    screen.getByText("publish").click();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("publish() delegates to the underlying STOMP client, JSON-encoding the body", async () => {
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    mockClientConnected = true;
    (lastClientConfig!.onConnect as () => void)();
    await waitFor(() => expect(screen.getByText("connected")).toBeInTheDocument());
    publishMock = vi.fn(); // drop the onConnect-triggered initial presence heartbeat

    screen.getByText("publish").click();
    expect(publishMock).toHaveBeenCalledWith({ destination: "/app/conversations/5/send", body: JSON.stringify({ content: "hi" }) });
  });

  it("sends an immediate presence heartbeat on connect and keeps pinging on an interval", () => {
    vi.useFakeTimers();
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    mockClientConnected = true;
    (lastClientConfig!.onConnect as () => void)();

    expect(publishMock).toHaveBeenCalledWith({ destination: "/app/presence/heartbeat" });
    expect(publishMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20000);
    expect(publishMock).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(20000);
    expect(publishMock).toHaveBeenCalledTimes(3);
  });

  it("stops sending heartbeats once disconnected", () => {
    vi.useFakeTimers();
    mockUser(7);
    render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    mockClientConnected = true;
    (lastClientConfig!.onConnect as () => void)();
    expect(publishMock).toHaveBeenCalledTimes(1);

    mockClientConnected = false;
    (lastClientConfig!.onDisconnect as () => void)();
    publishMock = vi.fn();

    vi.advanceTimersByTime(60000);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("deactivates the client on unmount", () => {
    mockUser(7);
    const { unmount } = render(
      <WebSocketProvider>
        <TestConsumer />
      </WebSocketProvider>
    );

    unmount();
    expect(deactivateMock).toHaveBeenCalledTimes(1);
  });
});
