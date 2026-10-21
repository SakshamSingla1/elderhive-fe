import React from "react";
import { Alert } from "@mui/material";
import ServiceCategoryListingTemplate from "../../templates/ServiceCategory/ServiceCategoryListing.template";
import { useServiceCategoryListing } from "../../../hooks/useServiceCategoryListing";

// Mounted under /admin/service-categories in AdminRoutes.tsx (open to both ADMIN and
// SUPER_ADMIN, matching ServiceCategoryController's isAuthenticated()-only list GET);
// Add/Edit/Delete just surface a 403 via the usual error Snackbar for an admin lacking
// SERVICE_MANAGE, same as ServiceCategoryListingTemplate's own documented gating.
const ServiceCategoriesPage: React.FC = () => {
  const { serviceCategories, page, setPage, totalPages, isLoading, loadError, refetch } = useServiceCategoryListing();

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <ServiceCategoryListingTemplate
        serviceCategories={serviceCategories}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRefresh={refetch}
        isLoading={isLoading}
      />
    </>
  );
};

export default ServiceCategoriesPage;
