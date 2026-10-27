import React, { useState } from "react";
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import Button from "../../atoms/Button/Button";
import Checkbox from "../../atoms/Checkbox/Checkbox";
import type { PermissionResponse } from "../../../services/usePermissionService";
import type { RoleResponse } from "../../../services/useRoleService";
import { getErrorMessage } from "../../../utils/helper";

export interface PermissionAssignDialogProps {
  open: boolean;
  /** The role whose permissions are being managed - omitted (or null) while closed. */
  role: RoleResponse | null;
  /** The full permission catalog (PermissionController's read-only GET /permissions). */
  permissions: PermissionResponse[];
  onClose: () => void;
  onAssign: (permission: PermissionResponse) => Promise<void>;
  onUnassign: (permission: PermissionResponse) => Promise<void>;
}

// Admin > Roles & Permissions "manage permissions" dialog (Prompt 96) - a Super Admin
// checks/unchecks each catalog permission for the selected role, wired to
// PermissionController's assign/unassign endpoints (Prompt 26) via usePermissionService.ts.
// Mirrors ManageUserRolesDialog's per-row busy-state pattern, applied to Role<->Permission
// instead of User<->UserType.
const PermissionAssignDialog: React.FC<PermissionAssignDialogProps> = ({ open, role, permissions, onClose, onAssign, onUnassign }) => {
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!role) return null;

  const assignedCodes = new Set(role.permissionCodes);

  const handleToggle = async (permission: PermissionResponse, checked: boolean) => {
    setError(null);
    setBusyCode(permission.code);
    try {
      if (checked) {
        await onAssign(permission);
      } else {
        await onUnassign(permission);
      }
    } catch (err) {
      setError(getErrorMessage(err, `Could not ${checked ? "assign" : "unassign"} ${permission.code}.`));
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Permissions — {role.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {permissions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No permissions exist in the catalog yet.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {permissions.map((permission) => (
              <Checkbox
                key={permission.id}
                label={
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {permission.code}
                    </Typography>
                    {permission.description && (
                      <Typography variant="caption" color="text.secondary">
                        {permission.description}
                      </Typography>
                    )}
                  </Stack>
                }
                checked={assignedCodes.has(permission.code)}
                disabled={busyCode === permission.code}
                onChange={(checked) => handleToggle(permission, checked)}
              />
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PermissionAssignDialog;
