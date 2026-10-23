import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Paper,
  Rating,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FiStar } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import { useReviewService } from "../../../services/useReviewService";
import type { ReviewResponse } from "../../../services/useReviewService";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { formatDate, getErrorMessage } from "../../../utils/helper";

const PAGE_SIZE = 10;

const CategoryBreakdown: React.FC<{ review: ReviewResponse }> = ({ review }) => (
  <Stack spacing={0.25}>
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="caption" sx={{ width: 96 }} color="text.secondary">
        Punctuality
      </Typography>
      <Rating value={review.punctualityRating ?? review.overallRating} size="small" readOnly />
    </Stack>
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="caption" sx={{ width: 96 }} color="text.secondary">
        Care Quality
      </Typography>
      <Rating value={review.careQualityRating ?? review.overallRating} size="small" readOnly />
    </Stack>
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="caption" sx={{ width: 96 }} color="text.secondary">
        Communication
      </Typography>
      <Rating value={review.communicationRating ?? review.overallRating} size="small" readOnly />
    </Stack>
  </Stack>
);

/**
 * Reviews a caretaker has received, with one reply per review. Deliberately diverges from
 * ~/ElderSphere/eldersphere-fe's own Caretaker/Reviews page, which offers "Edit Reply" and
 * lets the dialog reopen against an already-replied review (the backend's upsertReply is a
 * real upsert, so that would technically still work) — Prompt 91 explicitly wants the
 * one-reply-per-review limit enforced in the UI too, not just relied on at the backend, so
 * once review.reply is set the row shows it read-only with no way to reopen the dialog.
 */
const CaretakerReviewsPage: React.FC = () => {
  const reviewService = useReviewService();
  const caretakerService = useCaretakerService();

  // undefined = still resolving the caretaker's own profile (keep showing the loading
  // skeleton); null = resolved with no profile at all (a CARETAKER who hasn't completed
  // one yet - show the empty state, not a permanent skeleton). Collapsing these two into
  // one null-only state would flash "No reviews yet" for every caller the instant before
  // their real profile id resolves.
  const [caretakerProfileId, setCaretakerProfileId] = useState<number | null | undefined>(undefined);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [replyTarget, setReplyTarget] = useState<ReviewResponse | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    caretakerService
      .getMyProfile()
      .then((p) => setCaretakerProfileId(p.id))
      .catch(() => setCaretakerProfileId(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPage = useCallback(async () => {
    // Still waiting on the profile lookup itself - stay on the loading skeleton rather
    // than fetching (there's no id to fetch with yet).
    if (caretakerProfileId === undefined) return;
    // Resolved with no profile at all - an empty result rather than a stuck-forever
    // skeleton, same "no profile, empty result" fallback ElderSphere's own
    // CrudModule.fetchPage uses for this page.
    if (caretakerProfileId === null) {
      setReviews([]);
      setTotalPages(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await reviewService.getByCaretaker(caretakerProfileId, page, PAGE_SIZE);
      setReviews(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load your reviews"));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretakerProfileId, page]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const openReplyDialog = (review: ReviewResponse) => {
    if (review.reply) return; // Already replied — never reopen the dialog for it.
    setReplyTarget(review);
    setReplyContent("");
    setReplyError(null);
  };

  const handleSubmitReply = async () => {
    if (replying || !replyTarget || !replyContent.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      await reviewService.reply(replyTarget.id, replyContent.trim());
      setSuccessMessage("Reply posted");
      setReplyTarget(null);
      fetchPage();
    } catch (err) {
      setReplyError(getErrorMessage(err, "Could not post your reply"));
    } finally {
      setReplying(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiStar size={22} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Reviews Received
          </Typography>
          <Typography variant="body2" color="text.secondary">
            See what families are saying, and reply once to each review.
          </Typography>
        </Box>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : reviews.length === 0 ? (
        <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "text.secondary" }}>
          <FiStar size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={700}>
            No reviews yet
          </Typography>
          <Typography variant="body2">Reviews will show up here once families complete a booking with you and leave one.</Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Family Member</TableCell>
                  <TableCell>Overall</TableCell>
                  <TableCell>Category Breakdown</TableCell>
                  <TableCell>Comment</TableCell>
                  <TableCell>Photo</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Your Reply</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{review.reviewerName ?? "—"}</TableCell>
                    <TableCell>
                      <Rating value={review.overallRating} size="small" readOnly />
                    </TableCell>
                    <TableCell>
                      <CategoryBreakdown review={review} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>{review.comment || "—"}</TableCell>
                    <TableCell>
                      {review.photoUrl ? (
                        <Box
                          component="img"
                          src={review.photoUrl}
                          alt="Review attachment"
                          sx={{ width: 44, height: 44, borderRadius: "8px", objectFit: "cover" }}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(review.createdAt)}</TableCell>
                    <TableCell align="right">
                      {review.reply ? (
                        <Typography variant="body2" sx={{ maxWidth: 220, display: "inline-block", textAlign: "left" }}>
                          {review.reply.content}
                        </Typography>
                      ) : (
                        <Button variant="text" size="small" onClick={() => openReplyDialog(review)}>
                          Reply
                        </Button>
                      )}
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

      <Dialog open={Boolean(replyTarget)} onClose={() => !replying && setReplyTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reply to review</DialogTitle>
        <DialogContent>
          {replyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {replyError}
            </Alert>
          )}
          {replyTarget && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              Replying to {replyTarget.reviewerName ?? "this family member"}'s review: "{replyTarget.comment || "(no comment)"}"
            </Typography>
          )}
          <TextField
            label="Your reply"
            multiline
            minRows={3}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Thank the family and address anything they raised..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyTarget(null)} disabled={replying}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmitReply} loading={replying} disabled={!replyContent.trim()}>
            Post Reply
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default CaretakerReviewsPage;
