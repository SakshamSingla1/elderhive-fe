import React, { useEffect, useState } from "react";
import { Alert, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import Button from "../../atoms/Button/Button";
import Select from "../../atoms/Select/Select";
import { UserTypeEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";

export interface ManageUserRolesTarget {
  id: number;
  fullName: string | null;
  email: string;
  roles: UserTypeEnum[];
  primaryRole: UserTypeEnum;
}

export interface ManageUserRolesResult {
  roles: UserTypeEnum[];
  primaryRole: UserTypeEnum;
}

export interface ManageUserRolesDialogProps {
  open: boolean;
  target: ManageUserRolesTarget | null;
  // Only a SUPER_ADMIN may grant/revoke ADMIN or SUPER_ADMIN - the backend
  // (AdminUserServiceImpl#requireSuperAdmin) enforces this too; the caller's own role
  // gates which grant options are offered and which held-role chips get a remove
  // action here, rather than letting a plain ADMIN attempt it and see a 403.
  callerIsSuperAdmin: boolean;
  onClose: () => void;
  onGrant: (roleType: UserTypeEnum) => Promise<ManageUserRolesResult>;
  onRevoke: (roleType: UserTypeEnum) => Promise<ManageUserRolesResult>;
}

const RESTRICTED_ROLES: UserTypeEnum[] = [UserTypeEnum.ADMIN, UserTypeEnum.SUPER_ADMIN];
const ALL_ROLES = Object.values(UserTypeEnum) as UserTypeEnum[];

// Admin > Users "manage base roles" dialog (Prompt 95) - the multi-role account system (a
// user can hold several of the 5 UserTypeEnum roles at once via UserRoleMapping, Prompt
// 93's backend), not a fine-grained Role/Permission assignment (that's a separate,
// ADMIN-only concept gated by ROLE_MANAGE and not touched here).
const ManageUserRolesDialog: React.FC<ManageUserRolesDialogProps> = ({ open, target, callerIsSuperAdmin, onClose, onGrant, onRevoke }) => {
  const [roles, setRoles] = useState<UserTypeEnum[]>([]);
  const [primaryRole, setPrimaryRole] = useState<UserTypeEnum | null>(null);
  const [grantSelection, setGrantSelection] = useState<string>("");
  const [busyRole, setBusyRole] = useState<UserTypeEnum | null>(null);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setRoles(target.roles);
      setPrimaryRole(target.primaryRole);
      setError(null);
      setGrantSelection("");
    }
  }, [target]);

  if (!target) return null;

  const busy = Boolean(busyRole) || granting;
  const grantableRoles = ALL_ROLES.filter((r) => !roles.includes(r) && (callerIsSuperAdmin || !RESTRICTED_ROLES.includes(r)));
  // A leading blank option so the MUI Select has something to match its initial ""
  // value against (avoids an "out-of-range value" console warning) without needing a
  // real role pre-selected.
  const grantSelectOptions = [{ value: "", label: "Choose a role" }, ...grantableRoles.map((r) => ({ value: r, label: r }))];

  const handleGrant = async () => {
    if (!grantSelection || busy) return;
    setGranting(true);
    setError(null);
    try {
      const result = await onGrant(grantSelection as UserTypeEnum);
      setRoles(result.roles);
      setPrimaryRole(result.primaryRole);
      setGrantSelection("");
    } catch (e) {
      setError(getErrorMessage(e, "Failed to grant role"));
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (roleType: UserTypeEnum) => {
    if (busy) return;
    setBusyRole(roleType);
    setError(null);
    try {
      const result = await onRevoke(roleType);
      setRoles(result.roles);
      setPrimaryRole(result.primaryRole);
    } catch (e) {
      // Surfaces the backend's real safety-rule message verbatim (e.g. "Cannot revoke
      // the user's primary role") rather than a generic toast.
      setError(getErrorMessage(e, "Failed to revoke role"));
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Manage roles</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {target.fullName ?? target.email}&rsquo;s account-level roles. The filled chip is their current primary role.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          {roles.map((role) => {
            const isPrimary = role === primaryRole;
            const isRestricted = RESTRICTED_ROLES.includes(role) && !callerIsSuperAdmin;
            return (
              <Chip
                key={role}
                label={isPrimary ? `${role} · primary` : role}
                color={isPrimary ? "primary" : "default"}
                variant={isPrimary ? "filled" : "outlined"}
                onDelete={isPrimary || isRestricted || busy ? undefined : () => handleRevoke(role)}
                sx={{ opacity: busyRole === role ? 0.6 : 1, fontWeight: isPrimary ? 700 : 500 }}
              />
            );
          })}
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Grant an additional role
        </Typography>
        <Stack direction="row" gap={1} alignItems="flex-start">
          <Select
            label="Role"
            value={grantSelection}
            options={grantSelectOptions}
            onChange={(value) => setGrantSelection(value)}
            disabled={grantableRoles.length === 0 || busy}
          />
          <Button variant="outlined" onClick={handleGrant} loading={granting} disabled={!grantSelection || busy}>
            Grant
          </Button>
        </Stack>
        {grantableRoles.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            This user already holds every role you can grant.
          </Typography>
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

export default ManageUserRolesDialog;
