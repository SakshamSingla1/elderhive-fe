import React, { useCallback, useEffect, useState } from "react";
import { Alert, Card, CardContent, Chip, List, ListItem, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import { FiCheckCircle, FiFileText } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import { useCaretakerService, type CaretakerVerificationDocumentDTO } from "../../../services/useCaretakerService";
import { useFileService } from "../../../services/useFileService";
import { DocumentReviewStatusEnum } from "../../../utils/enums";
import { formatDateTime, getErrorMessage } from "../../../utils/helper";

export interface CaretakerVerificationDocumentsPanelProps {
  caretakerId: number;
}

const REVIEW_STATUS_COLOR: Record<DocumentReviewStatusEnum, "default" | "success" | "error"> = {
  [DocumentReviewStatusEnum.PENDING]: "default",
  [DocumentReviewStatusEnum.APPROVED]: "success",
  [DocumentReviewStatusEnum.REJECTED]: "error",
};

/**
 * Unlike ElderSphere's own read-only reference panel (approval there happens by setting
 * CaretakerProfile.verificationStatus directly, via a dropdown on the Form page), ElderHive
 * has no such endpoint at all - CaretakerVerificationDocument carries its OWN per-document
 * reviewStatus (Prompt 65), reviewed one at a time via the CARETAKER_VERIFY-gated
 * PUT /api/v1/caretaker-verification-documents/:id/review. So THIS panel is where the
 * actual approve/reject action lives, not the Form page beside it.
 */
const CaretakerVerificationDocumentsPanel: React.FC<CaretakerVerificationDocumentsPanelProps> = ({ caretakerId }) => {
  const caretakerService = useCaretakerService();
  const fileService = useFileService();

  const [documents, setDocuments] = useState<CaretakerVerificationDocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    caretakerService
      .listVerificationDocuments(caretakerId)
      .then(setDocuments)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load verification documents")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretakerId]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (document: CaretakerVerificationDocumentDTO, status: typeof DocumentReviewStatusEnum.APPROVED | typeof DocumentReviewStatusEnum.REJECTED) => {
    setReviewingId(document.id);
    setActionError(null);
    try {
      const updated = await caretakerService.reviewVerificationDocument(document.id, status);
      setDocuments((prev) => prev.map((d) => (d.id === document.id ? updated : d)));
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not record this review - you may not have the CARETAKER_VERIFY permission"));
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <FiFileText size={18} />
          <Typography variant="h6" fontWeight={700}>
            Submitted Verification Documents
          </Typography>
        </Stack>

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={52} />
            ))}
          </Stack>
        ) : documents.length === 0 ? (
          <Typography color="text.secondary">This caretaker hasn't submitted any verification documents yet.</Typography>
        ) : (
          <List dense disablePadding>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                divider
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" variant="text" onClick={() => window.open(fileService.getDownloadUrl(doc.fileAssetId), "_blank")}>
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<FiCheckCircle size={14} />}
                      disabled={reviewingId === doc.id || doc.reviewStatus === DocumentReviewStatusEnum.APPROVED}
                      onClick={() => review(doc, DocumentReviewStatusEnum.APPROVED)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={reviewingId === doc.id || doc.reviewStatus === DocumentReviewStatusEnum.REJECTED}
                      onClick={() => review(doc, DocumentReviewStatusEnum.REJECTED)}
                    >
                      Reject
                    </Button>
                    <Chip label={doc.reviewStatus} size="small" color={REVIEW_STATUS_COLOR[doc.reviewStatus]} />
                  </Stack>
                }
              >
                <ListItemText
                  primary={doc.originalFilename ?? "Document"}
                  secondary={`${doc.docType ?? "General"} · Uploaded ${formatDateTime(doc.createdAt)}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default CaretakerVerificationDocumentsPanel;
