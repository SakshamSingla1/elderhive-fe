import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiCalendar, FiMessageCircle, FiRepeat } from "react-icons/fi";
import Button from "../../../atoms/Button/Button";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingResponse } from "../../../../services/useBookingService";
import { useReviewService } from "../../../../services/useReviewService";
import { useMessagingService } from "../../../../services/useMessagingService";
import { usePresenceService } from "../../../../services/usePresenceService";
import { useWebSocket } from "../../../../contexts/WebSocketContext";
import { BookingStatusEnum } from "../../../../utils/enums";
import { formatDate, formatTime, getErrorMessage } from "../../../../utils/helper";

const CANCELLABLE: BookingStatusEnum[] = [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED, BookingStatusEnum.IN_PROGRESS];
const STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

/**
 * Also doubles as the booking flow's confirmation screen - BookingForm.page.tsx navigates
 * here right after create() with `state.justCreated`, which shows the banner below but
 * doesn't change the page's own permanent heading (unlike ElderSphere's own BookingDetail,
 * which is always titled "Booking Confirmation" even when viewed long after the fact).
 */
const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated);
  const bookingService = useBookingService();
  const reviewService = useReviewService();
  const messagingService = useMessagingService();
  const presenceService = usePresenceService();
  const { subscribe } = useWebSocket();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [series, setSeries] = useState<BookingResponse[]>([]);
  const [hasReview, setHasReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<"single" | "series" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [caretakerOnline, setCaretakerOnline] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await bookingService.getById(bookingId);
      setBooking(result);
      if (result.recurringGroupId) {
        setSeries(await bookingService.getRecurringGroup(result.recurringGroupId));
      } else {
        setSeries([]);
      }
      if (result.status === BookingStatusEnum.COMPLETED) {
        try {
          await reviewService.getByBooking(bookingId);
          setHasReview(true);
        } catch {
          // 404 (REVIEW_NOT_FOUND) just means no review exists yet — not a real error.
          setHasReview(false);
        }
      }
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this booking"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) load();
  }, [bookingId, load]);

  const caretakerUserId = booking?.caretakerUserId ?? null;

  useEffect(() => {
    if (!caretakerUserId) return;
    presenceService
      .getStatus([caretakerUserId])
      .then((status) => setCaretakerOnline(Boolean(status[caretakerUserId])))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretakerUserId]);

  useEffect(() => {
    if (!caretakerUserId) return undefined;
    return subscribe("/topic/presence", (frame) => {
      try {
        const payload: { userId: number; online: boolean } = JSON.parse(frame.body);
        if (payload.userId === caretakerUserId) setCaretakerOnline(payload.online);
      } catch {
        // ignore malformed presence frames
      }
    });
  }, [subscribe, caretakerUserId]);

  const handleMessageCaretaker = async () => {
    if (!caretakerUserId || startingConversation) return;
    setMessageError(null);
    setStartingConversation(true);
    try {
      const conversation = await messagingService.getOrCreateConversation({ otherUserId: caretakerUserId, bookingId: booking!.id });
      navigate(`/family/messages?conversationId=${conversation.id}`);
    } catch (err) {
      setMessageError(getErrorMessage(err, "Could not start a conversation"));
    } finally {
      setStartingConversation(false);
    }
  };

  const confirmCancel = async () => {
    if (!booking || !cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await bookingService.cancel(booking.id, cancelTarget === "series");
      setCancelTarget(null);
      load();
    } catch (err) {
      setCancelError(getErrorMessage(err, "Could not cancel this booking"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} width={240} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  if (loadError || !booking) {
    return <Alert severity="error">{loadError ?? "Booking not found"}</Alert>;
  }

  const isCancellable = CANCELLABLE.includes(booking.status);
  const seriesHasCancellable = series.some((s) => CANCELLABLE.includes(s.status));

  return (
    <div>
      <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate("/family/bookings")} sx={{ mb: 2 }}>
        Back to bookings
      </Button>

      {justCreated && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Booking request sent! You'll be notified once the caretaker confirms.
        </Alert>
      )}
      {cancelError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {cancelError}
        </Alert>
      )}
      {messageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {messageError}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <FiCalendar size={22} />
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Booking Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Booking #{booking.id}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip label={booking.status} color={STATUS_COLOR[booking.status]} />
              {booking.recurringGroupId && <Chip icon={<FiRepeat size={14} />} label="Recurring series" variant="outlined" />}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.25}>
            <Row label="Elder" value={booking.elderName ?? "—"} />
            <Row
              label="Caretaker"
              value={
                caretakerUserId ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: caretakerOnline ? "success.main" : "grey.400",
                      }}
                    />
                    <span>{booking.caretakerName ?? "—"}</span>
                    <Typography variant="caption" color="text.secondary">
                      {caretakerOnline ? "Online" : "Offline"}
                    </Typography>
                  </Stack>
                ) : (
                  booking.caretakerName ?? "—"
                )
              }
            />
            <Row label="Service" value={booking.serviceName ?? "—"} />
            <Row label="Date" value={formatDate(booking.scheduledDate)} />
            <Row label="Time" value={formatTime(booking.scheduledTime)} />
            <Row label="Cost" value={booking.cost != null ? `$${booking.cost}` : "—"} />
          </Stack>

          {booking.notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Notes
              </Typography>
              <Typography variant="body2">{booking.notes}</Typography>
            </>
          )}

          {series.length > 1 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Recurring series ({series.length} bookings)
              </Typography>
              <Stack spacing={0.75}>
                {series.map((s) => (
                  <Stack key={s.id} direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {formatDate(s.scheduledDate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                      {formatTime(s.scheduledTime)}
                    </Typography>
                    <Chip size="small" label={s.status} color={STATUS_COLOR[s.status]} />
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1.5} mt={2.5} flexWrap="wrap">
        {isCancellable && (
          <Button variant="outlined" color="error" onClick={() => setCancelTarget("single")}>
            Cancel Booking
          </Button>
        )}
        {booking.recurringGroupId && seriesHasCancellable && (
          <Button variant="outlined" color="error" onClick={() => setCancelTarget("series")}>
            Cancel Entire Series
          </Button>
        )}
        {booking.status === BookingStatusEnum.COMPLETED && (
          <Button variant="outlined" onClick={() => navigate(`/family/reviews?bookingId=${booking.id}`)}>
            {hasReview ? "View Your Review" : "Leave a Review"}
          </Button>
        )}
        {caretakerUserId && (
          <Button variant="outlined" startIcon={<FiMessageCircle size={16} />} loading={startingConversation} onClick={handleMessageCaretaker}>
            Message Caretaker
          </Button>
        )}
      </Stack>

      <Dialog open={cancelTarget != null} onClose={() => !cancelling && setCancelTarget(null)}>
        <DialogTitle>{cancelTarget === "series" ? "Cancel entire series?" : "Cancel this booking?"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {cancelTarget === "series"
              ? "This will cancel every booking in this recurring series. This action cannot be undone."
              : "This action cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            Keep Booking
          </Button>
          <Button color="error" variant="contained" onClick={confirmCancel} loading={cancelling}>
            {cancelTarget === "series" ? "Cancel Entire Series" : "Cancel Booking"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={2}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value}
    </Typography>
  </Stack>
);

export default BookingDetailPage;
