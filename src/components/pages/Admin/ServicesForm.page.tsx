import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress } from "@mui/material";
import ServiceOfferingForm from "../../templates/ServiceOffering/ServiceOfferingForm.template";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import type { ServiceOfferingPayload, ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import { getErrorMessage } from "../../../utils/helper";

const SERVICES_LISTING_PATH = "/admin/services";

// One Form page handling both create (/admin/services/new, no :id) and edit
// (/admin/services/:id) - matches ServiceCategoriesForm.page.tsx's own single-file split.
const ServicesFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const offeringId = id ? Number(id) : null;
  const isEdit = offeringId != null;
  const serviceOfferingService = useServiceOfferingService();

  const [serviceOffering, setServiceOffering] = useState<ServiceOfferingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (offeringId == null) return;
    let cancelled = false;
    serviceOfferingService
      .getServiceOfferingById(offeringId)
      .then((result) => {
        if (!cancelled) setServiceOffering(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load this service offering."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId]);

  const handleSubmit = async (values: ServiceOfferingPayload) => {
    setSubmitError(null);
    try {
      if (isEdit && offeringId != null) {
        await serviceOfferingService.updateServiceOffering(offeringId, values);
      } else {
        await serviceOfferingService.createServiceOffering(values);
      }
      navigate(SERVICES_LISTING_PATH);
    } catch (err) {
      setSubmitError(getErrorMessage(err, `Could not ${isEdit ? "update" : "create"} this service offering.`));
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
      <ServiceOfferingForm mode={isEdit ? "edit" : "create"} serviceOffering={serviceOffering} onSubmit={handleSubmit} />
    </Box>
  );
};

export default ServicesFormPage;
