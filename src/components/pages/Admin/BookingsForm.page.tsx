import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";
import Select from "../../atoms/Select/Select";
import Button from "../../atoms/Button/Button";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import { BookingStatusEnum } from "../../../utils/enums";
import { formatDate, formatTime, getErrorMessage } from "../../../utils/helper";

const BOOKINGS_LISTING_PATH = "/admin/bookings";
const STATUS_OPTIONS = Object.values(BookingStatusEnum).map((status) => ({ value: status, label: status }));
const STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

/**
 * Admin-only override page: read-only context (who/what/when/cost/notes) plus a Status
 * select that, on submit, calls PUT .../admin-override-status (Prompt 80's backend
 * addendum) - jumps the booking to ANY status directly, bypassing confirm/start/complete's
 * own linear-lifecycle gate entirely (an admin isn't limited to the same one-step-at-a-time
 * path a caretaker is).
 */
const AdminBookingsFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const bookingService = useBookingService();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatusEnum>(BookingStatusEnum.PENDING);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await bookingService.getById(bookingId);
      setBooking(result);
      setSelectedStatus(result.status);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this booking"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) load();
  }, [bookingId, load]);

  const handleSubmit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await bookingService.adminOverrideStatus(bookingId, selectedStatus);
      navigate(BOOKINGS_LISTING_PATH);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Could not override this booking's status"));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
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

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate(BOOKINGS_LISTING_PATH)}>
          Back to bookings
        </Button>
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiCalendar size={22} />
        <Typography variant="h5" fontWeight={800}>
          Booking #{booking.id}
        </Typography>
        <Chip size="small" label={booking.status} color={STATUS_COLOR[booking.status]} />
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1.25}>
            <Row label="Elder" value={booking.elderName ?? `#${booking.elderProfileId}`} />
            <Row label="Caretaker" value={booking.caretakerName ?? `#${booking.caretakerId}`} />
            <Row label="Service" value={booking.serviceName ?? "—"} />
            <Row label="Date" value={formatDate(booking.scheduledDate)} />
            <Row label="Time" value={formatTime(booking.scheduledTime)} />
            <Row label="Cost" value={booking.cost != null ? `$${booking.cost}` : "—"} />
            {booking.recurringGroupId && <Row label="Recurring Group" value={booking.recurringGroupId} />}
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
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Stack spacing={2.5}>
            <Select label="Status" value={selectedStatus} options={STATUS_OPTIONS} onChange={setSelectedStatus} />
            <Box>
              <Button variant="contained" loading={saving} onClick={handleSubmit}>
                Override Status
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={2}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value}
    </Typography>
  </Stack>
);

export default AdminBookingsFormPage;
