import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  Pagination,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiCalendar, FiRepeat } from "react-icons/fi";
import Button from "../../../atoms/Button/Button";
import ConfirmDialog from "../../../atoms/ConfirmDialog/ConfirmDialog";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingResponse } from "../../../../services/useBookingService";
import { usePresenceService } from "../../../../services/usePresenceService";
import { useWebSocket } from "../../../../contexts/WebSocketContext";
import { BookingStatusEnum } from "../../../../utils/enums";
import { formatDate, formatTime, getErrorMessage } from "../../../../utils/helper";

const PAGE_SIZE = 10;
const CANCELLABLE: BookingStatusEnum[] = [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED, BookingStatusEnum.IN_PROGRESS];
const STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

/**
 * The family member's own "bookings I've made" listing - GET /bookings/me/as-family
 * (BookingController, Prompt 77) already scopes to the caller, so there's no separate
 * ownership filter to apply here. Mirrors ElderProfiles.page.tsx's plain MUI Table
 * listing shape rather than ElderSphere's CrudModule template, which doesn't exist in
 * this project.
 */
const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const bookingService = useBookingService();
  const presenceService = usePresenceService();
  const { subscribe } = useWebSocket();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ booking: BookingResponse; cancelSeries: boolean } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<number, boolean>>({});

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await bookingService.getMyBookingsAsFamily(page, PAGE_SIZE);
      setBookings(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load your bookings"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Initial presence snapshot for every distinct caretaker on this page (so the dot has
  // something to show before the first live /topic/presence event arrives for them).
  const caretakerUserIdsKey = bookings.map((b) => b.caretakerUserId).filter((id): id is number => id != null).join(",");
  useEffect(() => {
    const ids = Array.from(new Set(bookings.map((b) => b.caretakerUserId).filter((id): id is number => id != null)));
    if (ids.length === 0) return;
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
  }, [caretakerUserIdsKey]);

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

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const { booking, cancelSeries } = cancelTarget;
    setCancellingId(booking.id);
    setActionError(null);
    try {
      await bookingService.cancel(booking.id, cancelSeries);
      setSuccessMessage(cancelSeries ? "Recurring series cancelled" : "Booking cancelled");
      fetchPage();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not cancel this booking"));
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiCalendar size={22} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            My Bookings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bookings you've made for the people you care for.
          </Typography>
        </Box>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : bookings.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiCalendar size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No bookings yet
          </Typography>
          <Typography variant="body2">
            <Button variant="text" size="small" onClick={() => navigate("/family/services")}>
              Browse services
            </Button>{" "}
            to book your first appointment.
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Elder</TableCell>
                  <TableCell>Caretaker</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>When</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/family/bookings/${booking.id}`)}>
                    <TableCell sx={{ fontWeight: 600 }}>{booking.elderName ?? "—"}</TableCell>
                    <TableCell>
                      {booking.caretakerUserId ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              flexShrink: 0,
                              bgcolor: presence[booking.caretakerUserId] ? "success.main" : "grey.400",
                            }}
                            aria-label={presence[booking.caretakerUserId] ? "Online" : "Offline"}
                          />
                          <span>{booking.caretakerName ?? "—"}</span>
                        </Stack>
                      ) : (
                        booking.caretakerName ?? "—"
                      )}
                    </TableCell>
                    <TableCell>{booking.serviceName ?? "—"}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <span>
                          {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}
                        </span>
                        {booking.recurringGroupId && (
                          <Chip icon={<FiRepeat size={12} />} label="Recurring" size="small" variant="outlined" sx={{ width: "fit-content" }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{booking.cost != null ? `$${booking.cost}` : "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={booking.status} color={STATUS_COLOR[booking.status]} />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {CANCELLABLE.includes(booking.status) && (
                        <Tooltip title="Cancel">
                          <span>
                            <Button
                              variant="text"
                              size="small"
                              color="error"
                              disabled={cancellingId === booking.id}
                              onClick={() => setCancelTarget({ booking, cancelSeries: false })}
                            >
                              Cancel
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {booking.recurringGroupId && CANCELLABLE.includes(booking.status) && (
                        <Tooltip title="Cancel the whole recurring series">
                          <span>
                            <Button
                              variant="text"
                              size="small"
                              color="error"
                              disabled={cancellingId === booking.id}
                              onClick={() => setCancelTarget({ booking, cancelSeries: true })}
                            >
                              Cancel Series
                            </Button>
                          </span>
                        </Tooltip>
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

      <ConfirmDialog
        open={cancelTarget != null}
        title={cancelTarget?.cancelSeries ? "Cancel the whole recurring series?" : "Cancel this booking?"}
        description={
          cancelTarget?.cancelSeries
            ? "Every booking in this recurring series will be cancelled. This cannot be undone."
            : "This cannot be undone."
        }
        confirmLabel={cancelTarget?.cancelSeries ? "Cancel Series" : "Cancel Booking"}
        cancelLabel="Keep It"
        confirming={cancellingId === cancelTarget?.booking.id}
        onConfirm={handleCancel}
        onClose={() => setCancelTarget(null)}
      />

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default BookingsPage;
