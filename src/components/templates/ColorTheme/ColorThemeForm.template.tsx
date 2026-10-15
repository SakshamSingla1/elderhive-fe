import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import ColorPicker from "../../atoms/ColorPicker/ColorPicker";
import type { ColorPalette, ColorThemePayload, ColorThemeResponse } from "../../../services/useColorThemeService";
import { ColorThemeStatusEnum } from "../../../utils/enums";
import { DEFAULT_PALETTE } from "../../../utils/themeConstants";

// ColorThemePayload.palette is optional at the API-contract level (a PUT that only
// renames a theme could omit it, say), but this form always manages a full palette -
// narrowing it here means every formik.values.palette.colorGroups access below is
// sound without a defensive ?./?? on every line.
type ColorThemeFormValues = ColorThemePayload & { palette: ColorPalette };

// The listing page itself is the next prompt's job - this is the fixed destination
// Cancel/Back always goes to, same as Portfolio hardcoding ADMIN_ROUTES.COLOR_THEME
// directly in its own template rather than taking it as a prop.
const COLOR_THEMES_LISTING_PATH = "/admin/color-themes";

export type ColorThemeFormMode = "create" | "edit" | "view";

const MODE_TITLES: Record<ColorThemeFormMode, string> = {
  create: "Create Color Theme",
  edit: "Edit Color Theme",
  view: "View Color Theme",
};

function capitalizeFirstLetter(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

const validationSchema = Yup.object({
  themeName: Yup.string().required("Theme name is required"),
  palette: Yup.object({
    colorGroups: Yup.array()
      .of(
        Yup.object({
          groupName: Yup.string().required("Group name is required"),
          colorShades: Yup.array()
            .of(
              Yup.object({
                colorName: Yup.string().required("Color name is required"),
                colorCode: Yup.string().required("Color code is required"),
              })
            )
            .min(1, "Add at least 1 shade"),
        })
      )
      .min(1, "Add at least 1 color group"),
  }),
});

interface ColorThemeFormProps {
  mode: ColorThemeFormMode;
  /** The theme being edited/viewed - omitted (or null) for "create". */
  colorTheme?: ColorThemeResponse | null;
  onSubmit: (values: ColorThemePayload) => void | Promise<void>;
}

/**
 * Ported from Portfolio's ColorThemeForm.template.tsx with minimal changes: plain MUI
 * (Card/TextField/Button) replaces Portfolio's Tailwind classes and custom TextField/
 * Button/FormShell atoms (none of which exist in ElderHive); formik.isSubmitting alone
 * drives the submit button's disabled state (Formik tracks this from onSubmit's returned
 * promise automatically, so no separate `submitting` prop is needed); onSubmit/colorTheme
 * are typed against ElderHive's own ColorThemePayload/ColorThemeResponse split (Prompt 46)
 * rather than Portfolio's single merged ColorTheme type, which ElderHive doesn't have.
 *
 * <p>One correctness fix while porting: Portfolio's form never touches `status` at all,
 * which is fine for Portfolio's own ColorThemeServiceImpl#updateTheme (full javadoc not
 * reviewed here) but is NOT fine for ElderHive's — its updateTheme sets
 * `theme.setStatus(request.getStatus())` unconditionally, so submitting an edit with no
 * status on the payload would null out the column. The existing theme's status is
 * preserved into the form's values for edit/view, and a new theme always starts ACTIVE
 * (matching what the backend's createTheme forces anyway) so this is never left to chance.
 */
const ColorThemeForm: React.FC<ColorThemeFormProps> = ({ mode, colorTheme, onSubmit }) => {
  const navigate = useNavigate();
  const isViewMode = mode === "view";

  const formik = useFormik<ColorThemeFormValues>({
    initialValues: {
      themeName: "",
      palette: DEFAULT_PALETTE,
      status: ColorThemeStatusEnum.ACTIVE,
    },
    validationSchema,
    onSubmit,
  });

  const { setValues } = formik;
  useEffect(() => {
    if (colorTheme) {
      setValues({ themeName: colorTheme.themeName, palette: colorTheme.palette, status: colorTheme.status });
    }
  }, [colorTheme, setValues]);

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
        {MODE_TITLES[mode]}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Configure the specific color codes for your fixed theme structure.
      </Typography>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Theme Information
            </Typography>
            <TextField
              label="Theme Name"
              placeholder="e.g. Modern Gold, Dark Premium"
              name="themeName"
              fullWidth
              required
              value={formik.values.themeName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(formik.touched.themeName && formik.errors.themeName)}
              helperText={formik.touched.themeName && formik.errors.themeName}
              disabled={isViewMode}
            />
          </CardContent>
        </Card>

        {formik.values.palette.colorGroups.map((group, groupIndex) => (
          <Card key={group.groupName} variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                {capitalizeFirstLetter(group.groupName)} Palette
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                  gap: 2,
                }}
              >
                {group.colorShades.map((shade, shadeIndex) => (
                  <ColorPicker
                    key={shade.colorName}
                    label={shade.colorName}
                    value={shade.colorCode}
                    onChange={(color) =>
                      formik.setFieldValue(`palette.colorGroups.${groupIndex}.colorShades.${shadeIndex}.colorCode`, color)
                    }
                    disabled={isViewMode}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, pt: 1 }}>
          <Button variant="outlined" onClick={() => navigate(COLOR_THEMES_LISTING_PATH)}>
            {isViewMode ? "Back" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Saving…" : mode === "edit" ? "Update" : "Create"}
            </Button>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default ColorThemeForm;
