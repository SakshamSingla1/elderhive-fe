import React, { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import EmergencyAlertButton from "../../molecules/EmergencyAlertButton/EmergencyAlertButton";
import Button from "../../atoms/Button/Button";
import { useElderProfileService } from "../../../services/useElderProfileService";
import { useEmergencyAlertService, type EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { getCurrentCoordinates, getErrorMessage } from "../../../utils/helper";

/**
 * The elder's own SOS button, triggering for themselves (Prompt 85) - distinct page from
 * Family/Emergency.page.tsx (which triggers on an elder's behalf) even though both mount
 * the exact same EmergencyAlertButton, since the surrounding copy/context genuinely
 * differs ("press this for yourself" vs. "press this for someone in your care").
 *
 * Location is fetched eagerly on mount (best-effort, cached) so the permission prompt - if
 * one is needed at all - appears calmly as soon as the page loads, not in the middle of an
 * actual emergency hold-to-confirm press. The confirm handler still re-fetches a fresh fix
 * at trigger time (near-instant once permission is already granted) for the most accurate
 * possible coordinates, falling back to the cached mount-time fix only if that re-fetch
 * itself fails.
 */
const ElderEmergencyPage: React.FC = () => {
  const elderProfileService = useElderProfileService();
  const emergencyAlertService = useEmergencyAlertService();

  const [elderProfileId, setElderProfileId] = useState<number | null>(null);
  const [cachedCoordinates, setCachedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggeredAlert, setTriggeredAlert] = useState<EmergencyAlertResponse | null>(null);

  useEffect(() => {
    elderProfileService
      .getMyProfile()
      .then((profile) => setElderProfileId(profile.id))
      .catch((err) => {
        // A real 404 (ELDER_PROFILE_NOT_FOUND) just means no profile exists yet - same
        // "not an error" treatment as MyProfile.page.tsx's own load effect - the warning
        // below covers that case instead of a generic error alert.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404) {
          setLoadError(getErrorMessage(err, "Could not load your profile"));
        }
      })
      .finally(() => setIsLoadingProfile(false));

    getCurrentCoordinates()
      .then(setCachedCoordinates)
      .catch(() => {
        // Silent - a mount-time prefetch failing just means the confirm handler below
        // will attempt its own fresh fetch (and surface a real error then, only if the
        // user actually tries to trigger).
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!elderProfileId) return;
    setTriggerError(null);
    setIsTriggering(true);
    try {
      const coordinates = await getCurrentCoordinates().catch(() => cachedCoordinates);
      if (!coordinates) {
        throw new Error("Location access is required to send help your way. Please enable location services and try again.");
      }
      const alert = await emergencyAlertService.trigger({
        elderProfileId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      setTriggeredAlert(alert);
    } catch (err) {
      setTriggerError(getErrorMessage(err, "Could not send the alert. Please try again."));
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoadingProfile) {
    return <Skeleton variant="rounded" height={320} />;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiAlertTriangle size={22} />
        <Typography variant="h5" fontWeight={800}>
          Emergency
        </Typography>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {!loadError && !elderProfileId && (
        <Alert severity="warning">Complete your profile first so help can be sent to the right place.</Alert>
      )}

      {elderProfileId && !triggeredAlert && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="body1" color="text.secondary" mb={4} maxWidth={420} mx="auto">
              If you're in danger or need immediate help, press and hold the button below. Nearby caretakers and your
              family will be notified right away.
            </Typography>
            <EmergencyAlertButton onConfirm={handleConfirm} loading={isTriggering}>
              SOS
            </EmergencyAlertButton>
            {triggerError && (
              <Alert severity="error" sx={{ mt: 3, textAlign: "left" }}>
                {triggerError}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {triggeredAlert && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <FiCheckCircle size={40} color="#2E7D32" />
            <Typography variant="h6" fontWeight={700} mt={2}>
              Help is on the way
            </Typography>
            <Typography variant="body1" color="text.secondary" mt={1} mb={4} maxWidth={420} mx="auto">
              Your alert has been sent. Nearby caretakers and your family have been notified.
            </Typography>
            <Button variant="outlined" onClick={() => setTriggeredAlert(null)}>
              Send another alert
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ElderEmergencyPage;
