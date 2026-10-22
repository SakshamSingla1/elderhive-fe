import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { FiAlertTriangle, FiArrowLeft } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import CaretakerSearchAutocomplete from "../../molecules/CaretakerSearchAutocomplete/CaretakerSearchAutocomplete";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import type { EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { EmergencyAlertStatusEnum } from "../../../utils/enums";
import { formatDateTime, getErrorMessage } from "../../../utils/helper";

const EMERGENCY_ALERTS_LISTING_PATH = "/admin/emergency-alerts";
const STATUS_COLOR: Record<EmergencyAlertStatusEnum, "error" | "warning" | "success"> = {
  TRIGGERED: "error",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
};

/**
 * Admin-only override page: read-only context (elder/address/coordinates/who triggered
 * it/who's responding/response time/overdue) plus two independent manual-dispatch
 * actions, both calling PUT .../dispatch-override (Prompt 84's endpoint, exactly one of
 * its two fields set per call, never both) - reassign to a chosen caretaker (bumps
 * TRIGGERED -> ACKNOWLEDGED if nobody had claimed it yet) or force-resolve regardless of
 * claim state, for the "nothing gets claimed" case. Two separate buttons rather than one
 * combined form, since those are genuinely two different admin intents, not two values of
 * the same field.
 */
const AdminEmergencyAlertsFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const alertId = Number(id);
  const navigate = useNavigate();
  const emergencyAlertService = useEmergencyAlertService();

  const [alert, setAlert] = useState<EmergencyAlertResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [reassignCaretakerId, setReassignCaretakerId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await emergencyAlertService.getById(alertId);
      setAlert(result);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this alert"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  useEffect(() => {
    if (alertId) load();
  }, [alertId, load]);

  const runOverride = async (payload: Parameters<typeof emergencyAlertService.dispatchOverride>[1]) => {
    setIsActing(true);
    setActionError(null);
    try {
      await emergencyAlertService.dispatchOverride(alertId, payload);
      navigate(EMERGENCY_ALERTS_LISTING_PATH);
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not override this alert's dispatch"));
    } finally {
      setIsActing(false);
    }
  };

  const handleReassign = () => {
    if (reassignCaretakerId == null) return;
    runOverride({ respondingCaretakerId: reassignCaretakerId });
  };

  const handleForceResolve = () => {
    if (!window.confirm("Force-resolve this alert? This can't be undone.")) return;
    runOverride({ forceResolve: true });
  };

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} width={240} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  if (loadError || !alert) {
    return <Alert severity="error">{loadError ?? "Emergency alert not found"}</Alert>;
  }

  const isResolved = alert.status === EmergencyAlertStatusEnum.RESOLVED;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate(EMERGENCY_ALERTS_LISTING_PATH)}>
          Back to emergency alerts
        </Button>
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiAlertTriangle size={22} color="#C0392B" />
        <Typography variant="h5" fontWeight={800}>
          Alert #{alert.id}
        </Typography>
        <Chip size="small" label={alert.status} color={STATUS_COLOR[alert.status]} />
        {alert.isOverdue && <Chip size="small" label="Overdue" color="error" variant="outlined" />}
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1.25}>
            <Row label="Elder" value={alert.elderName ?? `#${alert.elderProfileId}`} />
            <Row label="Address" value={alert.address ?? "Unknown location"} />
            <Row label="Coordinates" value={`${alert.latitude}, ${alert.longitude}`} />
            <Row label="Triggered" value={formatDateTime(alert.createdAt)} />
            <Row label="Responder" value={alert.respondingCaretakerName ?? "Nobody yet"} />
            <Row label="Response Time" value={alert.responseTimeSeconds != null ? `${alert.responseTimeSeconds}s` : "—"} />
          </Stack>
        </CardContent>
      </Card>

      {!isResolved && (
        <Card variant="outlined">
          <CardContent>
            {actionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionError}
              </Alert>
            )}
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Reassign Responder
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box flex={1}>
                    <CaretakerSearchAutocomplete
                      label="Caretaker"
                      placeholder="Search caretakers"
                      onSelect={(caretaker) => setReassignCaretakerId(caretaker?.id ?? null)}
                    />
                  </Box>
                  <Button variant="contained" disabled={reassignCaretakerId == null} loading={isActing} onClick={handleReassign}>
                    Reassign
                  </Button>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Force Resolve
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  Resolves this alert immediately regardless of whether anyone has claimed it.
                </Typography>
                <Button variant="outlined" color="error" loading={isActing} onClick={handleForceResolve}>
                  Force Resolve
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
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

export default AdminEmergencyAlertsFormPage;
