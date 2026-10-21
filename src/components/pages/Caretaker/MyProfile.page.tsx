import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { FiCalendar, FiFileText, FiUpload, FiUserCheck } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import Button from "../../atoms/Button/Button";
import WeeklyAvailabilityEditor from "../../molecules/WeeklyAvailability/WeeklyAvailabilityEditor";
import { useCaretakerService, type CaretakerProfileRequestDTO, type CaretakerVerificationDocumentDTO } from "../../../services/useCaretakerService";
import { useFileService } from "../../../services/useFileService";
import { CaretakerVerificationStatusEnum, DocumentReviewStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatDateTime } from "../../../utils/helper";

interface FormValues {
  bio: string;
  specialties: string;
  yearsOfExperience: string;
  hourlyRate: string;
  latitude: string;
  longitude: string;
  serviceRadiusKm: string;
}

const EMPTY_VALUES: FormValues = {
  bio: "",
  specialties: "",
  yearsOfExperience: "",
  hourlyRate: "",
  latitude: "",
  longitude: "",
  serviceRadiusKm: "",
};

const validationSchema = Yup.object({
  bio: Yup.string().optional(),
  specialties: Yup.string().optional(),
  yearsOfExperience: Yup.number().optional().min(0, "Cannot be negative"),
  hourlyRate: Yup.number().optional().min(0, "Cannot be negative"),
  latitude: Yup.number().optional(),
  longitude: Yup.number().optional(),
  serviceRadiusKm: Yup.number().optional().min(0, "Cannot be negative"),
});

const VERIFICATION_STATUS_COLOR: Record<CaretakerVerificationStatusEnum, "default" | "success" | "error"> = {
  [CaretakerVerificationStatusEnum.PENDING]: "default",
  [CaretakerVerificationStatusEnum.VERIFIED]: "success",
  [CaretakerVerificationStatusEnum.REJECTED]: "error",
};

const REVIEW_STATUS_COLOR: Record<DocumentReviewStatusEnum, "default" | "success" | "error"> = {
  [DocumentReviewStatusEnum.PENDING]: "default",
  [DocumentReviewStatusEnum.APPROVED]: "success",
  [DocumentReviewStatusEnum.REJECTED]: "error",
};

/** Parses a comma/newline-separated free-text field into a trimmed, de-duplicated list -
 *  specialties has no fixed picklist yet (CaretakerProfile.specialties is a placeholder
 *  string collection, Prompt 64, until Phase 9's ServiceCategory table exists). */
function parseSpecialties(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)));
}

/**
 * Self-managed caretaker profile, upsert-style (createOrUpdate() always targets the
 * caller's own profile - Prompt 64's controller has no separate create vs. update path)
 * plus the verification document upload surface (Prompt 65): a caretaker submits evidence
 * (ID, certification, ...) for an admin to review one-by-one via the CARETAKER_VERIFY-gated
 * endpoint (Prompt 70's own job to build the review UI for).
 */
const CaretakerMyProfilePage: React.FC = () => {
  const caretakerService = useCaretakerService();
  const fileService = useFileService();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<CaretakerVerificationStatusEnum>(CaretakerVerificationStatusEnum.PENDING);
  const [documents, setDocuments] = useState<CaretakerVerificationDocumentDTO[]>([]);
  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formik = useFormik<FormValues>({
    initialValues: EMPTY_VALUES,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      setSaveError(null);
      const payload: CaretakerProfileRequestDTO = {
        bio: values.bio || null,
        specialties: parseSpecialties(values.specialties),
        yearsOfExperience: values.yearsOfExperience ? Number(values.yearsOfExperience) : null,
        hourlyRate: values.hourlyRate ? Number(values.hourlyRate) : null,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        serviceRadiusKm: values.serviceRadiusKm ? Number(values.serviceRadiusKm) : null,
      };
      try {
        const saved = await caretakerService.createOrUpdate(payload);
        setProfileId(saved.id);
        setVerificationStatus(saved.verificationStatus);
        setSuccessMessage("Profile saved successfully");
      } catch (err) {
        setSaveError(getErrorMessage(err, "Could not save your profile"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  const loadDocuments = useCallback(async (id: number) => {
    try {
      const docs = await caretakerService.listVerificationDocuments(id);
      setDocuments(docs);
    } catch (err) {
      setUploadError(getErrorMessage(err, "Could not load your verification documents"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    caretakerService
      .getMyProfile()
      .then((profile) => {
        setProfileId(profile.id);
        setVerificationStatus(profile.verificationStatus);
        formik.setValues({
          bio: profile.bio ?? "",
          specialties: (profile.specialties ?? []).join(", "),
          yearsOfExperience: profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "",
          hourlyRate: profile.hourlyRate != null ? String(profile.hourlyRate) : "",
          latitude: profile.latitude != null ? String(profile.latitude) : "",
          longitude: profile.longitude != null ? String(profile.longitude) : "",
          serviceRadiusKm: profile.serviceRadiusKm != null ? String(profile.serviceRadiusKm) : "",
        });
        loadDocuments(profile.id);
      })
      .catch((err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404) {
          setLoadError(getErrorMessage(err, "Could not load your profile"));
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profileId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await caretakerService.uploadVerificationDocument(file, docType || undefined);
      setDocType("");
      setSuccessMessage("Document uploaded successfully");
      await loadDocuments(profileId);
    } catch (err) {
      setUploadError(getErrorMessage(err, "Could not upload this document"));
    } finally {
      setUploading(false);
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

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3} flexWrap="wrap" rowGap={1}>
        <FiUserCheck size={22} />
        <Typography variant="h5" fontWeight={800}>
          My Profile
        </Typography>
        <Chip
          label={verificationStatus}
          size="small"
          color={VERIFICATION_STATUS_COLOR[verificationStatus]}
          variant={verificationStatus === CaretakerVerificationStatusEnum.PENDING ? "outlined" : "filled"}
        />
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Stack component="form" spacing={2.5} onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Bio"
                  name="bio"
                  multiline
                  minRows={3}
                  value={formik.values.bio}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Specialties"
                  name="specialties"
                  placeholder="e.g. Mobility Assistance, Medication Management"
                  helperText="Comma-separated"
                  value={formik.values.specialties}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Years of Experience"
                  name="yearsOfExperience"
                  type="number"
                  value={formik.values.yearsOfExperience}
                  onChange={formik.handleChange}
                  error={formik.touched.yearsOfExperience && formik.errors.yearsOfExperience}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Hourly Rate"
                  name="hourlyRate"
                  type="number"
                  value={formik.values.hourlyRate}
                  onChange={formik.handleChange}
                  error={formik.touched.hourlyRate && formik.errors.hourlyRate}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Latitude"
                  name="latitude"
                  type="number"
                  value={formik.values.latitude}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Longitude"
                  name="longitude"
                  type="number"
                  value={formik.values.longitude}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Service Radius (km)"
                  name="serviceRadiusKm"
                  type="number"
                  value={formik.values.serviceRadiusKm}
                  onChange={formik.handleChange}
                  error={formik.touched.serviceRadiusKm && formik.errors.serviceRadiusKm}
                />
              </Grid>
            </Grid>
            <Box>
              <Button type="submit" variant="contained" loading={formik.isSubmitting}>
                {profileId ? "Save Changes" : "Create Profile"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {profileId && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <FiCalendar size={18} />
              <Typography variant="h6" fontWeight={700}>
                Weekly Availability
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Set the hours you're generally available each week.
            </Typography>
            <WeeklyAvailabilityEditor caretakerId={profileId} />
          </CardContent>
        </Card>
      )}

      {profileId && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <FiFileText size={18} />
              <Typography variant="h6" fontWeight={700}>
                Verification Documents
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Upload ID, certifications, or background-check evidence for an admin to review.
            </Typography>

            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}

            {documents.length > 0 && (
              <List dense disablePadding sx={{ mb: 2 }}>
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    divider
                    secondaryAction={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" variant="text" onClick={() => window.open(fileService.getDownloadUrl(doc.fileAssetId), "_blank")}>
                          View
                        </Button>
                        <Chip label={doc.reviewStatus} size="small" color={REVIEW_STATUS_COLOR[doc.reviewStatus]} />
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={doc.originalFilename ?? "Document"}
                      secondary={`${doc.docType ?? "General"} · ${formatDateTime(doc.createdAt)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Divider sx={{ mb: 2 }} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
              <TextField
                label="Document Type"
                placeholder="e.g. ID_PROOF, CERTIFICATION"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                sx={{ maxWidth: 280 }}
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<FiUpload size={16} />}
                loading={uploading}
                loadingText="Uploading…"
              >
                Upload Document
                <input ref={fileInputRef} type="file" hidden onChange={handleFileSelected} />
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default CaretakerMyProfilePage;
