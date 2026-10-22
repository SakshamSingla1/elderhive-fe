import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
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
  Typography,
} from "@mui/material";
import { FiCalendar, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import WeeklyAvailabilityView from "../../molecules/WeeklyAvailability/WeeklyAvailabilityView";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import { useCaretakerService } from "../../../services/useCaretakerService";
import type { CaretakerAvailabilitySlotDTO } from "../../../services/useCaretakerService";
import { BookingStatusEnum } from "../../../utils/enums";
import { formatDate, formatTime, getErrorMessage } from "../../../utils/helper";

const PAGE_SIZE = 10;
const STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

/**
 * The caretaker's own "bookings families have made with me" listing - GET
 * /bookings/me/as-caretaker (BookingController, Prompt 77) already resolves the caller's
 * own CaretakerProfile server-side, so there's no profile-id lookup needed just to scope
 * the list itself (unlike ElderSphere's own reference, which fetches getMyProfile() first
 * purely to pass its id into a generic search() call). That same profile id IS still
 * needed here for a second, genuinely new reason: reading the caretaker's own
 * CaretakerAvailability (Prompt 66/70) into a collapsible reference panel, so a caretaker
 * can glance at their declared weekly hours while deciding whether to accept a request,
 * without leaving this page for MyProfile.
 */
const CaretakerBookingsPage: React.FC = () => {
  const bookingService = useBookingService();
  const caretakerService = useCaretakerService();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [availabilitySlots, setAvailabilitySlots] = useState<CaretakerAvailabilitySlotDTO[]>([]);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    caretakerService
      .getMyProfile()
      .then((profile) => caretakerService.getAvailability(profile.id))
      .then(setAvailabilitySlots)
      .catch(() => {
        // No profile yet (a CARETAKER who hasn't completed it) - the panel just stays
        // empty, not worth its own error banner on top of the bookings list's own.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await bookingService.getMyBookingsAsCaretaker(page, PAGE_SIZE);
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

  const runAction = async (booking: BookingResponse, action: () => Promise<unknown>, successText: string) => {
    setActingId(booking.id);
    setActionError(null);
    try {
      await action();
      setSuccessMessage(successText);
      fetchPage();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not update this booking"));
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = (booking: BookingResponse) => {
    if (!window.confirm("Decline this booking? The family will be notified and this can't be undone.")) return;
    runAction(booking, () => bookingService.cancel(booking.id, false), "Booking declined");
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
            Accept, start, and complete the bookings families have made with you.
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Button
            variant="text"
            size="small"
            endIcon={showAvailability ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            onClick={() => setShowAvailability((v) => !v)}
          >
            Your Weekly Availability
          </Button>
          <Collapse in={showAvailability} unmountOnExit>
            <Box mt={1.5}>
              <WeeklyAvailabilityView slots={availabilitySlots} />
            </Box>
          </Collapse>
        </CardContent>
      </Card>

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
          <Typography variant="body2">Families will see you once your profile is verified and they book a service.</Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Elder</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>When</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{booking.elderName ?? "—"}</TableCell>
                    <TableCell>{booking.serviceName ?? "—"}</TableCell>
                    <TableCell>
                      {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}
                    </TableCell>
                    <TableCell>{booking.notes || "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={booking.status} color={STATUS_COLOR[booking.status]} />
                    </TableCell>
                    <TableCell align="right">
                      {booking.status === BookingStatusEnum.PENDING && (
                        <>
                          <Button
                            variant="text"
                            size="small"
                            disabled={actingId === booking.id}
                            onClick={() => runAction(booking, () => bookingService.confirm(booking.id), "Booking confirmed")}
                          >
                            Confirm
                          </Button>
                          <Button variant="text" size="small" color="error" disabled={actingId === booking.id} onClick={() => handleDecline(booking)}>
                            Decline
                          </Button>
                        </>
                      )}
                      {booking.status === BookingStatusEnum.CONFIRMED && (
                        <Button
                          variant="text"
                          size="small"
                          disabled={actingId === booking.id}
                          onClick={() => runAction(booking, () => bookingService.start(booking.id), "Visit started")}
                        >
                          Start Visit
                        </Button>
                      )}
                      {booking.status === BookingStatusEnum.IN_PROGRESS && (
                        <Button
                          variant="text"
                          size="small"
                          disabled={actingId === booking.id}
                          onClick={() => runAction(booking, () => bookingService.complete(booking.id), "Booking marked complete")}
                        >
                          Mark Complete
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
    </Box>
  );
};

export default CaretakerBookingsPage;
