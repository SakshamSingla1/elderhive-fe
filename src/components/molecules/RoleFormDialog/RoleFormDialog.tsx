import React, { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import Button from "../../atoms/Button/Button";
import type { RolePayload, RoleResponse } from "../../../services/useRoleService";
import { RoleStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

export interface RoleFormDialogProps {
  open: boolean;
  /** The role being edited - omitted (or null) for "create". */
  role?: RoleResponse | null;
  onClose: () => void;
  onSubmit: (values: RolePayload) => Promise<void>;
}

const EMPTY_VALUES: RolePayload = { name: "", description: "", status: RoleStatusEnum.ACTIVE };

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  description: Yup.string(),
  status: Yup.string().oneOf(Object.values(RoleStatusEnum)),
});

// Admin > Roles & Permissions "create/edit role" dialog (Prompt 96), wired to
// RoleController (Prompt 21) via useRoleService.ts. Permission assignment is a separate
// concern (PermissionAssignDialog), not touched here.
const RoleFormDialog: React.FC<RoleFormDialogProps> = ({ open, role, onClose, onSubmit }) => {
  const isEdit = role != null;
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const formik = useFormik<RolePayload>({
    initialValues: EMPTY_VALUES,
    validationSchema,
    onSubmit: async (values) => {
      setSubmitError(null);
      try {
        await onSubmit(values);
      } catch (err) {
        setSubmitError(getErrorMessage(err, `Could not ${isEdit ? "update" : "create"} this role.`));
      }
    },
  });

  const { setValues, resetForm } = formik;
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (role) {
      setValues({ name: role.name, description: role.description ?? "", status: role.status });
    } else {
      resetForm({ values: EMPTY_VALUES });
    }
  }, [open, role, setValues, resetForm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Edit Role" : "Create Role"}</DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
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
            <TextField select label="Status" name="status" fullWidth value={formik.values.status} onChange={formik.handleChange}>
              {Object.values(RoleStatusEnum).map((status) => (
                <MenuItem key={status} value={status}>
                  {formatEnumLabel(status)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formik.isSubmitting}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RoleFormDialog;
