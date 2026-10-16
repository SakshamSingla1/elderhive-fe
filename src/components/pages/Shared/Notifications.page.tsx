import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Pagination,
} from "@mui/material";
import { FiBell, FiCheck, FiCheckCircle } from "react-icons/fi";
import { useNotificationService, type NotificationResponseDTO } from "../../../services/useNotificationService";
import { getErrorMessage, formatDateTime } from "../../../utils/helper";

const PAGE_SIZE = 10;

/**
 * Mounted at /{role}/notifications under every route shell — reached via NotificationBell's
 * "View all" link, the same "shared page outside the DB-driven sidebar" pattern
 * AccountSettings.page.tsx established (Prompt 51). Notifications are user-scoped, not
 * role-scoped, so one page serves all four roles rather than duplicating it per role.
 */
const NotificationsPage: React.FC = () => {
  const notificationService = useNotificationService();

  const [notifications, setNotifications] = useState<NotificationResponseDTO[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await notificationService.list(page, PAGE_SIZE);
      setNotifications(response.content);
      setTotalPages(response.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load notifications"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleMarkAsRead = async (id: number) => {
    setMarkingId(id);
    setActionError(null);
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not mark this notification as read"));
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSuccessMessage("All notifications marked as read");
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not mark all notifications as read"));
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FiBell size={22} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Everything that's been sent to you.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<FiCheckCircle size={16} />}
          onClick={handleMarkAllAsRead}
          disabled={markingAll || !hasUnread}
        >
          Mark All Read
        </Button>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : notifications.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiBell size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No notifications yet
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id} hover>
                    <TableCell sx={{ fontWeight: n.isRead ? 400 : 700 }}>{n.title}</TableCell>
                    <TableCell>{n.message}</TableCell>
                    <TableCell>{n.type}</TableCell>
                    <TableCell>
                      {n.isRead ? (
                        <Chip label="Read" size="small" />
                      ) : (
                        <Chip label="Unread" size="small" color="info" />
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(n.createdAt)}</TableCell>
                    <TableCell align="right">
                      {!n.isRead && (
                        <Button
                          size="small"
                          startIcon={<FiCheck size={14} />}
                          disabled={markingId === n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {totalPages > 1 && (
            <Stack alignItems="center" mt={3}>
              <Pagination count={totalPages} page={page + 1} onChange={(_, newPage) => setPage(newPage - 1)} color="primary" />
            </Stack>
          )}
        </>
      )}

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
      <Snackbar open={Boolean(actionError)} autoHideDuration={5000} onClose={() => setActionError(null)}>
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationsPage;
