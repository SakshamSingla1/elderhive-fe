import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FiKey, FiPlus, FiShield, FiTrash2 } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import RoleFormDialog from "../../molecules/RoleFormDialog/RoleFormDialog";
import PermissionAssignDialog from "../../molecules/PermissionAssignDialog/PermissionAssignDialog";
import { useRoleService } from "../../../services/useRoleService";
import type { RolePayload, RoleResponse } from "../../../services/useRoleService";
import { usePermissionService } from "../../../services/usePermissionService";
import type { PermissionResponse } from "../../../services/usePermissionService";
import { RoleStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const PAGE_SIZE = 20;

const STATUS_COLOR: Record<RoleStatusEnum, "success" | "default" | "error"> = {
  ACTIVE: "success",
  INACTIVE: "default",
  DELETED: "error",
};

/**
 * Admin > Roles & Permissions (Prompt 96) - lets a Super Admin create/edit Role rows
 * (Phase 3's RoleController) and assign/unassign the Permission catalog to a role
 * (PermissionController). Super-Admin-only at the route level (AdminRoutes.tsx) since
 * ROLE_MANAGE is kept out of the curated "Admin" role by AdminBootstrapSeeder - every
 * endpoint here would 403 for a plain ADMIN anyway, so there's no further in-page gating.
 */
const RolesPermissionsPage: React.FC = () => {
  const roleService = useRoleService();
  const permissionService = usePermissionService();

  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formTarget, setFormTarget] = useState<RoleResponse | "new" | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<RoleResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [rolesPage, allPermissions] = await Promise.all([roleService.getAll(page, PAGE_SIZE), permissionService.getAll()]);
      setRoles(rolesPage.content);
      setTotalPages(rolesPage.totalPages);
      setPermissions(allPermissions);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load roles"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const replaceInList = (updated: RoleResponse) => {
    setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setPermissionsTarget((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleFormSubmit = async (values: RolePayload) => {
    if (formTarget === "new") {
      const created = await roleService.create(values);
      setRoles((prev) => [created, ...prev]);
    } else if (formTarget) {
      const updated = await roleService.update(formTarget.id, values);
      replaceInList(updated);
    }
    setFormTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.remove(deleteTarget.id);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not delete this role"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FiShield size={22} color="#2F6F5E" />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Roles &amp; Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create fine-grained admin roles and assign permissions from the catalog.
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => setFormTarget("new")}>
          New Role
        </Button>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : roles.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiShield size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No roles found
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{role.name}</TableCell>
                    <TableCell>{role.description ?? "—"}</TableCell>
                    <TableCell>{role.permissionCodes.length}</TableCell>
                    <TableCell>
                      <Chip size="small" label={formatEnumLabel(role.status)} color={STATUS_COLOR[role.status]} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" variant="outlined" startIcon={<FiKey />} onClick={() => setPermissionsTarget(role)}>
                          Permissions
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => setFormTarget(role)}>
                          Edit
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<FiTrash2 />} onClick={() => setDeleteTarget(role)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {totalPages > 1 && (
            <Stack alignItems="center" mt={3}>
              <Pagination count={totalPages} page={page + 1} onChange={(_, newPage) => setPage(newPage - 1)} color="primary" />
            </Stack>
          )}
        </>
      )}

      <RoleFormDialog
        open={formTarget != null}
        role={formTarget === "new" ? null : formTarget}
        onClose={() => setFormTarget(null)}
        onSubmit={handleFormSubmit}
      />

      <PermissionAssignDialog
        open={permissionsTarget != null}
        role={permissionsTarget}
        permissions={permissions}
        onClose={() => setPermissionsTarget(null)}
        onAssign={async (permission) => {
          if (!permissionsTarget) return;
          await permissionService.assignToRole(permissionsTarget.id, permission.id);
          replaceInList({ ...permissionsTarget, permissionCodes: [...permissionsTarget.permissionCodes, permission.code] });
        }}
        onUnassign={async (permission) => {
          if (!permissionsTarget) return;
          await permissionService.unassignFromRole(permissionsTarget.id, permission.id);
          replaceInList({
            ...permissionsTarget,
            permissionCodes: permissionsTarget.permissionCodes.filter((code) => code !== permission.code),
          });
        }}
      />

      <Dialog open={deleteTarget != null} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this role?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &ldquo;{deleteTarget?.name}&rdquo; will be permanently removed. Any user currently assigned this role loses its
            fine-grained permissions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolesPermissionsPage;
