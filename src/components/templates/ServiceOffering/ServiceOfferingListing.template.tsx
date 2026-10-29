import React, { useEffect, useState } from "react";
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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiEdit3, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import type { ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import { ServiceCategoryStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const SKELETON_COUNT = 6;
const GRID_COLUMNS = { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" };
const ALL_CATEGORIES_VALUE = "ALL";

interface ServiceOfferingListingTemplateProps {
  serviceOfferings: ServiceOfferingResponse[];
  /** 0-based, matching PageResponse.number. */
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  categoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
  /** Called after a successful delete so the parent (owns fetching/pagination state) can
   *  refetch its current page. Ignored when allowMutations is false. */
  onRefresh?: () => void;
  isLoading?: boolean;
  /** Hides Add/Edit/Delete and the "No offerings yet" admin copy - used by the
   *  family-facing BrowseServices.page.tsx (Prompt 74), which reuses this same template
   *  read-only, matching ColorThemeListingTemplate's own allowMutations split with its
   *  non-admin AccountSettings entry point. Defaults to true, matching the admin page. */
  allowMutations?: boolean;
}

/**
 * Admin catalog CRUD surface for ServiceOffering (Prompt 72/73 backend, Prompt 74 UI),
 * also reused read-only as the family-facing browse view. Mirrors
 * ServiceCategoryListingTemplate's own card-grid + Pagination + Skeleton + delete-dialog +
 * Snackbar shape, plus a category filter Select fetched directly from
 * useServiceCategoryService (ACTIVE categories only, size=100 - the full catalog from
 * Prompt 71's starter seed plus whatever an admin has since added, comfortably under one
 * page) so both callers get filtering without each needing to wire it up separately.
 */
const ServiceOfferingListingTemplate: React.FC<ServiceOfferingListingTemplateProps> = ({
  serviceOfferings,
  page,
  totalPages,
  onPageChange,
  categoryId,
  onCategoryChange,
  onRefresh,
  isLoading = false,
  allowMutations = true,
}) => {
  const navigate = useNavigate();
  const { deleteServiceOffering } = useServiceOfferingService();
  const { getServiceCategories } = useServiceCategoryService();

  const [categories, setCategories] = useState<ServiceCategoryResponse[]>([]);
  const [idPendingDelete, setIdPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    getServiceCategories({ status: ServiceCategoryStatusEnum.ACTIVE, size: 100 })
      .then((result) => setCategories(result.content))
      .catch(() => {
        // The filter dropdown degrades to "All Categories" only - not worth its own
        // error Snackbar on top of the listing's own loadError.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    if (idPendingDelete == null) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteServiceOffering(idPendingDelete);
      setDeleteSuccess(true);
      onRefresh?.();
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Could not delete this service offering."));
    } finally {
      setDeleting(false);
      setIdPendingDelete(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FiShoppingBag size={22} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {allowMutations ? "Services" : "Browse Services"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {allowMutations ? "Manage the catalog of bookable service offerings." : "Browse available services by category."}
            </Typography>
          </Box>
        </Stack>
        {allowMutations && (
          <Button variant="contained" onClick={() => navigate("/admin/services/new")}>
            Add Service
          </Button>
        )}
      </Stack>

      <FormControl size="small" sx={{ minWidth: 220, mb: 3 }}>
        <InputLabel id="service-offering-category-filter-label">Category</InputLabel>
        <Select
          labelId="service-offering-category-filter-label"
          label="Category"
          value={categoryId == null ? ALL_CATEGORIES_VALUE : String(categoryId)}
          onChange={(e) => onCategoryChange(e.target.value === ALL_CATEGORIES_VALUE ? null : Number(e.target.value))}
        >
          <MenuItem value={ALL_CATEGORIES_VALUE}>All Categories</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={String(category.id)}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading && (
        <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 3, mb: 4 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={160} />
          ))}
        </Box>
      )}

      {!isLoading && serviceOfferings.length > 0 && (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 3, mb: 4 }}>
            {serviceOfferings.map((offering) => (
              <Card key={offering.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" fontWeight={700}>
                      {offering.name}
                    </Typography>
                    <Chip size="small" label={formatEnumLabel(offering.status)} color={offering.status === "ACTIVE" ? "success" : "default"} />
                  </Stack>
                  {offering.categoryName && (
                    <Chip size="small" variant="outlined" label={offering.categoryName} sx={{ mt: 1 }} />
                  )}
                  {offering.description && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {offering.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={2} mt={1.5}>
                    {offering.basePrice != null && (
                      <Typography variant="body2" fontWeight={600}>
                        ${offering.basePrice}
                      </Typography>
                    )}
                    {offering.durationMinutes != null && (
                      <Typography variant="body2" color="text.secondary">
                        {offering.durationMinutes} min
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
                {allowMutations ? (
                  <CardActions sx={{ justifyContent: "flex-end" }}>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => navigate(`/admin/services/${offering.id}`)} aria-label="Edit">
                        <FiEdit3 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setIdPendingDelete(offering.id)} aria-label="Delete">
                        <FiTrash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                ) : (
                  offering.status === "ACTIVE" && (
                    <CardActions sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" variant="contained" onClick={() => navigate(`/family/bookings/new?serviceOfferingId=${offering.id}`)}>
                        Book
                      </Button>
                    </CardActions>
                  )
                )}
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

      {!isLoading && serviceOfferings.length === 0 && (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiShoppingBag size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No service offerings found
          </Typography>
          <Typography variant="body2">
            {allowMutations ? "Create a new service to get started." : "Try a different category."}
          </Typography>
        </Box>
      )}

      {allowMutations && (
        <>
          <Dialog
            open={idPendingDelete != null}
            onClose={() => {
              if (!deleting) setIdPendingDelete(null);
            }}
          >
            <DialogTitle>Delete this service?</DialogTitle>
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

          <Snackbar open={deleteSuccess} autoHideDuration={3000} onClose={() => setDeleteSuccess(false)} message="Service deleted" />
          <Snackbar open={Boolean(deleteError)} autoHideDuration={5000} onClose={() => setDeleteError(null)}>
            <Alert severity="error" onClose={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
};

export default ServiceOfferingListingTemplate;
