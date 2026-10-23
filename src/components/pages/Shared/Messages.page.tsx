import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Card,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FiArrowLeft, FiMessageCircle, FiSend } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import { useMessagingService } from "../../../services/useMessagingService";
import type { ConversationResponse, MessageResponse } from "../../../services/useMessagingService";
import { usePresenceService } from "../../../services/usePresenceService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { formatDateTime, getErrorMessage } from "../../../utils/helper";

const PAGE_SIZE = 50;

const presenceDotSx = (online?: boolean) => ({
  "& .MuiBadge-dot": {
    backgroundColor: online ? "success.main" : "grey.400",
    border: "2px solid",
    borderColor: "background.paper",
  },
});

const initialsOf = (name: string | null): string =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";

/**
 * Shared across the Family, Caretaker and Elder shells (messaging is user-to-user, not
 * role-scoped — mounted at <role>/messages in each of their own routes files, same
 * "outside-the-sidebar, reached from elsewhere" pattern as account-settings/notifications).
 * Classic two-pane chat: conversation list left, thread right, collapsing to a stacked
 * mobile view (list OR thread, never both) below `md` - adapted from
 * ~/ElderSphere/eldersphere-fe's own Messages.page, with real scope cuts to match this
 * backend's actual Prompt 89 contract: no typing indicator (no such STOMP mapping exists -
 * see WebSocketAuthChannelInterceptor's own comment), no file attachment (no generic
 * upload endpoint exists yet - see Prompt 91's useReviewService.ts for the same note), and
 * plain page/size history instead of cursor-based "beforeId" paging (ConversationController
 * only supports the former).
 *
 * Realtime send is STOMP-only (there's no REST "send a message" endpoint on this backend by
 * design - see ChatWebSocketController) - this page publishes directly to
 * /app/conversations/{id}/send and relies entirely on the /topic/conversations/{id}
 * broadcast to append the persisted message, including the sender's own (confirmed live
 * during Prompt 89's own verification: the broadcast reaches every subscriber, sender
 * included). There's deliberately no local optimistic echo for this reason - there's no
 * synchronous "message created" response to optimistically render from either.
 */
const MessagesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const messagingService = useMessagingService();
  const presenceService = usePresenceService();
  const { connected, subscribe, publish } = useWebSocket();
  const { user } = useAuthenticatedUser();

  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(0);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<number, boolean>>({});
  const [bottomTick, setBottomTick] = useState(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setListError(null);
    try {
      const page = await messagingService.getMyConversations();
      setConversations(page.content);
    } catch (error) {
      setListError(getErrorMessage(error, "Could not load your conversations"));
    } finally {
      setLoadingConversations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Initial presence snapshot for everyone in the list (so both the list dots and the
  // thread header have something to show before the first /topic/presence event arrives).
  const otherUserIdsKey = conversations.map((c) => c.otherUserId).join(",");
  useEffect(() => {
    if (conversations.length === 0) return;
    const ids = Array.from(new Set(conversations.map((c) => c.otherUserId)));
    presenceService
      .getStatus(ids)
      .then((status) => {
        setPresence((prev) => {
          const next = { ...prev };
          Object.entries(status).forEach(([id, online]) => {
            next[Number(id)] = online;
          });
          return next;
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserIdsKey]);

  useEffect(() => {
    return subscribe("/topic/presence", (frame) => {
      try {
        const payload: { userId: number; online: boolean } = JSON.parse(frame.body);
        setPresence((prev) => ({ ...prev, [payload.userId]: payload.online }));
      } catch {
        // ignore malformed presence frames
      }
    });
  }, [subscribe]);

  // Deep-link from a booking's "Message caretaker" action: ?conversationId=123.
  useEffect(() => {
    const fromQuery = searchParams.get("conversationId");
    if (fromQuery) setActiveId(Number(fromQuery));
  }, [searchParams]);

  const openConversation = useCallback(
    async (id: number) => {
      setActiveId(id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("conversationId", String(id));
        return next;
      });
      setLoadingMessages(true);
      setThreadError(null);
      try {
        const page = await messagingService.getMessages(id, 0, PAGE_SIZE);
        setMessages(page.content);
        setHasMoreNewer(!page.last);
        setNextPage(1);
        setBottomTick((t) => t + 1);
        await messagingService.markRead(id);
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
      } catch (error) {
        setThreadError(getErrorMessage(error, "Could not load this conversation"));
      } finally {
        setLoadingMessages(false);
      }
    },
    [messagingService, setSearchParams]
  );

  // Auto-open once the list has loaded and a conversationId is pending from the query string.
  useEffect(() => {
    const fromQuery = searchParams.get("conversationId");
    if (fromQuery && !loadingConversations && conversations.some((c) => c.id === Number(fromQuery)) && messages.length === 0) {
      openConversation(Number(fromQuery));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConversations, conversations]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bottomTick]);

  // Backend history is plain page/size (ascending, oldest-first within a page, Prompt 89) -
  // not cursor-based like ElderSphere's own "beforeId" infinite scroll, so "load more"
  // continues forward in time (the next page), not backward.
  const loadMoreMessages = async () => {
    if (!activeId || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await messagingService.getMessages(activeId, nextPage, PAGE_SIZE);
      setMessages((prev) => [...prev, ...page.content]);
      setHasMoreNewer(!page.last);
      setNextPage((p) => p + 1);
    } catch (error) {
      setThreadError(getErrorMessage(error, "Could not load more messages"));
    } finally {
      setLoadingMore(false);
    }
  };

  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = activeId;

  // Subscribe to every conversation the user is part of so the list updates live (new
  // preview + unread bump) even for threads that aren't currently open, and the open
  // thread appends incoming messages live without a reload or poll.
  const conversationIdsKey = conversations.map((c) => c.id).join(",");
  useEffect(() => {
    const unsubscribers = conversations.map((conversation) =>
      subscribe(`/topic/conversations/${conversation.id}`, (frame) => {
        let incoming: MessageResponse;
        try {
          incoming = JSON.parse(frame.body);
        } catch {
          return;
        }
        const isMine = incoming.senderId === user?.id;
        if (activeIdRef.current === conversation.id) {
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          setBottomTick((t) => t + 1);
          if (!isMine) messagingService.markRead(conversation.id).catch(() => {});
        }
        setConversations((prev) =>
          [...prev]
            .map((c) =>
              c.id === conversation.id
                ? { ...c, lastMessageAt: incoming.sentAt, unreadCount: activeIdRef.current === conversation.id || isMine ? 0 : c.unreadCount + 1 }
                : c
            )
            .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
        );
      })
    );
    return () => unsubscribers.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, conversationIdsKey, user?.id]);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setSendError(null);
    if (!connected) {
      setSendError("Not connected — reconnecting, try again in a moment.");
      return;
    }
    publish(`/app/conversations/${activeId}/send`, { content: draft.trim() });
    setDraft("");
  };

  const showList = !isMobile || !activeId;
  const showThread = !isMobile || Boolean(activeId);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <FiMessageCircle size={22} />
        <Typography variant="h5" fontWeight={800}>
          Messages
        </Typography>
      </Stack>

      <Card variant="outlined" sx={{ display: "flex", height: { xs: "calc(100vh - 220px)", md: 560 }, overflow: "hidden" }}>
        {showList && (
          <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0, borderRight: { md: "1px solid" }, borderColor: "divider", overflowY: "auto" }}>
            {listError && (
              <Alert severity="error" sx={{ m: 1.5 }}>
                {listError}
              </Alert>
            )}
            {loadingConversations ? (
              <Stack spacing={1} p={1.5}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={56} />
                ))}
              </Stack>
            ) : conversations.length === 0 ? (
              <Box sx={{ py: 8, px: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
                <FiMessageCircle size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  No conversations yet
                </Typography>
                <Typography variant="caption">Message a caretaker from a booking to start one.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {conversations.map((conversation) => (
                  <ListItemButton key={conversation.id} selected={conversation.id === activeId} onClick={() => openConversation(conversation.id)}>
                    <ListItemAvatar>
                      <Badge color="error" badgeContent={conversation.unreadCount} max={99}>
                        <Badge
                          overlap="circular"
                          variant="dot"
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          sx={presenceDotSx(presence[conversation.otherUserId])}
                          aria-label={presence[conversation.otherUserId] ? "Online" : "Offline"}
                        >
                          <Avatar>{initialsOf(conversation.otherUserName)}</Avatar>
                        </Badge>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={conversation.otherUserName ?? "User"}
                      secondary={conversation.lastMessageAt ? formatDateTime(conversation.lastMessageAt) : "No messages yet"}
                      slotProps={{
                        primary: { fontWeight: conversation.unreadCount > 0 ? 700 : 500, noWrap: true },
                        secondary: { noWrap: true },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}

        {showThread && (
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {!activeConversation ? (
              <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
                <FiMessageCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Select a conversation
                </Typography>
                <Typography variant="body2">Pick someone from the list to see your messages.</Typography>
              </Box>
            ) : (
              <>
                <Stack direction="row" alignItems="center" spacing={1.5} px={2} py={1.5} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                  {isMobile && (
                    <IconButton size="small" onClick={() => setActiveId(null)} aria-label="Back to conversations">
                      <FiArrowLeft size={16} />
                    </IconButton>
                  )}
                  <Badge
                    overlap="circular"
                    variant="dot"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    sx={presenceDotSx(presence[activeConversation.otherUserId])}
                    aria-label={`${activeConversation.otherUserName ?? "This user"} is ${presence[activeConversation.otherUserId] ? "online" : "offline"}`}
                  >
                    <Avatar sx={{ width: 34, height: 34, fontSize: 13 }}>{initialsOf(activeConversation.otherUserName)}</Avatar>
                  </Badge>
                  <Typography fontWeight={700} noWrap>
                    {activeConversation.otherUserName ?? "User"}
                  </Typography>
                </Stack>

                <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  {threadError && <Alert severity="error">{threadError}</Alert>}
                  {loadingMessages ? (
                    <Stack spacing={1}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={40} width="60%" />
                      ))}
                    </Stack>
                  ) : messages.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" mt={4}>
                      No messages yet — say hello!
                    </Typography>
                  ) : (
                    <>
                      {messages.map((message) => {
                        const isMine = message.senderId === user?.id;
                        return (
                          <Box
                            key={message.id}
                            sx={{
                              alignSelf: isMine ? "flex-end" : "flex-start",
                              maxWidth: "75%",
                              bgcolor: isMine ? "primary.main" : "action.hover",
                              color: isMine ? "primary.contrastText" : "text.primary",
                              borderRadius: "14px",
                              borderBottomRightRadius: isMine ? 4 : 14,
                              borderBottomLeftRadius: isMine ? 14 : 4,
                              px: 1.75,
                              py: 1,
                            }}
                          >
                            {message.content && (
                              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {message.content}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ opacity: 0.75, display: "block", textAlign: "right", mt: 0.25 }}>
                              {formatDateTime(message.sentAt)}
                            </Typography>
                          </Box>
                        );
                      })}
                      {hasMoreNewer && (
                        <Box textAlign="center" mt={1}>
                          <Button variant="text" size="small" loading={loadingMore} onClick={loadMoreMessages}>
                            Load more
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                  <div ref={threadEndRef} />
                </Box>

                <Stack component="form" direction="row" spacing={1} alignItems="flex-end" onSubmit={handleSend} sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <TextField
                    placeholder="Type a message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    maxRows={4}
                    error={sendError ?? undefined}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as unknown as React.FormEvent);
                      }
                    }}
                  />
                  <Button type="submit" variant="contained" disabled={!draft.trim()} aria-label="Send message" sx={{ minWidth: 0, px: 2 }}>
                    <FiSend size={16} />
                  </Button>
                </Stack>
              </>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default MessagesPage;
