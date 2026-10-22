import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Chip, Pagination, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { FiAlertTriangle } from "react-icons/fi";
import Select from "../../atoms/Select/Select";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import type { EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { EmergencyAlertStatusEnum } from "../../../utils/enums";
import { formatDateTime, getErrorMessage } from "../../../utils/helper";

const PAGE_SIZE = 10;
const ALL_STATUSES = "ALL";
const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUSES, label: "All statuses" },
  ...Object.values(EmergencyAlertStatusEnum).map((status) => ({ value: status, label: status })),
];
const STATUS_COLOR: Record<EmergencyAlertStatusEnum, "error" | "warning" | "success"> = {
  TRIGGERED: "error",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
};

/**
 * Admin oversight - every emergency alert on the platform (GET /api/v1/emergency-alerts,
 * EMERGENCY_DISPATCH-gated, Prompt 87's own backend addendum - Prompts 81-86 never built
 * this). Clicking a row opens EmergencyAlertsForm.page.tsx for the full context and a
 * manual dispatch override. Subscribes to the same /topic/emergency-alerts broadcast the
 * Caretaker Emergency page does (Prompt 87's other addendum) so a claim/resolve/override
 * from anywhere refreshes this list live, not just on next page load.
 */
const AdminEmergencyAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const emergencyAlertService = useEmergencyAlertService();
  const { subscribe } = useWebSocket();

  const [alerts, setAlerts] = useState<EmergencyAlertResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await emergencyAlertService.getAll({
        page,
        size: PAGE_SIZE,
        status: statusFilter === ALL_STATUSES ? undefined : (statusFilter as EmergencyAlertStatusEnum),
      });
      setAlerts(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load emergency alerts"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    const unsubscribe = subscribe("/topic/emergency-alerts", () => fetchPage());
    return unsubscribe;
  }, [subscribe, fetchPage]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiAlertTriangle size={22} color="#C0392B" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Emergency Alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every SOS alert across the platform, updated live.
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
      ) : alerts.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiAlertTriangle size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No emergency alerts found
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
                  <TableCell>Address</TableCell>
                  <TableCell>Triggered</TableCell>
                  <TableCell>Responder</TableCell>
                  <TableCell>Response Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/emergency-alerts/${alert.id}`)}>
                    <TableCell>{alert.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{alert.elderName ?? `#${alert.elderProfileId}`}</TableCell>
                    <TableCell>{alert.address ?? "Unknown location"}</TableCell>
                    <TableCell>{formatDateTime(alert.createdAt)}</TableCell>
                    <TableCell>{alert.respondingCaretakerName ?? "—"}</TableCell>
                    <TableCell>{alert.responseTimeSeconds != null ? `${alert.responseTimeSeconds}s` : "—"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Chip size="small" label={alert.status} color={STATUS_COLOR[alert.status]} />
                        {alert.isOverdue && <Chip size="small" label="Overdue" color="error" variant="outlined" />}
                      </Stack>
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

export default AdminEmergencyAlertsPage;
