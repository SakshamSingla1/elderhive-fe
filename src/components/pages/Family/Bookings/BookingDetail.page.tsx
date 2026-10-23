import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiCalendar, FiRepeat } from "react-icons/fi";
import Button from "../../../atoms/Button/Button";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingResponse } from "../../../../services/useBookingService";
import { useReviewService } from "../../../../services/useReviewService";
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

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [series, setSeries] = useState<BookingResponse[]>([]);
  const [hasReview, setHasReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<"single" | "series" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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
            <Row label="Caretaker" value={booking.caretakerName ?? "—"} />
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
