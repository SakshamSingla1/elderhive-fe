import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Pagination,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiEdit3, FiTag, FiTrash2 } from "react-icons/fi";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const SKELETON_COUNT = 6;
const GRID_COLUMNS = { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" };

interface ServiceCategoryListingTemplateProps {
  serviceCategories: ServiceCategoryResponse[];
  /** 0-based, matching PageResponse.number. */
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  /** Called after a successful delete so the parent (owns fetching/pagination state) can
   *  refetch its current page. */
  onRefresh?: () => void;
  isLoading?: boolean;
}

/**
 * Admin catalog CRUD surface for ServiceCategory (Prompt 71/73 backend, Prompt 74 UI).
 * Mirrors ColorThemeListingTemplate's own shape (card grid + Pagination + Skeleton +
 * delete-confirmation Dialog + Snackbar), minus the SUPER_ADMIN-only edit/delete gating
 * ColorTheme needs - ServiceCategoryController's mutations are SERVICE_MANAGE-gated via
 * the Phase 3 permission system (not a direct hasRole check), and this project has no
 * client-side fine-grained-permission check yet (same documented limitation as
 * CaretakerVerification.page.tsx), so the buttons are just shown to any ADMIN/SUPER_ADMIN
 * reaching this route and a 403 from the backend surfaces as the usual error Snackbar.
 */
const ServiceCategoryListingTemplate: React.FC<ServiceCategoryListingTemplateProps> = ({
  serviceCategories,
  page,
  totalPages,
  onPageChange,
  onRefresh,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const { deleteServiceCategory } = useServiceCategoryService();

  const [idPendingDelete, setIdPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const confirmDelete = async () => {
    if (idPendingDelete == null) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteServiceCategory(idPendingDelete);
      setDeleteSuccess(true);
      onRefresh?.();
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Could not delete this service category."));
    } finally {
      setDeleting(false);
      setIdPendingDelete(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FiTag size={22} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Service Categories
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage the catalog of service categories offerings are grouped under.
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" onClick={() => navigate("/admin/service-categories/new")}>
          Add Category
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 3, mb: 4 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} />
          ))}
        </Box>
      )}

      {!isLoading && serviceCategories.length > 0 && (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 3, mb: 4 }}>
            {serviceCategories.map((category) => (
              <Card key={category.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" fontWeight={700}>
                      {category.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={formatEnumLabel(category.status)}
                      color={category.status === "ACTIVE" ? "success" : "default"}
                    />
                  </Stack>
                  {category.description && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {category.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end" }}>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => navigate(`/admin/service-categories/${category.id}`)} aria-label="Edit">
                      <FiEdit3 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => setIdPendingDelete(category.id)} aria-label="Delete">
                      <FiTrash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            ))}
          </Box>

          {totalPages > 1 && (
            <Stack alignItems="center">
              <Pagination count={totalPages} page={page + 1} onChange={(_, newPage) => onPageChange(newPage - 1)} color="primary" />
            </Stack>
          )}
        </>
      )}

      {!isLoading && serviceCategories.length === 0 && (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiTag size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No service categories found
          </Typography>
          <Typography variant="body2">Create a new category to get started.</Typography>
        </Box>
      )}

      <Dialog
        open={idPendingDelete != null}
        onClose={() => {
          if (!deleting) setIdPendingDelete(null);
        }}
      >
        <DialogTitle>Delete this category?</DialogTitle>
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

      <Snackbar open={deleteSuccess} autoHideDuration={3000} onClose={() => setDeleteSuccess(false)} message="Category deleted" />
      <Snackbar open={Boolean(deleteError)} autoHideDuration={5000} onClose={() => setDeleteError(null)}>
        <Alert severity="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ServiceCategoryListingTemplate;
