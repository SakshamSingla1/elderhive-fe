import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
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
import { FiFileText } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import Select from "../../atoms/Select/Select";
import { useAuditLogService } from "../../../services/useAuditLogService";
import type { AuditLogResponse } from "../../../services/useAuditLogService";
import { ActionType, EntityTypeEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";

const PAGE_SIZE = 20;
const ALL = "ALL";

const ENTITY_TYPE_OPTIONS = [{ value: ALL, label: "All entity types" }, ...Object.values(EntityTypeEnum).map((t) => ({ value: t, label: t }))];
const ACTION_TYPE_OPTIONS = [{ value: ALL, label: "All actions" }, ...Object.values(ActionType).map((a) => ({ value: a, label: a }))];

// A date-only <input type="date"> value (yyyy-mm-dd, or "") converted to the inclusive
// start/end-of-day ISO instant AuditLogController's `from`/`to` query params expect.
function toFromInstant(dateOnly: string): string | undefined {
  return dateOnly ? new Date(`${dateOnly}T00:00:00`).toISOString() : undefined;
}
function toToInstant(dateOnly: string): string | undefined {
  return dateOnly ? new Date(`${dateOnly}T23:59:59.999`).toISOString() : undefined;
}

/**
 * Admin > Audit Log viewer (Prompt 96) - read-only, paginated, filterable by
 * entityType/actionType/date range, reading Phase 1's AuditLog entries via the
 * AuditLogController added alongside this page. Super-Admin-only at the route level
 * (AdminRoutes.tsx), same reasoning as RolesPermissions.page.tsx.
 */
const AuditLogPage: React.FC = () => {
  const auditLogService = useAuditLogService();

  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>(ALL);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>(ALL);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await auditLogService.search({
        page,
        size: PAGE_SIZE,
        entityType: entityTypeFilter === ALL ? undefined : (entityTypeFilter as EntityTypeEnum),
        actionType: actionTypeFilter === ALL ? undefined : (actionTypeFilter as ActionType),
        from: toFromInstant(fromDate),
        to: toToInstant(toDate),
      });
      setLogs(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load the audit log"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entityTypeFilter, actionTypeFilter, fromDate, toDate]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiFileText size={22} color="#2F6F5E" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Audit Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A read-only trail of every compliance-sensitive action taken on the platform.
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        <Select
          label="Entity type"
          sx={{ minWidth: 200 }}
          value={entityTypeFilter}
          options={ENTITY_TYPE_OPTIONS}
          onChange={(value) => {
            setEntityTypeFilter(value);
            setPage(0);
          }}
        />
        <Select
          label="Action"
          sx={{ minWidth: 200 }}
          value={actionTypeFilter}
          options={ACTION_TYPE_OPTIONS}
          onChange={(value) => {
            setActionTypeFilter(value);
            setPage(0);
          }}
        />
        <TextField
          label="From"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 200 }}
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(0);
          }}
        />
        <TextField
          label="To"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 200 }}
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
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
      ) : logs.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiFileText size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No audit log entries found
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`${log.entityType} #${log.entityId}`} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={log.actionType} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{log.actorEmail ?? (log.actorUserId ? `User #${log.actorUserId}` : "—")}</TableCell>
                    <TableCell sx={{ maxWidth: 360, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {log.data ?? "—"}
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
    </Box>
  );
};

export default AuditLogPage;
