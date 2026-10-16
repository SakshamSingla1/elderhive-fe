import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthenticatedUser } from "./AuthenticatedUserContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
// Unlike ElderSphere's API_BASE_URL (which bakes in "/api/v1" and has to be stripped for
// the socket), ElderHive's is already just the bare host (see services/index.ts) — the
// backend's own WebSocketConfig registers /ws at the servlet root, so this is used as-is.
const WS_BASE_URL = API_BASE_URL;

type SubscribeCallback = (message: IMessage) => void;

interface WebSocketContextValue {
  connected: boolean;
  /** Subscribe to a STOMP topic; returns an unsubscribe function. No-ops (and returns a no-op) while disconnected. */
  subscribe: (destination: string, callback: SubscribeCallback) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  subscribe: () => () => {},
});

// App-wide STOMP-over-SockJS connection, live for the lifetime of an authenticated session
// (see WebSocketJwtHandshakeInterceptor/WebSocketAuthChannelInterceptor on the backend for
// how the handshake and /topic/notifications/{userId} subscriptions are authorized).
// Reconnects automatically on drop (Client#reconnectDelay); consumers subscribe/unsubscribe
// per-topic via `subscribe` rather than touching the underlying client.
//
// No ?token= query param (unlike ElderSphere): ElderHive's handshake reads the same
// "accessToken" httpOnly cookie every REST call already sends — SockJS's withCredentials
// option is what makes its XHR-fallback transports include that cookie cross-port in local
// dev; a same-site cookie rides along on the native WebSocket upgrade automatically either way.
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthenticatedUser();
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!user) {
      setConnected(false);
      return;
    }

    // @types/sockjs-client's Options interface doesn't declare withCredentials at all even
    // though the real runtime library supports it (the types are just outdated/incomplete) -
    // double-cast through unknown since the two types share no properties at all, which
    // trips an extra "no overlap" TS check beyond the usual excess-property check.
    const sockJsOptions = { withCredentials: true } as unknown as SockJS.Options;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`, undefined, sockJsOptions),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    clientRef.current = client;
    client.activate();

    return () => {
      setConnected(false);
      clientRef.current = null;
      client.deactivate();
    };
    // Re-run only when the identity of the logged-in user changes (login/logout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      connected,
      subscribe: (destination, callback) => {
        const client = clientRef.current;
        if (!client || !client.connected) return () => {};
        let sub: StompSubscription | null = client.subscribe(destination, callback);
        return () => {
          try {
            sub?.unsubscribe();
          } catch {
            // socket may already be closed/deactivated — nothing to clean up
          }
          sub = null;
        };
      },
    }),
    [connected]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => useContext(WebSocketContext);
