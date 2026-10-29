import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Chip, Pagination, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { FiCalendar } from "react-icons/fi";
import Select from "../../atoms/Select/Select";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import { BookingStatusEnum } from "../../../utils/enums";
import { formatDate, formatTime, getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const PAGE_SIZE = 10;
const ALL_STATUSES = "ALL";
const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUSES, label: "All statuses" },
  ...Object.values(BookingStatusEnum).map((status) => ({ value: status, label: formatEnumLabel(status) })),
];
const STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

/**
 * Admin oversight - every booking on the platform (GET /api/v1/bookings, BOOKING_MANAGE-
 * gated, Prompt 80's own backend addendum - Prompts 75-78 never built this). Clicking a
 * row opens BookingsForm.page.tsx, where an admin can override its status directly.
 */
const AdminBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const bookingService = useBookingService();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await bookingService.getAll({
        page,
        size: PAGE_SIZE,
        status: statusFilter === ALL_STATUSES ? undefined : (statusFilter as BookingStatusEnum),
      });
      setBookings(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load bookings"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiCalendar size={22} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Bookings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All bookings across the platform.
          </Typography>
        </Box>
      </Stack>

      <Select
        label="Status"
        sx={{ minWidth: 200, mb: 3 }}
        value={statusFilter}
        options={STATUS_FILTER_OPTIONS}
        onChange={(value) => {
          setStatusFilter(value);
          setPage(0);
        }}
      />

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
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
            No bookings found
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Elder</TableCell>
                  <TableCell>Caretaker</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>When</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/bookings/${booking.id}`)}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{booking.elderName ?? `#${booking.elderProfileId}`}</TableCell>
                    <TableCell>{booking.caretakerName ?? `#${booking.caretakerId}`}</TableCell>
                    <TableCell>{booking.serviceName ?? "—"}</TableCell>
                    <TableCell>
                      {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}
                    </TableCell>
                    <TableCell>{booking.cost != null ? `$${booking.cost}` : "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={formatEnumLabel(booking.status)} color={STATUS_COLOR[booking.status]} />
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
    </Box>
  );
};

export default AdminBookingsPage;
