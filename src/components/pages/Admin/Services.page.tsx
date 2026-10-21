import React from "react";
import { Alert } from "@mui/material";
import ServiceOfferingListingTemplate from "../../templates/ServiceOffering/ServiceOfferingListing.template";
import { useServiceOfferingListing } from "../../../hooks/useServiceOfferingListing";

// Mounted under /admin/services in AdminRoutes.tsx (open to both ADMIN and SUPER_ADMIN,
// matching ServiceOfferingController's isAuthenticated()-only list GET). Unlike
// BrowseServices.page.tsx, no fixed status filter is passed - an admin manages both ACTIVE
// and INACTIVE offerings here, filtering only by category.
const ServicesPage: React.FC = () => {
  const { serviceOfferings, page, setPage, totalPages, categoryId, setCategoryId, isLoading, loadError, refetch } =
    useServiceOfferingListing();

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <ServiceOfferingListingTemplate
        serviceOfferings={serviceOfferings}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        onRefresh={refetch}
        isLoading={isLoading}
      />
    </>
  );
};

export default ServicesPage;
