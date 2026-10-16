import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAuthenticatedUser } from "./AuthenticatedUserContext";
import { WebSocketProvider, useWebSocket } from "./WebSocketContext";

vi.mock("./AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

let activateMock: () => void;
let deactivateMock: () => void;
let subscribeMock: (destination: string, callback: (msg: unknown) => void) => { unsubscribe: () => void };
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
  }
  return { Client: MockClient };
});

vi.mock("sockjs-client", () => ({
  default: vi.fn(),
}));

function TestConsumer() {
  const { connected, subscribe } = useWebSocket();
  return (
    <div>
      <span>{connected ? "connected" : "not connected"}</span>
      <button onClick={() => subscribe("/topic/notifications/1", () => {})}>subscribe</button>
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
    lastClientConfig = null;
    mockClientConnected = false;
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
