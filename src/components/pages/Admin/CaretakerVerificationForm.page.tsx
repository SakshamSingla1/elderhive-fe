import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Divider, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiCalendar, FiCheckCircle } from "react-icons/fi";
import PageHeader from "../../molecules/PageHeader/PageHeader";
import Button from "../../atoms/Button/Button";
import WeeklyAvailabilityView from "../../molecules/WeeklyAvailability/WeeklyAvailabilityView";
import CaretakerVerificationDocumentsPanel from "./CaretakerVerificationDocumentsPanel";
import { useCaretakerService, type CaretakerProfileResponseDTO, type CaretakerAvailabilitySlotDTO } from "../../../services/useCaretakerService";
import { CaretakerVerificationStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const BACK_PATH = "/admin/caretaker-verification";

const STATUS_COLOR: Record<CaretakerVerificationStatusEnum, "default" | "success" | "error"> = {
  [CaretakerVerificationStatusEnum.PENDING]: "default",
  [CaretakerVerificationStatusEnum.VERIFIED]: "success",
  [CaretakerVerificationStatusEnum.REJECTED]: "error",
};

/**
 * Read-only detail view, not an editable form - unlike ElderSphere's own reference (which
 * lets an admin set CaretakerProfile.verificationStatus directly via a dropdown here),
 * there is no such endpoint in this project: verification happens per-DOCUMENT, in
 * CaretakerVerificationDocumentsPanel below. This page exists to give an admin the context
 * (bio, specialties, rate, location, stated weekly availability) needed to make that
 * per-document call.
 */
const AdminCaretakerVerificationFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caretakerService = useCaretakerService();

  const [profile, setProfile] = useState<CaretakerProfileResponseDTO | null>(null);
  const [availability, setAvailability] = useState<CaretakerAvailabilitySlotDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const caretakerId = Number(id);
    Promise.all([caretakerService.getById(caretakerId), caretakerService.getAvailability(caretakerId)])
      .then(([fetchedProfile, slots]) => {
        setProfile(fetchedProfile);
        setAvailability(slots);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load this caretaker")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} width={240} />
        <Skeleton variant="rounded" height={280} />
      </Stack>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate(BACK_PATH)}>
          Back
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      {profile && (
        <>
          <PageHeader
            icon={<FiCheckCircle size={20} />}
            title={profile.fullName ?? "Caretaker"}
            titleAdornment={<Chip label={formatEnumLabel(profile.verificationStatus)} size="small" color={STATUS_COLOR[profile.verificationStatus]} />}
          />

          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{profile.email ?? "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{profile.phone ?? "—"}</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    Bio
                  </Typography>
                  <Typography variant="body1">{profile.bio || "—"}</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    Specialties
                  </Typography>
                  <Typography variant="body1">{profile.specialties.length > 0 ? profile.specialties.join(", ") : "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Years of Experience
                  </Typography>
                  <Typography variant="body1">{profile.yearsOfExperience ?? "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Hourly Rate
                  </Typography>
                  <Typography variant="body1">{profile.hourlyRate != null ? `$${profile.hourlyRate}` : "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Rating
                  </Typography>
                  <Typography variant="body1">{profile.ratingAverage != null ? profile.ratingAverage.toFixed(1) : "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Latitude
                  </Typography>
                  <Typography variant="body1">{profile.latitude ?? "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Longitude
                  </Typography>
                  <Typography variant="body1">{profile.longitude ?? "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Service Radius
                  </Typography>
                  <Typography variant="body1">{profile.serviceRadiusKm != null ? `${profile.serviceRadiusKm} km` : "—"}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <FiCalendar size={16} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Weekly Availability
                </Typography>
              </Stack>
              <WeeklyAvailabilityView slots={availability} />
            </CardContent>
          </Card>

          <CaretakerVerificationDocumentsPanel caretakerId={profile.id} />
        </>
      )}
    </Box>
  );
};

export default AdminCaretakerVerificationFormPage;
