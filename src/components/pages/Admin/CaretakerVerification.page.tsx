import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { FiCheckCircle } from "react-icons/fi";
import Select from "../../atoms/Select/Select";
import Button from "../../atoms/Button/Button";
import CaretakerSearchAutocomplete from "../../molecules/CaretakerSearchAutocomplete/CaretakerSearchAutocomplete";
import { useCaretakerService, type CaretakerProfileResponseDTO } from "../../../services/useCaretakerService";
import { CaretakerVerificationStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: CaretakerVerificationStatusEnum.PENDING, label: "Pending" },
  { value: CaretakerVerificationStatusEnum.VERIFIED, label: "Verified" },
  { value: CaretakerVerificationStatusEnum.REJECTED, label: "Rejected" },
];

const STATUS_COLOR: Record<CaretakerVerificationStatusEnum, "default" | "success" | "error"> = {
  [CaretakerVerificationStatusEnum.PENDING]: "default",
  [CaretakerVerificationStatusEnum.VERIFIED]: "success",
  [CaretakerVerificationStatusEnum.REJECTED]: "error",
};

/**
 * CaretakerProfileController has no admin-only "list all caretakers" endpoint - the plain
 * GET /api/v1/caretaker-profiles (Prompt 64, open to any authenticated caller - a caretaker
 * directory listing, not private data) already serves every caretaker regardless of
 * verification status, so it doubles as the admin review queue here. That endpoint has no
 * verificationStatus filter param either, so the status dropdown filters client-side over
 * the fetched page.
 */
const AdminCaretakerVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const caretakerService = useCaretakerService();

  const [profiles, setProfiles] = useState<CaretakerProfileResponseDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(CaretakerVerificationStatusEnum.PENDING);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await caretakerService.getAll(0, 100);
      setProfiles(response.content);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load caretakers"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const visibleProfiles = statusFilter === "ALL" ? profiles : profiles.filter((p) => p.verificationStatus === statusFilter);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiCheckCircle size={22} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Caretaker Verification
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review caretaker profiles and their submitted documents.
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} alignItems={{ sm: "flex-end" }}>
        <Box sx={{ minWidth: 280 }}>
          <CaretakerSearchAutocomplete
            label="Jump to a caretaker"
            placeholder="Search by name"
            onSelect={(caretaker) => caretaker && navigate(`/admin/caretaker-verification/${caretaker.id}`)}
          />
        </Box>
        <Select
          label="Status"
          sx={{ minWidth: 180 }}
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={setStatusFilter}
        />
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : visibleProfiles.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiCheckCircle size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No caretakers match this filter
          </Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Caretaker</TableCell>
                <TableCell>Specialties</TableCell>
                <TableCell>Experience</TableCell>
                <TableCell>Rate</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleProfiles.map((profile) => (
                <TableRow key={profile.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{profile.fullName ?? "—"}</TableCell>
                  <TableCell>{profile.specialties.length > 0 ? profile.specialties.join(", ") : "—"}</TableCell>
                  <TableCell>{profile.yearsOfExperience != null ? `${profile.yearsOfExperience} yrs` : "—"}</TableCell>
                  <TableCell>{profile.hourlyRate != null ? `$${profile.hourlyRate}` : "—"}</TableCell>
                  <TableCell>{profile.ratingAverage != null ? profile.ratingAverage.toFixed(1) : "—"}</TableCell>
                  <TableCell>
                    <Chip label={formatEnumLabel(profile.verificationStatus)} size="small" color={STATUS_COLOR[profile.verificationStatus]} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={() => navigate(`/admin/caretaker-verification/${profile.id}`)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default AdminCaretakerVerificationPage;
