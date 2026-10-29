import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Alert, Box, Card, CardContent, Checkbox, FormControlLabel, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";
import PageHeader from "../../../molecules/PageHeader/PageHeader";
import TextField from "../../../atoms/TextField/TextField";
import Button from "../../../atoms/Button/Button";
import CaretakerSearchAutocomplete from "../../../molecules/CaretakerSearchAutocomplete/CaretakerSearchAutocomplete";
import ElderProfileSearchAutocomplete from "../../../molecules/ElderProfileSearchAutocomplete/ElderProfileSearchAutocomplete";
import AvailableSlotPicker from "../../../molecules/AvailableSlotPicker/AvailableSlotPicker";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingPayload } from "../../../../services/useBookingService";
import { useServiceOfferingService } from "../../../../services/useServiceOfferingService";
import type { ServiceOfferingResponse } from "../../../../services/useServiceOfferingService";
import { getErrorMessage } from "../../../../utils/helper";

const MIN_OCCURRENCES = 2;
const MAX_OCCURRENCES = 12;

interface FormValues {
  elderProfileId: number | null;
  caretakerId: number | null;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  recurring: boolean;
  occurrences: number | "";
}

const EMPTY_VALUES: FormValues = {
  elderProfileId: null,
  caretakerId: null,
  scheduledDate: "",
  scheduledTime: "",
  notes: "",
  recurring: false,
  occurrences: "",
};

const validationSchema = Yup.object({
  elderProfileId: Yup.number().nullable().required("Pick who this booking is for"),
  caretakerId: Yup.number().nullable().required("Pick a caretaker"),
  scheduledDate: Yup.string().required("Pick a date"),
  scheduledTime: Yup.string().required("Pick an available time"),
  occurrences: Yup.number().when("recurring", {
    is: true,
    then: (schema) =>
      schema
        .required("Enter how many weeks")
        .min(MIN_OCCURRENCES, `At least ${MIN_OCCURRENCES} occurrences`)
        .max(MAX_OCCURRENCES, `At most ${MAX_OCCURRENCES} occurrences`),
  }),
});

/**
 * The booking flow's entry point is Phase 9's BrowseServices.page.tsx - its "Book" button
 * (ServiceOfferingListingTemplate) links here with ?serviceOfferingId= already set, so the
 * service itself is fixed and shown read-only; this form only collects who it's for, which
 * caretaker, and when. Submitting navigates straight to BookingDetail.page.tsx (passing
 * justCreated so it can show a confirmation banner) - that page doubles as this flow's
 * confirmation screen rather than a separate one, matching ElderSphere's own BookingDetail
 * literally being titled "Booking Confirmation".
 */
const BookingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceOfferingId = Number(searchParams.get("serviceOfferingId")) || null;
  const bookingService = useBookingService();
  const serviceOfferingService = useServiceOfferingService();

  const [offering, setOffering] = useState<ServiceOfferingResponse | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(Boolean(serviceOfferingId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceOfferingId) return;
    serviceOfferingService
      .getServiceOfferingById(serviceOfferingId)
      .then(setOffering)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load this service")))
      .finally(() => setLoadingOffering(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceOfferingId]);

  const formik = useFormik<FormValues>({
    initialValues: EMPTY_VALUES,
    validationSchema,
    onSubmit: async (values) => {
      if (!serviceOfferingId || values.elderProfileId == null || values.caretakerId == null) return;
      setSubmitError(null);
      const payload: BookingPayload = {
        elderProfileId: values.elderProfileId,
        caretakerId: values.caretakerId,
        serviceOfferingId,
        scheduledDate: values.scheduledDate,
        scheduledTime: values.scheduledTime,
        notes: values.notes || undefined,
        recurring: values.recurring,
        occurrences: values.recurring ? Number(values.occurrences) : undefined,
      };
      try {
        const created = await bookingService.create(payload);
        navigate(`/family/bookings/${created.id}`, { state: { justCreated: true } });
      } catch (err) {
        setSubmitError(getErrorMessage(err, "Could not create this booking"));
      }
    },
  });

  if (!serviceOfferingId) {
    return (
      <Alert severity="warning">
        Pick a service to book from the{" "}
        <Button variant="text" size="small" onClick={() => navigate("/family/services")}>
          Browse Services
        </Button>{" "}
        page first.
      </Alert>
    );
  }

  if (loadingOffering) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={48} width={240} />
        <Skeleton variant="rounded" height={400} />
      </Stack>
    );
  }

  if (loadError || !offering) {
    return <Alert severity="error">{loadError ?? "Service not found"}</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate("/family/services")}>
          Back to services
        </Button>
      </Stack>
      <PageHeader icon={<FiCalendar size={20} />} title={`Book ${offering.name}`} />

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Service
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {offering.name}
          </Typography>
          <Stack direction="row" spacing={2} mt={0.5}>
            {offering.basePrice != null && <Typography variant="body2">${offering.basePrice}</Typography>}
            {offering.durationMinutes != null && (
              <Typography variant="body2" color="text.secondary">
                {offering.durationMinutes} min
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Stack component="form" spacing={2.5} onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ElderProfileSearchAutocomplete
                  label="Who is this for?"
                  placeholder="Search your elder profiles"
                  onSelect={(profile) => formik.setFieldValue("elderProfileId", profile?.id ?? null)}
                  helperText={formik.touched.elderProfileId && formik.errors.elderProfileId}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CaretakerSearchAutocomplete
                  label="Caretaker"
                  placeholder="Search caretakers"
                  onSelect={(caretaker) => {
                    formik.setFieldValue("caretakerId", caretaker?.id ?? null);
                    formik.setFieldValue("scheduledTime", "");
                  }}
                  helperText={formik.touched.caretakerId && formik.errors.caretakerId}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Date"
                  name="scheduledDate"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={formik.values.scheduledDate}
                  onChange={(e) => {
                    formik.setFieldValue("scheduledDate", e.target.value);
                    formik.setFieldValue("scheduledTime", "");
                  }}
                  onBlur={formik.handleBlur}
                  error={formik.touched.scheduledDate && formik.errors.scheduledDate}
                />
              </Grid>
              <Grid size={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Available times
                </Typography>
                <AvailableSlotPicker
                  caretakerId={formik.values.caretakerId}
                  serviceOfferingId={serviceOfferingId}
                  date={formik.values.scheduledDate || null}
                  value={formik.values.scheduledTime || null}
                  onChange={(time) => formik.setFieldValue("scheduledTime", time)}
                />
                {formik.touched.scheduledTime && formik.errors.scheduledTime && (
                  <Typography variant="caption" color="error" display="block" mt={0.5}>
                    {formik.errors.scheduledTime}
                  </Typography>
                )}
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Notes"
                  name="notes"
                  multiline
                  minRows={2}
                  placeholder="Anything the caretaker should know"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.recurring}
                      onChange={(e) => formik.setFieldValue("recurring", e.target.checked)}
                    />
                  }
                  label="Repeat weekly"
                />
                {formik.values.recurring && (
                  <TextField
                    label="Number of weeks"
                    name="occurrences"
                    type="number"
                    sx={{ maxWidth: 220, mt: 1 }}
                    slotProps={{ htmlInput: { min: MIN_OCCURRENCES, max: MAX_OCCURRENCES } }}
                    value={formik.values.occurrences}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.occurrences && formik.errors.occurrences}
                  />
                )}
              </Grid>
            </Grid>
            <Box>
              <Button type="submit" variant="contained" loading={formik.isSubmitting}>
                {formik.values.recurring ? "Book Recurring Series" : "Confirm Booking"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingFormPage;
