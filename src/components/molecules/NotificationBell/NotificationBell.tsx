import React, { useCallback, useEffect, useState } from "react";
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, ListItemText, Chip, Button } from "@mui/material";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useNotificationService, type NotificationResponseDTO } from "../../../services/useNotificationService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { formatDateTime } from "../../../utils/helper";

const RECENT_ITEMS_CAP = 6;
const POLL_INTERVAL_MS = 30000;

// Ported close to verbatim from ElderSphere's NotificationBell, with its atoms swapped for
// plain MUI (ElderHive has no Button/Chip atom wrappers) and @mui/icons-material/Notifications
// replaced with react-icons' FiBell (ElderHive sources every icon from react-icons only —
// see useSidebarNavItems.ts/DashboardLayout.tsx). Mounted once in DashboardLayout's topbar,
// shared by all four role shells.
const NotificationBell: React.FC = () => {
  const notificationService = useNotificationService();
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();
  const { subscribe } = useWebSocket();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponseDTO[]>([]);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await notificationService.unreadCount();
      setUnreadCount(count);
    } catch {
      // Silently ignore — the bell simply won't badge until the next successful poll.
    }
  }, [notificationService]);

  // Initial load + a 30s poll remain as the fallback source of truth (also covers the
  // window before the socket connects); the WS subscription below layers live updates on
  // top so the badge/menu react the instant a notification is pushed
  // (/topic/notifications/{userId}, see WebSocketConfig on the backend) rather than waiting
  // for the next poll.
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe(`/topic/notifications/${user.id}`, (frame) => {
      let notification: NotificationResponseDTO;
      try {
        notification = JSON.parse(frame.body);
      } catch {
        return;
      }
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [notification, ...prev].slice(0, RECENT_ITEMS_CAP));
    });
    return unsubscribe;
  }, [subscribe, user]);

  const handleOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    try {
      const page = await notificationService.list(0, RECENT_ITEMS_CAP);
      setNotifications(page.content);
    } catch {
      setNotifications([]);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleNotificationClick = async (n: NotificationResponseDTO) => {
    if (!n.isRead) {
      try {
        await notificationService.markAsRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // best-effort
      }
    }
    handleClose();
    if (n.link) navigate(n.link);
  };

  const handleViewAll = () => {
    handleClose();
    const rolePrefix = window.location.pathname.split("/").filter(Boolean)[0];
    navigate(`/${rolePrefix}/notifications`);
  };

  return (
    <>
      <IconButton id="notification-bell-button" onClick={handleOpen} aria-label="Notifications" title="Notifications">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <FiBell size={20} />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{ paper: { sx: { width: 368, maxHeight: 440 } } }}
      >
        <Box px={2.25} py={1.5} display="flex" alignItems="center" gap={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && <Chip label={unreadCount > 99 ? "99+" : unreadCount} size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled sx={{ py: 3, justifyContent: "center" }}>
            <ListItemText primary="You're all caught up" sx={{ textAlign: "center", color: "text.secondary" }} />
          </MenuItem>
        ) : (
          notifications.map((n, idx) => (
            <MenuItem
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              sx={{
                whiteSpace: "normal",
                alignItems: "flex-start",
                gap: 1,
                py: 1.5,
                px: 2.25,
                borderBottom: idx < notifications.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              {/* Unread indicator dot — sits in its own fixed-width column so read and
                  unread rows still align their title text at the same left edge. */}
              <Box sx={{ width: 8, pt: 0.75, flexShrink: 0 }}>
                {!n.isRead && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main" }} />}
              </Box>
              <ListItemText
                primary={n.title}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      {n.message}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                      {formatDateTime(n.createdAt)}
                    </Typography>
                  </>
                }
                primaryTypographyProps={{ fontWeight: n.isRead ? 400 : 700 }}
                sx={{ my: 0 }}
              />
            </MenuItem>
          ))
        )}
        <Divider />
        <Box px={1.5} py={1}>
          <Button fullWidth size="small" onClick={handleViewAll}>
            View all
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;
