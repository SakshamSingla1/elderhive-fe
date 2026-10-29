import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
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
} from "@mui/material";
import { FiAlertTriangle } from "react-icons/fi";
import PageHeader from "../../molecules/PageHeader/PageHeader";
import Button from "../../atoms/Button/Button";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import type { EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { EmergencyAlertStatusEnum, NotificationTypeEnum } from "../../../utils/enums";
import { formatDateTime, getErrorMessage, formatEnumLabel} from "../../../utils/helper";

// A fallback source of truth, same 30s-poll-plus-live-push split NotificationBell.tsx
// already established - also covers the window before the socket connects.
const POLL_INTERVAL_MS = 30000;

const STATUS_COLOR: Record<EmergencyAlertStatusEnum, "error" | "warning" | "success"> = {
  TRIGGERED: "error",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
};

/**
 * A page ElderSphere doesn't have at all (Prompt 86): GET /emergency-alerts/nearby
 * (Prompt 86's own backend addendum - no listing endpoint existed before this, only
 * trigger/claim/resolve/dispatch-override) re-runs Prompt 82's proximity match live
 * against the caretaker's CURRENT location on every load/refresh, so this always reflects
 * alerts actually within range right now - not a stale snapshot of who was notified when
 * an alert first fired. Live updates layer on top via the same per-user WebSocket channel
 * NotificationBell already subscribes to (Phase 7) - a push notification is already sent
 * to every matched caretaker on trigger (EMERGENCY_ALERT_CARETAKER), so receiving one of
 * type EMERGENCY here just means "the list probably changed," triggering a refetch rather
 * than trying to parse structured alert data out of the notification's own free-text body.
 */
const CaretakerEmergencyPage: React.FC = () => {
  const emergencyAlertService = useEmergencyAlertService();
  const caretakerService = useCaretakerService();
  const { subscribe } = useWebSocket();
  const { user } = useAuthenticatedUser();

  const [alerts, setAlerts] = useState<EmergencyAlertResponse[]>([]);
  const [myCaretakerProfileId, setMyCaretakerProfileId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    caretakerService
      .getMyProfile()
      .then((profile) => setMyCaretakerProfileId(profile.id))
      .catch(() => {
        // No profile yet - getNearby() below will 404 with a clear message of its own;
        // nothing extra to show here.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNearby = useCallback(async () => {
    try {
      const result = await emergencyAlertService.getNearby();
      setAlerts(result);
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load nearby alerts"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchNearby();
    const interval = setInterval(fetchNearby, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNearby]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe(`/topic/notifications/${user.id}`, (frame) => {
      try {
        const notification = JSON.parse(frame.body) as { type?: string };
        if (notification.type === NotificationTypeEnum.EMERGENCY) {
          fetchNearby();
        }
      } catch {
        // Malformed push - the next poll still covers it.
      }
    });
    return unsubscribe;
  }, [subscribe, user, fetchNearby]);

  // The per-user notifications channel above only ever fires on trigger() - nothing
  // pushes there when an alert someone's already watching gets claimed/resolved/
  // dispatch-overridden (Prompt 84's endpoints don't notify anyone, they just update the
  // row). /topic/emergency-alerts (Prompt 87's own addendum) is that missing live signal:
  // every status change broadcasts there, so another matched caretaker's list updates
  // the instant someone else claims it, not just on the next 30s poll.
  useEffect(() => {
    const unsubscribe = subscribe("/topic/emergency-alerts", () => fetchNearby());
    return unsubscribe;
  }, [subscribe, fetchNearby]);

  const runAction = async (alert: EmergencyAlertResponse, action: () => Promise<unknown>, successText: string) => {
    setActingId(alert.id);
    setActionError(null);
    try {
      await action();
      setSuccessMessage(successText);
      fetchNearby();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not update this alert"));
    } finally {
      setActingId(null);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<FiAlertTriangle size={20} />}
        title="Emergency Alerts"
        subtitle="Active SOS alerts within your service radius, updated live."
      />

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
      ) : alerts.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiAlertTriangle size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No active alerts nearby
          </Typography>
          <Typography variant="body2">You'll see an alert here the instant one fires within your service radius.</Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Elder</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Distance</TableCell>
                <TableCell>Triggered</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow
                  key={alert.id}
                  hover
                  // A literal low-opacity tint, not a theme token - MUI's default
                  // palette.error has no numbered "50" shade to reference (only main/
                  // light/dark/contrastText), so "error.50" would silently resolve to
                  // nothing rather than actually tinting the row.
                  sx={alert.status === EmergencyAlertStatusEnum.TRIGGERED ? { bgcolor: "rgba(192, 57, 43, 0.08)" } : undefined}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{alert.elderName ?? "—"}</TableCell>
                  <TableCell>{alert.address ?? "Unknown location"}</TableCell>
                  <TableCell>{alert.distanceKm != null ? `${alert.distanceKm.toFixed(1)} km` : "—"}</TableCell>
                  <TableCell>{formatDateTime(alert.createdAt)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Chip size="small" label={formatEnumLabel(alert.status)} color={STATUS_COLOR[alert.status]} />
                      {alert.isOverdue && <Chip size="small" label="Overdue" color="error" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {alert.status === EmergencyAlertStatusEnum.TRIGGERED && (
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={actingId === alert.id}
                        onClick={() => runAction(alert, () => emergencyAlertService.claim(alert.id), "Alert claimed - you're responding")}
                      >
                        Claim
                      </Button>
                    )}
                    {alert.status === EmergencyAlertStatusEnum.ACKNOWLEDGED && alert.respondingCaretakerId === myCaretakerProfileId && (
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={actingId === alert.id}
                        onClick={() => runAction(alert, () => emergencyAlertService.resolve(alert.id), "Alert resolved")}
                      >
                        Resolve
                      </Button>
                    )}
                    {alert.status === EmergencyAlertStatusEnum.ACKNOWLEDGED && alert.respondingCaretakerId !== myCaretakerProfileId && (
                      <Typography variant="caption" color="text.secondary">
                        {alert.respondingCaretakerName ? `${alert.respondingCaretakerName} responding` : "Being responded to"}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default CaretakerEmergencyPage;
