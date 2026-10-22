import React, { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import EmergencyAlertButton from "../../molecules/EmergencyAlertButton/EmergencyAlertButton";
import Button from "../../atoms/Button/Button";
import Select from "../../atoms/Select/Select";
import { useElderProfileService, type ElderProfileResponseDTO } from "../../../services/useElderProfileService";
import { useEmergencyAlertService, type EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { getCurrentCoordinates, getErrorMessage } from "../../../utils/helper";

/**
 * A family member triggering an alert ON BEHALF OF an elder they manage (Prompt 85) -
 * distinct page from Elder/Emergency.page.tsx even though both mount the exact same
 * EmergencyAlertButton, since the copy/context genuinely differs here: this page must
 * first establish WHICH elder the alert is for.
 *
 * Deliberately NOT ElderProfileSearchAutocomplete (BookingForm.page.tsx's own picker,
 * Prompt 79) - that widget requires typing 2+ characters before showing any result, real
 * friction this time-critical flow shouldn't have. A family member manages a small,
 * literally-listable set of elders, so this fetches all of them up front (no search box)
 * and auto-selects the only one when there's exactly one, which is the common case.
 */
const FamilyEmergencyPage: React.FC = () => {
  const elderProfileService = useElderProfileService();
  const emergencyAlertService = useEmergencyAlertService();

  const [elderProfiles, setElderProfiles] = useState<ElderProfileResponseDTO[]>([]);
  const [selectedElderProfileId, setSelectedElderProfileId] = useState<number | "">("");
  const [cachedCoordinates, setCachedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggeredAlert, setTriggeredAlert] = useState<EmergencyAlertResponse | null>(null);

  useEffect(() => {
    elderProfileService
      .getMine(0, 50)
      .then((page) => {
        setElderProfiles(page.content);
        if (page.content.length === 1) setSelectedElderProfileId(page.content[0].id);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load your elder profiles")))
      .finally(() => setIsLoadingProfiles(false));

    getCurrentCoordinates()
      .then(setCachedCoordinates)
      .catch(() => {
        // Silent - handleConfirm below attempts its own fresh fetch and surfaces a real
        // error then, only if the user actually tries to trigger.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!selectedElderProfileId) return;
    setTriggerError(null);
    setIsTriggering(true);
    try {
      const coordinates = await getCurrentCoordinates().catch(() => cachedCoordinates);
      if (!coordinates) {
        throw new Error("Location access is required to send help their way. Please enable location services and try again.");
      }
      const alert = await emergencyAlertService.trigger({
        elderProfileId: selectedElderProfileId,
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

  if (isLoadingProfiles) {
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

      {!loadError && elderProfiles.length === 0 && (
        <Alert severity="warning">Add an elder profile first so help can be sent to the right place.</Alert>
      )}

      {elderProfiles.length > 0 && !triggeredAlert && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="body1" color="text.secondary" mb={4} maxWidth={420} mx="auto">
              If someone in your care is in danger or needs immediate help, select them below and press and hold the
              button. Nearby caretakers and every family member linked to their profile will be notified right away.
            </Typography>
            {elderProfiles.length > 1 && (
              <Box maxWidth={320} mx="auto" mb={4} textAlign="left">
                <Select
                  label="Who needs help?"
                  value={selectedElderProfileId}
                  options={elderProfiles.map((profile) => ({ value: profile.id, label: profile.fullName }))}
                  onChange={setSelectedElderProfileId}
                />
              </Box>
            )}
            <EmergencyAlertButton onConfirm={handleConfirm} loading={isTriggering} disabled={!selectedElderProfileId}>
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
              The alert has been sent for {triggeredAlert.elderName ?? "them"}. Nearby caretakers and every linked
              family member have been notified.
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

export default FamilyEmergencyPage;
