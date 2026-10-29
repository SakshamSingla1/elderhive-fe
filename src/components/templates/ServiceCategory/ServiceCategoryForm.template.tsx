import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { ServiceCategoryPayload, ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import { ServiceCategoryStatusEnum } from "../../../utils/enums";
import { formatEnumLabel } from "../../../utils/helper";

const SERVICE_CATEGORIES_LISTING_PATH = "/admin/service-categories";

export type ServiceCategoryFormMode = "create" | "edit";

const MODE_TITLES: Record<ServiceCategoryFormMode, string> = {
  create: "Create Service Category",
  edit: "Edit Service Category",
};

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  description: Yup.string(),
  icon: Yup.string(),
  status: Yup.string().oneOf(Object.values(ServiceCategoryStatusEnum)),
});

interface ServiceCategoryFormProps {
  mode: ServiceCategoryFormMode;
  /** The category being edited - omitted (or null) for "create". */
  serviceCategory?: ServiceCategoryResponse | null;
  onSubmit: (values: ServiceCategoryPayload) => void | Promise<void>;
}

/**
 * Ported from ColorThemeForm.template.tsx's split (navigate on cancel, formik.isSubmitting
 * drives the submit button) with a flat field set in place of the palette editor - a
 * service category is just name/description/icon/status (Prompt 71).
 */
const ServiceCategoryForm: React.FC<ServiceCategoryFormProps> = ({ mode, serviceCategory, onSubmit }) => {
  const navigate = useNavigate();

  const formik = useFormik<ServiceCategoryPayload>({
    initialValues: {
      name: "",
      description: "",
      icon: "",
      status: ServiceCategoryStatusEnum.ACTIVE,
    },
    validationSchema,
    onSubmit,
  });

  const { setValues } = formik;
  useEffect(() => {
    if (serviceCategory) {
      setValues({
        name: serviceCategory.name,
        description: serviceCategory.description ?? "",
        icon: serviceCategory.icon ?? "",
        status: serviceCategory.status,
      });
    }
  }, [serviceCategory, setValues]);

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
                label="Description"
                name="description"
                fullWidth
                multiline
                minRows={2}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <TextField
                label="Icon"
                name="icon"
                placeholder="e.g. temple, hospital"
                fullWidth
                value={formik.values.icon}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <TextField select label="Status" name="status" fullWidth value={formik.values.status} onChange={formik.handleChange}>
                {Object.values(ServiceCategoryStatusEnum).map((status) => (
                  <MenuItem key={status} value={status}>
                    {formatEnumLabel(status)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, pt: 1 }}>
          <Button variant="outlined" onClick={() => navigate(SERVICE_CATEGORIES_LISTING_PATH)}>
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

export default ServiceCategoryForm;
