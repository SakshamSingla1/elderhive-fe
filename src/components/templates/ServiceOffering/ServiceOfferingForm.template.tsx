import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Box, Button, Card, CardActions, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { FiArrowLeft, FiCheck, FiClock, FiDollarSign, FiEye, FiInfo, FiShoppingBag } from "react-icons/fi";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import type { ServiceOfferingPayload, ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import { ServiceCategoryStatusEnum, ServiceOfferingStatusEnum } from "../../../utils/enums";
import { formatEnumLabel } from "../../../utils/helper";
import { resolveCategoryIcon } from "../../../utils/categoryIcons";

const SERVICES_LISTING_PATH = "/admin/services";

export type ServiceOfferingFormMode = "create" | "edit";

const MODE_TITLES: Record<ServiceOfferingFormMode, string> = {
  create: "Create Service",
  edit: "Edit Service",
};
const MODE_SUBTITLES: Record<ServiceOfferingFormMode, string> = {
  create: "Add a new bookable offering under one of the catalog's categories.",
  edit: "Update this service's details, pricing, and visibility.",
};

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  categoryId: Yup.number().required("Category is required"),
  description: Yup.string(),
  basePrice: Yup.number().min(0, "Must be 0 or more").nullable(),
  durationMinutes: Yup.number().min(0, "Must be 0 or more").integer().nullable(),
  status: Yup.string().oneOf(Object.values(ServiceOfferingStatusEnum)),
});

interface ServiceOfferingFormValues {
  name: string;
  categoryId: number | "";
  description: string;
  basePrice: number | "";
  durationMinutes: number | "";
  status: ServiceOfferingStatusEnum;
}

interface ServiceOfferingFormProps {
  mode: ServiceOfferingFormMode;
  /** The offering being edited - omitted (or null) for "create". */
  serviceOffering?: ServiceOfferingResponse | null;
  onSubmit: (values: ServiceOfferingPayload) => void | Promise<void>;
}

/**
 * Ported from ServiceCategoryForm.template.tsx's split (navigate on cancel,
 * formik.isSubmitting drives the submit button), with a categoryId select populated from
 * useServiceCategoryService (ACTIVE categories only, size=100 - same reasoning as
 * ServiceOfferingListingTemplate's own category filter) since a real ServiceCategory FK
 * replaced ElderSphere's hardcoded enum (Prompt 71/72).
 *
 * The side-panel preview mirrors ServiceOfferingListingTemplate's own family-facing
 * "Browse Services" card (name, category chip, price, duration, Book button) exactly, so
 * an admin sees precisely what a family member will see before ever saving.
 */
const ServiceOfferingForm: React.FC<ServiceOfferingFormProps> = ({ mode, serviceOffering, onSubmit }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { getServiceCategories } = useServiceCategoryService();
  const [categories, setCategories] = useState<ServiceCategoryResponse[]>([]);

  useEffect(() => {
    getServiceCategories({ status: ServiceCategoryStatusEnum.ACTIVE, size: 100 })
      .then((result) => setCategories(result.content))
      .catch(() => {
        // Leaves the select empty - formik's own "Category is required" validation
        // still catches an unselected category on submit.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formik = useFormik<ServiceOfferingFormValues>({
    initialValues: {
      name: "",
      categoryId: "",
      description: "",
      basePrice: "",
      durationMinutes: "",
      status: ServiceOfferingStatusEnum.ACTIVE,
    },
    validationSchema,
    onSubmit: (values) =>
      onSubmit({
        name: values.name,
        categoryId: Number(values.categoryId),
        description: values.description || undefined,
        basePrice: values.basePrice === "" ? undefined : Number(values.basePrice),
        durationMinutes: values.durationMinutes === "" ? undefined : Number(values.durationMinutes),
        status: values.status,
      }),
  });

  const { setValues } = formik;
  useEffect(() => {
    if (serviceOffering) {
      setValues({
        name: serviceOffering.name,
        categoryId: serviceOffering.categoryId,
        description: serviceOffering.description ?? "",
        basePrice: serviceOffering.basePrice ?? "",
        durationMinutes: serviceOffering.durationMinutes ?? "",
        status: serviceOffering.status,
      });
    }
  }, [serviceOffering, setValues]);

  const selectedCategory = categories.find((c) => c.id === formik.values.categoryId);
  const PreviewIcon = resolveCategoryIcon(selectedCategory?.icon);
  const isActive = formik.values.status === ServiceOfferingStatusEnum.ACTIVE;

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
          }}
        >
          <FiShoppingBag size={20} />
        </Box>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={800}>
            {MODE_TITLES[mode]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {MODE_SUBTITLES[mode]}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3} mt={0.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <FiInfo size={18} />
                <Typography variant="h6" fontWeight={700}>
                  Service Details
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  name="name"
                  fullWidth
                  required
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={Boolean(formik.touched.name && formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
                <TextField
                  select
                  label="Category"
                  name="categoryId"
                  fullWidth
                  required
                  value={formik.values.categoryId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={Boolean(formik.touched.categoryId && formik.errors.categoryId)}
                  helperText={formik.touched.categoryId && formik.errors.categoryId}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Description"
                  name="description"
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="What a family member should expect from this visit."
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Base Price"
                    name="basePrice"
                    type="number"
                    fullWidth
                    slotProps={{ input: { startAdornment: <FiDollarSign size={14} style={{ marginRight: 6, opacity: 0.6 }} /> } }}
                    value={formik.values.basePrice}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={Boolean(formik.touched.basePrice && formik.errors.basePrice)}
                    helperText={formik.touched.basePrice && formik.errors.basePrice}
                  />
                  <TextField
                    label="Duration (minutes)"
                    name="durationMinutes"
                    type="number"
                    fullWidth
                    slotProps={{ input: { startAdornment: <FiClock size={14} style={{ marginRight: 6, opacity: 0.6 }} /> } }}
                    value={formik.values.durationMinutes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={Boolean(formik.touched.durationMinutes && formik.errors.durationMinutes)}
                    helperText={formik.touched.durationMinutes && formik.errors.durationMinutes}
                  />
                </Stack>
                <TextField select label="Status" name="status" fullWidth value={formik.values.status} onChange={formik.handleChange}>
                  {Object.values(ServiceOfferingStatusEnum).map((status) => (
                    <MenuItem key={status} value={status}>
                      {formatEnumLabel(status)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <FiEye size={18} />
                <Typography variant="h6" fontWeight={700}>
                  Browse Services Preview
                </Typography>
              </Stack>
              <Card variant="outlined" sx={{ bgcolor: "background.default" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" fontWeight={700} sx={{ wordBreak: "break-word" }}>
                      {formik.values.name || "Service name"}
                    </Typography>
                    <Chip size="small" label={formatEnumLabel(formik.values.status)} color={isActive ? "success" : "default"} sx={{ flexShrink: 0 }} />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: "primary.main",
                      }}
                    >
                      <PreviewIcon size={13} />
                    </Box>
                    <Chip size="small" variant="outlined" label={selectedCategory?.name ?? "Category"} />
                  </Stack>
                  {formik.values.description && (
                    <Typography variant="body2" color="text.secondary" mt={1.5}>
                      {formik.values.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={2} mt={1.5}>
                    {formik.values.basePrice !== "" && (
                      <Typography variant="body2" fontWeight={600}>
                        ${formik.values.basePrice}
                      </Typography>
                    )}
                    {formik.values.durationMinutes !== "" && (
                      <Typography variant="body2" color="text.secondary">
                        {formik.values.durationMinutes} min
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end" }}>
                  <Button size="small" variant="contained" disabled>
                    Book
                  </Button>
                </CardActions>
              </Card>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                This is exactly how a family member will see this service on the Browse Services page.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3, pt: 1 }}>
        <Button variant="outlined" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate(SERVICES_LISTING_PATH)}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" startIcon={<FiCheck size={16} />} disabled={formik.isSubmitting}>
          {formik.isSubmitting ? "Saving…" : mode === "edit" ? "Update" : "Create"}
        </Button>
      </Stack>
    </Box>
  );
};

export default ServiceOfferingForm;
