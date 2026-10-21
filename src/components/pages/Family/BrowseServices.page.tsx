import React from "react";
import { Alert } from "@mui/material";
import ServiceOfferingListingTemplate from "../../templates/ServiceOffering/ServiceOfferingListing.template";
import { useServiceOfferingListing } from "../../../hooks/useServiceOfferingListing";
import { ServiceOfferingStatusEnum } from "../../../utils/enums";

// Mounted under /family/services in FamilyRoutes.tsx. Read-only (allowMutations=false)
// reuse of the same ServiceOfferingListingTemplate the admin Services.page.tsx renders
// with full CRUD - matches ColorThemeListingTemplate's own split with its non-admin
// AccountSettings entry point. Always filters to ACTIVE offerings, since a family member
// browsing to eventually book one (Phase 10) has no reason to see an admin-retired
// offering - the admin catalog page itself has no such fixed filter.
const BrowseServicesPage: React.FC = () => {
  const { serviceOfferings, page, setPage, totalPages, categoryId, setCategoryId, isLoading, loadError } =
    useServiceOfferingListing(ServiceOfferingStatusEnum.ACTIVE);

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
        isLoading={isLoading}
        allowMutations={false}
      />
    </>
  );
};

export default BrowseServicesPage;
