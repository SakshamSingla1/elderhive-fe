import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import type { ServiceOfferingPayload, ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import { ServiceCategoryStatusEnum, ServiceOfferingStatusEnum } from "../../../utils/enums";

const SERVICES_LISTING_PATH = "/admin/services";

export type ServiceOfferingFormMode = "create" | "edit";

const MODE_TITLES: Record<ServiceOfferingFormMode, string> = {
  create: "Create Service",
  edit: "Edit Service",
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
 */
const ServiceOfferingForm: React.FC<ServiceOfferingFormProps> = ({ mode, serviceOffering, onSubmit }) => {
  const navigate = useNavigate();
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

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
        {MODE_TITLES[mode]}
      </Typography>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
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
                minRows={2}
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
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, pt: 1 }}>
          <Button variant="outlined" onClick={() => navigate(SERVICES_LISTING_PATH)}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? "Saving…" : mode === "edit" ? "Update" : "Create"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ServiceOfferingForm;
