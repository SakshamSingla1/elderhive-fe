import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Alert, Avatar, Box, Card, CardContent, Chip, Grid, LinearProgress, Skeleton, Snackbar, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { FiHeart, FiPhoneCall, FiUser } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import Select from "../../atoms/Select/Select";
import Button from "../../atoms/Button/Button";
import { useElderProfileService, type ElderProfileRequestDTO } from "../../../services/useElderProfileService";
import { GenderEnum } from "../../../utils/enums";
import { getErrorMessage, formatDate, formatEnumLabel} from "../../../utils/helper";

const GENDER_OPTIONS = [
  { value: GenderEnum.MALE, label: "Male" },
  { value: GenderEnum.FEMALE, label: "Female" },
  { value: GenderEnum.OTHER, label: "Other" },
];

const initials = (name: string) =>
  (name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Plain-string form state, distinct from ElderProfileRequestDTO's wire shape - gender
// needs an empty-string "nothing selected yet" value the Select atom can hold, which
// ElderProfileRequestDTO's GenderEnum | null doesn't allow (null isn't a valid Select
// value prop). Converted to the real payload (gender: "" -> null) on submit.
interface FormValues {
  fullName: string;
  dateOfBirth: string;
  gender: GenderEnum | "";
  medicalConditions: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const validationSchema = Yup.object({
  fullName: Yup.string().required("Full name is required"),
  dateOfBirth: Yup.string().optional(),
  gender: Yup.string().optional(),
  medicalConditions: Yup.string().optional(),
  address: Yup.string().optional(),
  emergencyContactName: Yup.string().optional(),
  emergencyContactPhone: Yup.string().optional(),
});

const EMPTY_VALUES: FormValues = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  medicalConditions: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

// Order drives the completeness bar below - every one of these counts equally toward
// "how filled in is this profile", gender included even though it's optional server-side.
const COMPLETENESS_FIELDS: (keyof FormValues)[] = [
  "fullName",
  "dateOfBirth",
  "gender",
  "address",
  "medicalConditions",
  "emergencyContactName",
  "emergencyContactPhone",
];

/**
 * Self-managed elder profile — GET/POST /elder-profiles/me and /elder-profiles always
 * scope to the caller when they're an ELDER (ElderProfileController#resolveOwnership,
 * Prompt 61), so this page never needs to know its own profile id up front: it loads
 * getMyProfile() once, and submits either create() (first time) or update() (every time
 * after) depending on whether that load found anything.
 */
const ElderMyProfilePage: React.FC = () => {
  const elderProfileService = useElderProfileService();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formik = useFormik<FormValues>({
    initialValues: EMPTY_VALUES,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      setSaveError(null);
      const payload: ElderProfileRequestDTO = {
        ...values,
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || null,
      };
      try {
        if (profileId) {
          await elderProfileService.update(profileId, payload);
        } else {
          const created = await elderProfileService.create(payload);
          setProfileId(created.id);
        }
        setSuccessMessage("Profile saved successfully");
      } catch (err) {
        setSaveError(getErrorMessage(err, "Could not save your profile"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    elderProfileService
      .getMyProfile()
      .then((profile) => {
        setProfileId(profile.id);
        setMemberSince(profile.createdAt ?? null);
        formik.setValues({
          fullName: profile.fullName ?? "",
          dateOfBirth: profile.dateOfBirth ?? "",
          gender: profile.gender ?? "",
          medicalConditions: profile.medicalConditions ?? "",
          address: profile.address ?? "",
          emergencyContactName: profile.emergencyContactName ?? "",
          emergencyContactPhone: profile.emergencyContactPhone ?? "",
        });
      })
      .catch((err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404) {
          // A real 404 (ELDER_PROFILE_NOT_FOUND) just means no profile yet - the form
          // stays empty, ready to create one. Anything else is worth surfacing.
          setLoadError(getErrorMessage(err, "Could not load your profile"));
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} width={240} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  const age = formik.values.dateOfBirth && dayjs(formik.values.dateOfBirth).isValid() ? dayjs().diff(dayjs(formik.values.dateOfBirth), "year") : null;
  const filledCount = COMPLETENESS_FIELDS.filter((field) => Boolean(formik.values[field])).length;
  const completenessPct = Math.round((filledCount / COMPLETENESS_FIELDS.length) * 100);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiUser size={22} />
        <Typography variant="h5" fontWeight={800}>
          My Profile
        </Typography>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 64, height: 64, fontSize: 24, fontWeight: 700 }}>
              {initials(formik.values.fullName)}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {formik.values.fullName || "Your Profile"}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={0.5} mt={0.5}>
                {age != null && <Chip size="small" variant="outlined" label={`${age} years old`} />}
                {formik.values.gender && <Chip size="small" variant="outlined" label={formatEnumLabel(formik.values.gender)} />}
                {memberSince && <Chip size="small" variant="outlined" label={`Member since ${formatDate(memberSince)}`} />}
                {!profileId && <Chip size="small" color="warning" variant="outlined" label="Not yet created" />}
              </Stack>
            </Box>
          </Stack>
          <Box mt={2.5}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Profile completeness
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {completenessPct}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={completenessPct}
              sx={{ height: 8, borderRadius: 4 }}
              color={completenessPct === 100 ? "success" : completenessPct >= 50 ? "primary" : "warning"}
            />
          </Box>
        </CardContent>
      </Card>

      <Stack component="form" spacing={3} onSubmit={formik.handleSubmit}>
        {saveError && <Alert severity="error">{saveError}</Alert>}

        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <FiUser size={18} />
              <Typography variant="h6" fontWeight={700}>
                Personal Details
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Full Name"
                  name="fullName"
                  required
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.fullName && formik.errors.fullName}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={formik.values.dateOfBirth ?? ""}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Select
                  label="Gender"
                  value={formik.values.gender ?? ""}
                  options={GENDER_OPTIONS}
                  onChange={(value) => formik.setFieldValue("gender", value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Address"
                  name="address"
                  value={formik.values.address ?? ""}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <FiHeart size={18} color={theme.palette.error.main} />
              <Typography variant="h6" fontWeight={700}>
                Medical Information
              </Typography>
            </Stack>
            <TextField
              label="Medical Conditions"
              name="medicalConditions"
              placeholder="Allergies, chronic conditions, medications, anything a caretaker should know"
              multiline
              minRows={3}
              value={formik.values.medicalConditions}
              onChange={formik.handleChange}
            />
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <FiPhoneCall size={18} />
              <Typography variant="h6" fontWeight={700}>
                Emergency Contact
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Emergency Contact Name"
                  name="emergencyContactName"
                  value={formik.values.emergencyContactName ?? ""}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Emergency Contact Phone"
                  name="emergencyContactPhone"
                  value={formik.values.emergencyContactPhone ?? ""}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box>
          <Button type="submit" variant="contained" loading={formik.isSubmitting}>
            {profileId ? "Save Changes" : "Create Profile"}
          </Button>
        </Box>
      </Stack>

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default ElderMyProfilePage;
