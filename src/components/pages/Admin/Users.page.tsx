import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { FiUserCheck, FiUserX, FiUsers } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import Select from "../../atoms/Select/Select";
import ManageUserRolesDialog from "../../molecules/ManageUserRolesDialog/ManageUserRolesDialog";
import type { ManageUserRolesTarget } from "../../molecules/ManageUserRolesDialog/ManageUserRolesDialog";
import { useAdminUserService } from "../../../services/useAdminUserService";
import type { AdminUserResponse } from "../../../services/useAdminUserService";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { UserStatusEnum, UserTypeEnum } from "../../../utils/enums";
import { useDebounce, getErrorMessage } from "../../../utils/helper";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;
const ALL = "ALL";

const USER_TYPE_FILTER_OPTIONS = [{ value: ALL, label: "All roles" }, ...Object.values(UserTypeEnum).map((t) => ({ value: t, label: t }))];
const STATUS_FILTER_OPTIONS = [{ value: ALL, label: "All statuses" }, ...Object.values(UserStatusEnum).map((s) => ({ value: s, label: s }))];

const STATUS_COLOR: Record<UserStatusEnum, "success" | "default" | "error"> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "error",
};

/**
 * Admin > Users (Prompt 95) - list/search/suspend users plus the "manage roles" dialog,
 * wired to Prompt 93's AdminUserController (USER_MANAGE-gated server-side; no FE-side
 * fine-grained-permission check, same documented limitation AdminRoutes.tsx notes for
 * every other admin page). Granting/revoking ADMIN or SUPER_ADMIN is additionally
 * restricted to Super-Admin viewers here, mirroring
 * AdminUserServiceImpl#requireSuperAdmin.
 */
const AdminUsersPage: React.FC = () => {
  const adminUserService = useAdminUserService();
  const { user } = useAuthenticatedUser();
  const callerIsSuperAdmin = user?.primaryRole === UserTypeEnum.SUPER_ADMIN;

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<AdminUserResponse | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [rolesTarget, setRolesTarget] = useState<AdminUserResponse | null>(null);

  const debouncedSetSearch = useDebounce((value: string) => {
    setSearch(value);
    setPage(0);
  }, SEARCH_DEBOUNCE_MS);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await adminUserService.getAll({
        page,
        size: PAGE_SIZE,
        search: search.trim() || undefined,
        userType: userTypeFilter === ALL ? undefined : (userTypeFilter as UserTypeEnum),
        status: statusFilter === ALL ? undefined : (statusFilter as UserStatusEnum),
      });
      setUsers(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load users"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, userTypeFilter, statusFilter]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const replaceInList = (updated: AdminUserResponse) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspending(true);
    try {
      const updated = await adminUserService.suspend(suspendTarget.id);
      replaceInList(updated);
      setSuspendTarget(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not suspend user"));
    } finally {
      setSuspending(false);
    }
  };

  const rolesDialogTarget: ManageUserRolesTarget | null = useMemo(
    () =>
      rolesTarget
        ? { id: rolesTarget.id, fullName: rolesTarget.fullName, email: rolesTarget.email, roles: rolesTarget.roles, primaryRole: rolesTarget.primaryRole }
        : null,
    [rolesTarget]
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiUsers size={22} color="#2F6F5E" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search, suspend, and manage roles for every account on the platform.
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField
          label="Search"
          placeholder="Search by name or email"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
          sx={{ maxWidth: 320 }}
        />
        <Select
          label="Role"
          sx={{ minWidth: 200 }}
          value={userTypeFilter}
          options={USER_TYPE_FILTER_OPTIONS}
          onChange={(value) => {
            setUserTypeFilter(value);
            setPage(0);
          }}
        />
        <Select
          label="Status"
          sx={{ minWidth: 200 }}
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
        />
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
      ) : users.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiUsers size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No users found
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{u.fullName ?? "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {u.roles.map((role) => (
                          <Chip
                            key={role}
                            size="small"
                            label={role}
                            color={role === u.primaryRole ? "primary" : "default"}
                            variant={role === u.primaryRole ? "filled" : "outlined"}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.status} color={STATUS_COLOR[u.status]} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" variant="outlined" startIcon={<FiUserCheck />} onClick={() => setRolesTarget(u)}>
                          Roles
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<FiUserX />}
                          disabled={u.status === UserStatusEnum.SUSPENDED}
                          onClick={() => setSuspendTarget(u)}
                        >
                          Suspend
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

      <Dialog open={suspendTarget != null} onClose={() => !suspending && setSuspendTarget(null)}>
        <DialogTitle>Suspend this user?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {suspendTarget?.fullName ?? suspendTarget?.email} will no longer be able to log in until reactivated.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendTarget(null)} disabled={suspending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleSuspend} loading={suspending}>
            Suspend
          </Button>
        </DialogActions>
      </Dialog>

      <ManageUserRolesDialog
        open={rolesTarget != null}
        target={rolesDialogTarget}
        callerIsSuperAdmin={callerIsSuperAdmin}
        onClose={() => setRolesTarget(null)}
        onGrant={async (roleType) => {
          if (!rolesTarget) throw new Error("No target selected");
          const updated = await adminUserService.grantRole(rolesTarget.id, roleType);
          replaceInList(updated);
          setRolesTarget(updated);
          return { roles: updated.roles, primaryRole: updated.primaryRole };
        }}
        onRevoke={async (roleType) => {
          if (!rolesTarget) throw new Error("No target selected");
          const updated = await adminUserService.revokeRole(rolesTarget.id, roleType);
          replaceInList(updated);
          setRolesTarget(updated);
          return { roles: updated.roles, primaryRole: updated.primaryRole };
        }}
      />
    </Box>
  );
};

export default AdminUsersPage;
