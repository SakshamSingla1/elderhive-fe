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
  Divider,
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
import { useTheme, alpha, type Theme } from "@mui/material/styles";
import { FiArrowRight, FiClock, FiDollarSign, FiEdit3, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import type { ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import { ServiceCategoryStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";
import { resolveCategoryIcon } from "../../../utils/categoryIcons";

const SKELETON_COUNT = 6;
const GRID_COLUMNS = { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" };
const ALL_CATEGORIES_VALUE = "ALL";

// Every card gets a themed accent drawn from the live palette (never a hardcoded hex) so
// an admin's custom ColorTheme (Phase 6) still looks correct here - rotated deterministically
// by category so every offering in "Temple Visit" always lands on the same accent, reading
// as a deliberate per-category identity rather than a random color per card.
const ACCENT_PALETTE_KEYS = ["primary", "secondary", "success", "warning", "error"] as const;

function getAccentColor(theme: Theme, key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return theme.palette[ACCENT_PALETTE_KEYS[hash % ACCENT_PALETTE_KEYS.length]].main;
}

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
  const theme = useTheme();
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
            {serviceOfferings.map((offering) => {
              const offeringCategory = categories.find((c) => c.id === offering.categoryId);
              const OfferingIcon = resolveCategoryIcon(offeringCategory?.icon);
              const isActive = offering.status === "ACTIVE";
              const accent = getAccentColor(theme, offeringCategory?.name ?? offering.categoryName ?? String(offering.categoryId));
              return (
              <Card
                key={offering.id}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: alpha(accent, 0.16),
                  filter: isActive ? "none" : "grayscale(0.6)",
                  opacity: isActive ? 1 : 0.85,
                  transition: "transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: `0 24px 44px -16px ${alpha(accent, 0.5)}`,
                    "& .offering-icon-badge": { transform: "scale(1.08) rotate(-4deg)" },
                  },
                }}
              >
                {/* Gradient identity band - per-category accent, always a live theme color. */}
                <Box
                  sx={{
                    position: "relative",
                    px: 2.5,
                    py: 2.25,
                    overflow: "hidden",
                    backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${alpha(accent, 0.72)} 100%)`,
                  }}
                >
                  <Box aria-hidden sx={{ position: "absolute", top: -34, right: -24, width: 130, height: 130, borderRadius: "50%", bgcolor: alpha("#ffffff", 0.14), pointerEvents: "none" }} />
                  <Box aria-hidden sx={{ position: "absolute", bottom: -44, left: 24, width: 96, height: 96, borderRadius: "50%", bgcolor: alpha("#ffffff", 0.08), pointerEvents: "none" }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: "relative" }}>
                    <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
                      <Box
                        className="offering-icon-badge"
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha("#ffffff", 0.22),
                          backdropFilter: "blur(6px)",
                          border: "1px solid",
                          borderColor: alpha("#ffffff", 0.35),
                          color: "#fff",
                          flexShrink: 0,
                          transition: "transform 220ms ease",
                        }}
                      >
                        <OfferingIcon size={21} />
                      </Box>
                      {offering.categoryName && (
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ color: alpha("#ffffff", 0.9), textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 800 }}
                        >
                          {offering.categoryName}
                        </Typography>
                      )}
                    </Stack>
                    <Chip
                      size="small"
                      label={isActive ? "Available" : formatEnumLabel(offering.status)}
                      sx={{
                        bgcolor: alpha("#ffffff", 0.22),
                        color: "#fff",
                        fontWeight: 700,
                        border: "1px solid",
                        borderColor: alpha("#ffffff", 0.35),
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                </Box>

                <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <Typography variant="h6" fontWeight={800} sx={{ wordBreak: "break-word" }}>
                    {offering.name}
                  </Typography>
                  {offering.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      mt={1}
                      sx={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      {offering.description}
                    </Typography>
                  )}

                  <Box flexGrow={1} />

                  {(offering.basePrice != null || offering.durationMinutes != null) && (
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} mt={2.5}>
                      {offering.basePrice != null && (
                        <Box sx={{ borderLeft: "3px solid", borderColor: alpha(accent, 0.45), pl: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, display: "block" }}>
                            Starting at
                          </Typography>
                          <Stack direction="row" alignItems="baseline" spacing={0.25}>
                            <FiDollarSign size={15} color={accent} />
                            <Typography variant="h5" fontWeight={800} sx={{ color: accent }}>
                              {offering.basePrice}
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                      {offering.durationMinutes != null && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<FiClock size={13} />}
                          label={`${offering.durationMinutes} min`}
                          sx={{ flexShrink: 0 }}
                        />
                      )}
                    </Stack>
                  )}
                </CardContent>
                {allowMutations ? (
                  <>
                    <Divider />
                    <CardActions sx={{ justifyContent: "flex-end" }}>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => navigate(`/admin/services/${offering.id}`)}
                          aria-label="Edit"
                          sx={{ color: accent, "&:hover": { bgcolor: alpha(accent, 0.12) } }}
                        >
                          <FiEdit3 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => setIdPendingDelete(offering.id)} aria-label="Delete">
                          <FiTrash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </>
                ) : (
                  offering.status === "ACTIVE" && (
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        endIcon={<FiArrowRight size={16} />}
                        onClick={() => navigate(`/family/bookings/new?serviceOfferingId=${offering.id}`)}
                        sx={{
                          backgroundImage: `linear-gradient(135deg, ${accent}, ${alpha(accent, 0.82)})`,
                          boxShadow: `0 10px 22px -8px ${alpha(accent, 0.65)}`,
                          "&:hover": {
                            backgroundImage: `linear-gradient(135deg, ${accent}, ${accent})`,
                            boxShadow: `0 12px 26px -6px ${alpha(accent, 0.75)}`,
                          },
                        }}
                      >
                        Book
                      </Button>
                    </CardActions>
                  )
                )}
              </Card>
              );
            })}
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
