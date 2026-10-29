import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Box, Button, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { FiArrowLeft, FiCheck, FiEye, FiImage, FiInfo, FiTag } from "react-icons/fi";
import type { ServiceCategoryPayload, ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import { ServiceCategoryStatusEnum } from "../../../utils/enums";
import { formatEnumLabel } from "../../../utils/helper";
import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from "../../../utils/categoryIcons";

const SERVICE_CATEGORIES_LISTING_PATH = "/admin/service-categories";

export type ServiceCategoryFormMode = "create" | "edit";

const MODE_TITLES: Record<ServiceCategoryFormMode, string> = {
  create: "Create Service Category",
  edit: "Edit Service Category",
};
const MODE_SUBTITLES: Record<ServiceCategoryFormMode, string> = {
  create: "Add a new category services can be grouped under.",
  edit: "Update this category's details, icon, and visibility.",
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
 *
 * The `icon` field is still the same plain free-text string on the wire, but the form now
 * offers it as a curated tile picker (utils/categoryIcons.ts) instead of a raw text box
 * nobody could preview - paired with a live "how this looks in the catalog" card so a
 * category's actual listing appearance (icon, name, status chip) is never a surprise after
 * saving.
 */
const ServiceCategoryForm: React.FC<ServiceCategoryFormProps> = ({ mode, serviceCategory, onSubmit }) => {
  const navigate = useNavigate();
  const theme = useTheme();

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

  const isActive = formik.values.status === ServiceCategoryStatusEnum.ACTIVE;
  const PreviewIcon = resolveCategoryIcon(formik.values.icon);

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
          <FiTag size={20} />
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
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <FiInfo size={18} />
                  <Typography variant="h6" fontWeight={700}>
                    Category Details
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
                    label="Description"
                    name="description"
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="What this category covers, in a sentence or two."
                    value={formik.values.description}
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

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <FiImage size={18} />
                  <Typography variant="h6" fontWeight={700}>
                    Icon
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Pick the glyph families and admins will see on every card for this category.
                </Typography>
                <ToggleButtonGroup
                  value={formik.values.icon || null}
                  exclusive
                  onChange={(_, value) => formik.setFieldValue("icon", value ?? "")}
                  sx={{ flexWrap: "wrap", gap: 1, "& .MuiToggleButtonGroup-grouped": { border: "1px solid", borderColor: "divider !important", borderRadius: "10px !important" } }}
                >
                  {CATEGORY_ICON_OPTIONS.map(({ value, label, Icon }) => (
                    <ToggleButton key={value} value={value} sx={{ flexDirection: "column", gap: 0.5, py: 1.5, px: 1, width: 104, textTransform: "none" }}>
                      <Icon size={20} />
                      <Typography variant="caption" sx={{ maxWidth: 92, textAlign: "center", lineHeight: 1.2 }}>
                        {label}
                      </Typography>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <FiEye size={18} />
                <Typography variant="h6" fontWeight={700}>
                  Catalog Preview
                </Typography>
              </Stack>
              <Card variant="outlined" sx={{ bgcolor: "background.default" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          color: "primary.main",
                          flexShrink: 0,
                        }}
                      >
                        <PreviewIcon size={18} />
                      </Box>
                      <Typography variant="h6" fontWeight={700} sx={{ wordBreak: "break-word" }}>
                        {formik.values.name || "Category name"}
                      </Typography>
                    </Stack>
                    <Chip size="small" label={formatEnumLabel(formik.values.status)} color={isActive ? "success" : "default"} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {formik.values.description || "A short description will appear here."}
                  </Typography>
                </CardContent>
              </Card>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                This is exactly how the category will look on the Service Categories and Browse Services pages.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3, pt: 1 }}>
        <Button variant="outlined" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate(SERVICE_CATEGORIES_LISTING_PATH)}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" startIcon={<FiCheck size={16} />} disabled={formik.isSubmitting}>
          {formik.isSubmitting ? "Saving…" : mode === "edit" ? "Update" : "Create"}
        </Button>
      </Stack>
    </Box>
  );
};

export default ServiceCategoryForm;
