import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Divider, Rating, Skeleton, Snackbar, Stack, Typography } from "@mui/material";
import { FiStar } from "react-icons/fi";
import PageHeader from "../../molecules/PageHeader/PageHeader";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import { useReviewService } from "../../../services/useReviewService";
import type { ReviewResponse } from "../../../services/useReviewService";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import { BookingStatusEnum } from "../../../utils/enums";
import { getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const SubRatingRow: React.FC<{ label: string; value: number; onChange?: (value: number) => void }> = ({ label, value, onChange }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Typography variant="body2" color="text.secondary" sx={{ width: 120 }}>
      {label}
    </Typography>
    <Rating value={value} readOnly={!onChange} onChange={(_, v) => onChange?.(v ?? value)} />
  </Stack>
);

/**
 * Reached via BookingDetail.page.tsx's own "Leave a Review"/"View Your Review" link with
 * ?bookingId=, same query-param-driven single-booking shape as
 * ~/ElderSphere/eldersphere-fe's own Family/Reviews page (adapted to ElderHive's plain
 * MUI component library — no RatingInput/PageHeader atoms here). Unlike ElderSphere, this
 * page also fetches the booking's own review-if-any up front and renders it read-only
 * instead of the form when one already exists — the backend already enforces one review
 * per booking (DUPLICATE_REVIEW), but surfacing that as a raw 409 after a full form fill-in
 * would be a bad experience when it's cheap to know in advance.
 */
const FamilyReviewsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reviewService = useReviewService();
  const bookingService = useBookingService();

  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [existingReview, setExistingReview] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [careQualityRating, setCareQualityRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const b = await bookingService.getById(Number(bookingId));
      setBooking(b);
      try {
        setExistingReview(await reviewService.getByBooking(Number(bookingId)));
      } catch {
        // 404 (REVIEW_NOT_FOUND) just means no review exists yet — not a real error.
        setExistingReview(null);
      }
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this booking"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !bookingId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const created = await reviewService.create({
        bookingId: Number(bookingId),
        overallRating,
        comment: comment.trim() || undefined,
        punctualityRating,
        careQualityRating,
        communicationRating,
      });
      setExistingReview(created);
      setSuccessMessage("Thanks for your review!");
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Could not submit your review. It may already exist for this booking."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box maxWidth={560}>
      <PageHeader icon={<FiStar size={20} />} title="Leave a Review" subtitle="Share how the caretaker's visit went." />

      {!bookingId ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">
              Choose a completed booking from{" "}
              <Button variant="text" size="small" onClick={() => navigate("/family/bookings")}>
                My Bookings
              </Button>{" "}
              to leave a review for that caretaker.
            </Typography>
          </CardContent>
        </Card>
      ) : loading ? (
        <Skeleton variant="rounded" height={320} />
      ) : loadError || !booking ? (
        <Alert severity="error">{loadError ?? "Booking not found"}</Alert>
      ) : booking.status !== BookingStatusEnum.COMPLETED ? (
        <Alert severity="info">Only a completed booking can be reviewed. This booking is currently {formatEnumLabel(booking.status)}.</Alert>
      ) : existingReview ? (
        <Card variant="outlined">
          <CardContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              You've already reviewed this booking.
            </Alert>
            <Stack spacing={1.25}>
              <SubRatingRow label="Overall" value={existingReview.overallRating} />
              <SubRatingRow label="Punctuality" value={existingReview.punctualityRating ?? existingReview.overallRating} />
              <SubRatingRow label="Care Quality" value={existingReview.careQualityRating ?? existingReview.overallRating} />
              <SubRatingRow label="Communication" value={existingReview.communicationRating ?? existingReview.overallRating} />
            </Stack>
            {existingReview.comment && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                "{existingReview.comment}"
              </Typography>
            )}
            {existingReview.reply && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Caretaker's reply
                </Typography>
                <Typography variant="body2">{existingReview.reply.content}</Typography>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent>
            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <Typography variant="body2" color="text.secondary">
                Reviewing {booking.caretakerName ?? "your caretaker"} for the {booking.serviceName ?? "booked"} visit.
              </Typography>

              <SubRatingRow label="Overall Rating" value={overallRating} onChange={setOverallRating} />
              <SubRatingRow label="Punctuality" value={punctualityRating} onChange={setPunctualityRating} />
              <SubRatingRow label="Care Quality" value={careQualityRating} onChange={setCareQualityRating} />
              <SubRatingRow label="Communication" value={communicationRating} onChange={setCommunicationRating} />

              <TextField
                label="Comment (optional)"
                multiline
                minRows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share how the caretaker's visit went..."
              />

              <Button type="submit" variant="contained" size="large" loading={submitting}>
                Submit Review
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar open={Boolean(successMessage)} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} message={successMessage} />
    </Box>
  );
};

export default FamilyReviewsPage;
