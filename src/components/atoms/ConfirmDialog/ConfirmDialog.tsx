import React from "react";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import Button from "../Button/Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Disables both actions and shows a spinner on the confirm button while the action runs. */
  confirming?: boolean;
  confirmColor?: "error" | "primary" | "warning";
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A real MUI confirmation dialog, consistent with the Cancel/destructive-action dialogs
 * already hand-built per page (ContactUsPage, Admin/Users, ServiceOfferingListingTemplate)
 * - replaces the handful of pages that instead reached for the browser's own
 * window.confirm(), which can't be styled, blocks the JS thread, and is untestable the
 * same way every other dialog in this app is (fireEvent/userEvent against real DOM nodes
 * instead of mocking a global).
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  confirmColor = "error",
  onConfirm,
  onClose,
}) => (
  <Dialog open={open} onClose={() => !confirming && onClose()}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText component="div">{description}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={confirming}>
        {cancelLabel}
      </Button>
      <Button color={confirmColor} variant="contained" onClick={onConfirm} loading={confirming}>
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
