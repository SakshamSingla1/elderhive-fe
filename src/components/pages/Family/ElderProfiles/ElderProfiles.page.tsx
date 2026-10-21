import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiEdit2, FiPlus, FiTrash2, FiUserPlus, FiUsers } from "react-icons/fi";
import Button from "../../../atoms/Button/Button";
import { useElderProfileService, type ElderProfileResponseDTO } from "../../../../services/useElderProfileService";
import { getErrorMessage } from "../../../../utils/helper";

/**
 * The family member's own "who I manage care for" listing — GET /elder-profiles already
 * returns owned + co-managed profiles merged (ElderProfileServiceImpl#getByFamilyUserId,
 * Prompt 62), so this page doesn't need to distinguish the two itself. "Link Existing
 * Elder" navigates to the separate invite-based flow (LinkElderProfile.page.tsx) rather
 * than this page's own "Add" button, which creates a brand-new blank profile instead.
 */
const ElderProfilesPage: React.FC = () => {
  const navigate = useNavigate();
  const elderProfileService = useElderProfileService();

  const [profiles, setProfiles] = useState<ElderProfileResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await elderProfileService.getMine(0, 100);
      setProfiles(response.content);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load elder profiles"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (profile: ElderProfileResponseDTO) => {
    if (!window.confirm(`Remove "${profile.fullName}"? This cannot be undone.`)) return;
    setDeletingId(profile.id);
    setActionError(null);
    try {
      await elderProfileService.remove(profile.id);
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      setSuccessMessage("Elder profile removed");
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not remove this elder profile"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FiUsers size={22} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Elder Profiles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The people you manage care for.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<FiUserPlus size={16} />} onClick={() => navigate("/family/elder-profiles/link")}>
            Link Existing Elder
          </Button>
          <Button variant="contained" startIcon={<FiPlus size={16} />} onClick={() => navigate("/family/elder-profiles/new")}>
            Add Elder Profile
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : profiles.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiUsers size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No elder profiles yet
          </Typography>
          <Typography variant="body2">Add one, or link an existing elder's account.</Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Linked Account</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{profile.fullName}</TableCell>
                  <TableCell>{profile.dateOfBirth || "—"}</TableCell>
                  <TableCell>{profile.gender || "—"}</TableCell>
                  <TableCell>
                    {profile.elderUserId ? (
                      <Chip label="Linked" size="small" color="success" variant="outlined" />
                    ) : (
                      <Chip label="Not linked" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/family/elder-profiles/${profile.id}`)}>
                        <FiEdit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deletingId === profile.id}
                        onClick={() => handleDelete(profile)}
                      >
                        <FiTrash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default ElderProfilesPage;
