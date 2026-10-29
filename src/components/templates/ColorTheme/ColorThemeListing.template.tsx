import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Pagination,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme as useMuiTheme, alpha } from "@mui/material/styles";
import { FaPalette } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { TbPalette } from "react-icons/tb";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useColorThemeService } from "../../../services/useColorThemeService";
import type { ColorThemeResponse } from "../../../services/useColorThemeService";
import { UserTypeEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";
import ColorCard from "./ColorCard.template";

const SKELETON_COUNT = 6;
const GRID_COLUMNS = { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" };

interface ColorThemeListingTemplateProps {
  colorThemes: ColorThemeResponse[];
  /** 0-based, matching PageResponse.number. */
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  /** Called after a successful delete so the parent (owns fetching/pagination state,
   *  not built yet) can refetch its current page. */
  onRefresh?: () => void;
  isLoading?: boolean;
  /** Forces "Add Theme" off and passes the same override down to every ColorCard,
   *  regardless of role - used by the non-admin "pick your theme" entry point
   *  (Shared/AccountSettings.page.tsx). Defaults to true (defer to the SUPER_ADMIN
   *  check), matching the admin listing page. */
  allowMutations?: boolean;
}

/**
 * Ported from Portfolio's ColorThemeListing.template.tsx with the same simplification
 * ColorCard.template.tsx made: plain MUI (Pagination/Skeleton/Dialog/Snackbar) replaces
 * Portfolio's framer-motion + Tailwind + GlassCard/ListingShell/ConfirmDialog/useSnackbar,
 * none of which exist in ElderHive. Data-fetching/pagination state is owned by whatever
 * page mounts this (not yet built) - this template stays a "dumb" renderer over props,
 * matching ColorThemeForm.template.tsx's own established split; the delete confirmation
 * dialog and the delete API call itself are self-contained here, same division of
 * responsibility Portfolio's own version uses (onRefresh is the only thing delegated up).
 *
 * <p>"Add Theme" is hidden for a non-SUPER_ADMIN viewer - POST /api/v1/color-themes is
 * hasRole('SUPER_ADMIN') directly on the backend (Prompt 43), so a curated ADMIN would
 * just get a 403; ColorCard.template.tsx applies the identical gating to edit/delete.
 */
const ColorThemeListingTemplate: React.FC<ColorThemeListingTemplateProps> = ({
  colorThemes,
  page,
  totalPages,
  onPageChange,
  onRefresh,
  isLoading = false,
  allowMutations = true,
}) => {
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const { activeThemeName, isPreviewActive, resetTheme } = useTheme();
  const { deleteColorTheme } = useColorThemeService();
  const { user } = useAuthenticatedUser();
  const isSuperAdmin = allowMutations && user?.primaryRole === UserTypeEnum.SUPER_ADMIN;

  const [idPendingDelete, setIdPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const confirmDelete = async () => {
    if (idPendingDelete == null) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteColorTheme(idPendingDelete);
      setDeleteSuccess(true);
      onRefresh?.();
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Could not delete this theme."));
    } finally {
      setDeleting(false);
      setIdPendingDelete(null);
    }
  };

  return (
    <Box>
      {isPreviewActive && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" startIcon={<FiX size={14} />} onClick={resetTheme}>
              Reset
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Active Injection: <strong>{activeThemeName}</strong> — real-time stylesheet override active.
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
              color: "primary.main",
            }}
          >
            <FaPalette size={20} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Color Themes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pick, preview, and manage the platform's color themes.
            </Typography>
          </Box>
        </Stack>
        {isSuperAdmin && (
          <Button variant="contained" onClick={() => navigate("/admin/color-themes/new")}>
            Add Theme
          </Button>
        )}
      </Stack>

      {isLoading && (
        <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 3, mb: 4 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={180} />
          ))}
        </Box>
      )}

      {!isLoading && colorThemes.length > 0 && (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 3, mb: 4 }}>
            {colorThemes.map((theme) => (
              <ColorCard key={theme.id} colorTheme={theme} onDelete={(id) => setIdPendingDelete(id)} allowMutations={allowMutations} />
            ))}
          </Box>

          {totalPages > 1 && (
            <Stack alignItems="center">
              <Pagination count={totalPages} page={page + 1} onChange={(_, newPage) => onPageChange(newPage - 1)} color="primary" />
            </Stack>
          )}
        </>
      )}

      {!isLoading && colorThemes.length === 0 && (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <TbPalette size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No color themes found
          </Typography>
          <Typography variant="body2">Create a new theme to get started.</Typography>
        </Box>
      )}

      <Dialog
        open={idPendingDelete != null}
        onClose={() => {
          if (!deleting) setIdPendingDelete(null);
        }}
      >
        <DialogTitle>Delete this theme?</DialogTitle>
        <DialogContent>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIdPendingDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={deleteSuccess} autoHideDuration={3000} onClose={() => setDeleteSuccess(false)} message="Theme deleted" />
      <Snackbar open={Boolean(deleteError)} autoHideDuration={5000} onClose={() => setDeleteError(null)}>
        <Alert severity="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ColorThemeListingTemplate;
