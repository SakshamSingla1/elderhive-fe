import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress } from "@mui/material";
import ServiceCategoryForm from "../../templates/ServiceCategory/ServiceCategoryForm.template";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryPayload, ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import { getErrorMessage } from "../../../utils/helper";

const SERVICE_CATEGORIES_LISTING_PATH = "/admin/service-categories";

// One Form page handling both create (/admin/service-categories/new, no :id) and edit
// (/admin/service-categories/:id) - matches the single ServicesForm.page.tsx naming the
// prompt asked for, rather than ColorTheme's separate Add/Edit page split.
const ServiceCategoriesFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const categoryId = id ? Number(id) : null;
  const isEdit = categoryId != null;
  const serviceCategoryService = useServiceCategoryService();

  const [serviceCategory, setServiceCategory] = useState<ServiceCategoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryId == null) return;
    let cancelled = false;
    serviceCategoryService
      .getServiceCategoryById(categoryId)
      .then((result) => {
        if (!cancelled) setServiceCategory(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load this service category."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const handleSubmit = async (values: ServiceCategoryPayload) => {
    setSubmitError(null);
    try {
      if (isEdit && categoryId != null) {
        await serviceCategoryService.updateServiceCategory(categoryId, values);
      } else {
        await serviceCategoryService.createServiceCategory(values);
      }
      navigate(SERVICE_CATEGORIES_LISTING_PATH);
    } catch (err) {
      setSubmitError(getErrorMessage(err, `Could not ${isEdit ? "update" : "create"} this service category.`));
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  return (
    <Box>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}
      <ServiceCategoryForm mode={isEdit ? "edit" : "create"} serviceCategory={serviceCategory} onSubmit={handleSubmit} />
    </Box>
  );
};

export default ServiceCategoriesFormPage;
