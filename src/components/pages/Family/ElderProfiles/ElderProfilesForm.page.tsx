import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Alert, Box, Card, CardContent, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiUser } from "react-icons/fi";
import TextField from "../../../atoms/TextField/TextField";
import Select from "../../../atoms/Select/Select";
import Button from "../../../atoms/Button/Button";
import FamilyMembersPanel from "./FamilyMembersPanel";
import { useElderProfileService, type ElderProfileRequestDTO } from "../../../../services/useElderProfileService";
import { GenderEnum } from "../../../../utils/enums";
import { getErrorMessage } from "../../../../utils/helper";

const GENDER_OPTIONS = [
  { value: GenderEnum.MALE, label: "Male" },
  { value: GenderEnum.FEMALE, label: "Female" },
  { value: GenderEnum.OTHER, label: "Other" },
];

// Plain-string form state, distinct from ElderProfileRequestDTO's wire shape - see
// Elder/MyProfile.page.tsx's identical interface for why.
interface FormValues {
  fullName: string;
  dateOfBirth: string;
  gender: GenderEnum | "";
  medicalConditions: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const EMPTY_VALUES: FormValues = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  medicalConditions: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const validationSchema = Yup.object({
  fullName: Yup.string().required("Full name is required"),
});

/**
 * Add/Edit page for the family Elder Profiles module (see ElderProfiles.page.tsx for the
 * listing this navigates back to). FamilyMembersPanel only renders once there's a real id
 * to attach co-managers to - never on the "new profile" route.
 */
const ElderProfilesFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const elderProfileService = useElderProfileService();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        if (isEdit && id) {
          await elderProfileService.update(Number(id), payload);
        } else {
          const created = await elderProfileService.create(payload);
          navigate(`/family/elder-profiles/${created.id}`, { replace: true });
          setSubmitting(false);
          return;
        }
        navigate("/family/elder-profiles");
      } catch (err) {
        setSaveError(getErrorMessage(err, "Could not save this elder profile"));
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (!id) return;
    elderProfileService
      .getById(Number(id))
      .then((profile) => {
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
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load this elder profile")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate("/family/elder-profiles")}>
          Back
        </Button>
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiUser size={22} />
        <Typography variant="h5" fontWeight={800}>
          {isEdit ? "Edit Elder Profile" : "Add Elder Profile"}
        </Typography>
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
                <TextField label="Address" name="address" value={formik.values.address ?? ""} onChange={formik.handleChange} />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Medical Conditions"
                  name="medicalConditions"
                  multiline
                  minRows={3}
                  value={formik.values.medicalConditions ?? ""}
                  onChange={formik.handleChange}
                />
              </Grid>
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
            <Box>
              <Button type="submit" variant="contained" loading={formik.isSubmitting}>
                {isEdit ? "Save Changes" : "Create Profile"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {isEdit && id && <FamilyMembersPanel elderProfileId={Number(id)} />}
    </Box>
  );
};

export default ElderProfilesFormPage;
