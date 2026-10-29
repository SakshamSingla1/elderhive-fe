import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FiMail, FiTrash2 } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import Select from "../../atoms/Select/Select";
import TextField from "../../atoms/TextField/TextField";
import { useContactUsService } from "../../../services/useContactUsService";
import type { ContactUsResponse } from "../../../services/useContactUsService";
import { ContactUsStatusEnum } from "../../../utils/enums";
import { formatDateTime, getErrorMessage, useDebounce, formatEnumLabel} from "../../../utils/helper";

const PAGE_SIZE = 20;
const ALL = "ALL";
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_FILTER_OPTIONS = [{ value: ALL, label: "All statuses" }, ...Object.values(ContactUsStatusEnum).map((s) => ({ value: s, label: formatEnumLabel(s) }))];
const STATUS_UPDATE_OPTIONS = Object.values(ContactUsStatusEnum).map((s) => ({ value: s, label: formatEnumLabel(s) }));

const STATUS_COLOR: Record<ContactUsStatusEnum, "warning" | "info" | "default"> = {
  NEW: "warning",
  RESPONDED: "info",
  CLOSED: "default",
};

/** Admin > Contact Us submissions (Prompt 99) - a read/triage queue for the public
 *  landing page's contact form. CONTACT_US_MANAGE-gated server-side. */
const ContactUsPage: React.FC = () => {
  const contactUsService = useContactUsService();

  const [submissions, setSubmissions] = useState<ContactUsResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactUsResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const debouncedSetSearch = useDebounce((value: string) => {
    setSearch(value);
    setPage(0);
  }, SEARCH_DEBOUNCE_MS);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await contactUsService.search({
        page,
        size: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter === ALL ? undefined : (statusFilter as ContactUsStatusEnum),
      });
      setSubmissions(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load contact requests"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleStatusChange = async (row: ContactUsResponse, status: ContactUsStatusEnum) => {
    setUpdatingId(row.id);
    try {
      const updated = await contactUsService.updateStatus(row.id, status);
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not update status"));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await contactUsService.remove(deleteTarget.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not delete this submission"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiMail size={22} color="#2F6F5E" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Contact Us Submissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Messages submitted through the public landing page's contact form.
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField
          label="Search"
          placeholder="Search by name, email, or message"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
          sx={{ maxWidth: 360 }}
        />
        <Select
          label="Status"
          sx={{ minWidth: 200 }}
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
        />
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : submissions.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiMail size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No contact submissions found
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.phone || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>{s.message}</TableCell>
                    <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip size="small" label={formatEnumLabel(s.status)} color={STATUS_COLOR[s.status]} />
                        <Select
                          label="Change status"
                          value={s.status}
                          options={STATUS_UPDATE_OPTIONS}
                          disabled={updatingId === s.id}
                          onChange={(value) => handleStatusChange(s, value as ContactUsStatusEnum)}
                          sx={{ minWidth: 160 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" color="error" startIcon={<FiTrash2 />} onClick={() => setDeleteTarget(s)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {totalPages > 1 && (
            <Stack alignItems="center" mt={3}>
              <Pagination count={totalPages} page={page + 1} onChange={(_, newPage) => setPage(newPage - 1)} color="primary" />
            </Stack>
          )}
        </>
      )}

      <Dialog open={deleteTarget != null} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this submission?</DialogTitle>
        <DialogContent>
          <DialogContentText>This contact request from {deleteTarget?.name} will be permanently removed.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactUsPage;
