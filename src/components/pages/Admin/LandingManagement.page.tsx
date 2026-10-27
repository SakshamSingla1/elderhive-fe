import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { FiGlobe, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import Checkbox from "../../atoms/Checkbox/Checkbox";
import Select from "../../atoms/Select/Select";
import {
  useLandingService,
  type LandingFaqPayload,
  type LandingFaqResponse,
  type LandingFeaturePayload,
  type LandingFeatureResponse,
  type LandingPageConfigResponse,
  type LandingTestimonialPayload,
  type LandingTestimonialResponse,
} from "../../../services/useLandingService";
import { getErrorMessage } from "../../../utils/helper";

const ICON_OPTIONS = [
  { value: "shield", label: "Shield" },
  { value: "message-circle", label: "Message" },
  { value: "calendar", label: "Calendar" },
  { value: "alert-triangle", label: "Alert" },
  { value: "folder", label: "Folder" },
  { value: "star", label: "Star" },
  { value: "bar-chart", label: "Bar Chart" },
  { value: "heart", label: "Heart" },
];

const EMPTY_CONFIG: LandingPageConfigResponse = {
  id: 0,
  heroHeadline: "",
  heroSubheadline: "",
  heroImageUrl: "",
  ctaHeadline: "",
  ctaDescription: "",
  ctaButtonText: "",
};

/** Hero/CTA copy - PUT /landing/config upserts, so this doubles as both "create" (the
 *  very first save) and "edit" (every save after). */
const ConfigTab: React.FC = () => {
  const landingService = useLandingService();
  const [config, setConfig] = useState<LandingPageConfigResponse>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    landingService
      .getPublicPage()
      .then((page) => setConfig(page.config ?? EMPTY_CONFIG))
      .catch(() => setConfig(EMPTY_CONFIG))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await landingService.updateConfig(config);
      setConfig(updated);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the landing page config"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton variant="rounded" height={320} />;

  return (
    <Card variant="outlined" sx={{ maxWidth: 640 }}>
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Saved.
          </Alert>
        )}
        <Stack component="form" spacing={2} onSubmit={handleSave}>
          <TextField
            label="Hero Headline"
            value={config.heroHeadline ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, heroHeadline: e.target.value }))}
          />
          <TextField
            label="Hero Subheadline"
            multiline
            minRows={2}
            value={config.heroSubheadline ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, heroSubheadline: e.target.value }))}
          />
          <TextField
            label="Hero Image URL"
            value={config.heroImageUrl ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, heroImageUrl: e.target.value }))}
          />
          <TextField
            label="CTA Headline"
            value={config.ctaHeadline ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, ctaHeadline: e.target.value }))}
          />
          <TextField
            label="CTA Description"
            multiline
            minRows={2}
            value={config.ctaDescription ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, ctaDescription: e.target.value }))}
          />
          <TextField
            label="CTA Button Text"
            value={config.ctaButtonText ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, ctaButtonText: e.target.value }))}
          />
          <Button type="submit" variant="contained" loading={saving} sx={{ alignSelf: "flex-start" }}>
            Save
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

const EMPTY_FEATURE: LandingFeaturePayload = { title: "", description: "", iconName: "shield", sortOrder: 0, isActive: true };

const FeatureFormDialog: React.FC<{
  open: boolean;
  feature: LandingFeatureResponse | null;
  onClose: () => void;
  onSubmit: (values: LandingFeaturePayload) => Promise<void>;
}> = ({ open, feature, onClose, onSubmit }) => {
  const [values, setValues] = useState<LandingFeaturePayload>(EMPTY_FEATURE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(
      feature
        ? { title: feature.title, description: feature.description ?? "", iconName: feature.iconName ?? "shield", sortOrder: feature.sortOrder ?? 0, isActive: feature.isActive }
        : EMPTY_FEATURE
    );
  }, [open, feature]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this feature"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{feature ? "Edit Feature" : "Create Feature"}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField label="Title" required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
            <TextField
              label="Description"
              multiline
              minRows={2}
              value={values.description ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
            <Select label="Icon" value={values.iconName ?? "shield"} options={ICON_OPTIONS} onChange={(value) => setValues((v) => ({ ...v, iconName: value }))} />
            <TextField
              label="Sort Order"
              type="number"
              value={values.sortOrder ?? 0}
              onChange={(e) => setValues((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
            />
            <Checkbox label="Active" checked={values.isActive} onChange={(checked) => setValues((v) => ({ ...v, isActive: checked }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {feature ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const FeaturesTab: React.FC = () => {
  const landingService = useLandingService();
  const [features, setFeatures] = useState<LandingFeatureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<LandingFeatureResponse | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandingFeatureResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setFeatures(await landingService.getAllFeatures());
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load features"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSubmit = async (values: LandingFeaturePayload) => {
    if (formTarget === "new") {
      const created = await landingService.createFeature(values);
      setFeatures((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } else if (formTarget) {
      const updated = await landingService.updateFeature(formTarget.id, values);
      setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
    setFormTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await landingService.deleteFeature(deleteTarget.id);
      setFeatures((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not delete this feature"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => setFormTarget("new")}>
          New Feature
        </Button>
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {loading ? (
        <Skeleton variant="rounded" height={200} />
      ) : features.length === 0 ? (
        <Typography color="text.secondary">No features yet.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {features.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{f.title}</TableCell>
                  <TableCell>{f.description || "—"}</TableCell>
                  <TableCell>{f.sortOrder ?? "—"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={f.isActive ? "Yes" : "No"} color={f.isActive ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => setFormTarget(f)}>
                        Edit
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<FiTrash2 />} onClick={() => setDeleteTarget(f)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <FeatureFormDialog open={formTarget != null} feature={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} onSubmit={handleSubmit} />

      <Dialog open={deleteTarget != null} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this feature?</DialogTitle>
        <DialogContent>
          <DialogContentText>&ldquo;{deleteTarget?.title}&rdquo; will no longer appear on the public landing page.</DialogContentText>
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

const EMPTY_FAQ: LandingFaqPayload = { question: "", answer: "", sortOrder: 0, isActive: true };

const FaqFormDialog: React.FC<{
  open: boolean;
  faq: LandingFaqResponse | null;
  onClose: () => void;
  onSubmit: (values: LandingFaqPayload) => Promise<void>;
}> = ({ open, faq, onClose, onSubmit }) => {
  const [values, setValues] = useState<LandingFaqPayload>(EMPTY_FAQ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(faq ? { question: faq.question, answer: faq.answer, sortOrder: faq.sortOrder ?? 0, isActive: faq.isActive } : EMPTY_FAQ);
  }, [open, faq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this FAQ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{faq ? "Edit FAQ" : "Create FAQ"}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField label="Question" required value={values.question} onChange={(e) => setValues((v) => ({ ...v, question: e.target.value }))} />
            <TextField
              label="Answer"
              required
              multiline
              minRows={3}
              value={values.answer}
              onChange={(e) => setValues((v) => ({ ...v, answer: e.target.value }))}
            />
            <TextField
              label="Sort Order"
              type="number"
              value={values.sortOrder ?? 0}
              onChange={(e) => setValues((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
            />
            <Checkbox label="Active" checked={values.isActive} onChange={(checked) => setValues((v) => ({ ...v, isActive: checked }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {faq ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const FaqsTab: React.FC = () => {
  const landingService = useLandingService();
  const [faqs, setFaqs] = useState<LandingFaqResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<LandingFaqResponse | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandingFaqResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setFaqs(await landingService.getAllFaqs());
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load FAQs"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSubmit = async (values: LandingFaqPayload) => {
    if (formTarget === "new") {
      const created = await landingService.createFaq(values);
      setFaqs((prev) => [...prev, created]);
    } else if (formTarget) {
      const updated = await landingService.updateFaq(formTarget.id, values);
      setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
    setFormTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await landingService.deleteFaq(deleteTarget.id);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not delete this FAQ"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => setFormTarget("new")}>
          New FAQ
        </Button>
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {loading ? (
        <Skeleton variant="rounded" height={200} />
      ) : faqs.length === 0 ? (
        <Typography color="text.secondary">No FAQs yet.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faqs.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{f.question}</TableCell>
                  <TableCell>{f.sortOrder ?? "—"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={f.isActive ? "Yes" : "No"} color={f.isActive ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => setFormTarget(f)}>
                        Edit
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<FiTrash2 />} onClick={() => setDeleteTarget(f)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <FaqFormDialog open={formTarget != null} faq={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} onSubmit={handleSubmit} />

      <Dialog open={deleteTarget != null} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this FAQ?</DialogTitle>
        <DialogContent>
          <DialogContentText>&ldquo;{deleteTarget?.question}&rdquo; will no longer appear on the public landing page.</DialogContentText>
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

const EMPTY_TESTIMONIAL: LandingTestimonialPayload = { authorName: "", authorRole: "", content: "", avatarUrl: "", rating: 5, sortOrder: 0, isActive: true };

const TestimonialFormDialog: React.FC<{
  open: boolean;
  testimonial: LandingTestimonialResponse | null;
  onClose: () => void;
  onSubmit: (values: LandingTestimonialPayload) => Promise<void>;
}> = ({ open, testimonial, onClose, onSubmit }) => {
  const [values, setValues] = useState<LandingTestimonialPayload>(EMPTY_TESTIMONIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(
      testimonial
        ? {
            authorName: testimonial.authorName,
            authorRole: testimonial.authorRole ?? "",
            content: testimonial.content,
            avatarUrl: testimonial.avatarUrl ?? "",
            rating: testimonial.rating ?? 5,
            sortOrder: testimonial.sortOrder ?? 0,
            isActive: testimonial.isActive,
          }
        : EMPTY_TESTIMONIAL
    );
  }, [open, testimonial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this testimonial"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{testimonial ? "Edit Testimonial" : "Create Testimonial"}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField label="Author Name" required value={values.authorName} onChange={(e) => setValues((v) => ({ ...v, authorName: e.target.value }))} />
            <TextField label="Author Role" value={values.authorRole ?? ""} onChange={(e) => setValues((v) => ({ ...v, authorRole: e.target.value }))} />
            <TextField
              label="Content"
              required
              multiline
              minRows={3}
              value={values.content}
              onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            />
            <TextField
              label="Rating (1-5)"
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 5 } }}
              value={values.rating ?? 5}
              onChange={(e) => setValues((v) => ({ ...v, rating: Number(e.target.value) }))}
            />
            <TextField
              label="Sort Order"
              type="number"
              value={values.sortOrder ?? 0}
              onChange={(e) => setValues((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
            />
            <Checkbox label="Active" checked={values.isActive} onChange={(checked) => setValues((v) => ({ ...v, isActive: checked }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {testimonial ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const TestimonialsTab: React.FC = () => {
  const landingService = useLandingService();
  const [testimonials, setTestimonials] = useState<LandingTestimonialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<LandingTestimonialResponse | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandingTestimonialResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setTestimonials(await landingService.getAllTestimonials());
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load testimonials"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSubmit = async (values: LandingTestimonialPayload) => {
    if (formTarget === "new") {
      const created = await landingService.createTestimonial(values);
      setTestimonials((prev) => [...prev, created]);
    } else if (formTarget) {
      const updated = await landingService.updateTestimonial(formTarget.id, values);
      setTestimonials((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
    setFormTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await landingService.deleteTestimonial(deleteTarget.id);
      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not delete this testimonial"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => setFormTarget("new")}>
          New Testimonial
        </Button>
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {loading ? (
        <Skeleton variant="rounded" height={200} />
      ) : testimonials.length === 0 ? (
        <Typography color="text.secondary">No testimonials yet.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Author</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {testimonials.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{t.authorName}</TableCell>
                  <TableCell>{t.authorRole || "—"}</TableCell>
                  <TableCell>{t.rating ?? "—"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={t.isActive ? "Yes" : "No"} color={t.isActive ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => setFormTarget(t)}>
                        Edit
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<FiTrash2 />} onClick={() => setDeleteTarget(t)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <TestimonialFormDialog open={formTarget != null} testimonial={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} onSubmit={handleSubmit} />

      <Dialog open={deleteTarget != null} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this testimonial?</DialogTitle>
        <DialogContent>
          <DialogContentText>&ldquo;{deleteTarget?.authorName}&rdquo;'s testimonial will no longer appear on the public landing page.</DialogContentText>
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

/**
 * Admin > Landing Page Management (Prompt 99) - a CMS-lite for the public marketing
 * homepage. LANDING_MANAGE-gated server-side on every write; this page itself is
 * Super-Admin-only at the route level (ROLE_MANAGE-style single-permission gate, same
 * reasoning as RolesPermissions/AuditLog - deliberately not split across ADMIN too, since
 * marketing copy changes are a Super-Admin-only concern in practice here).
 */
const LandingManagementPage: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiGlobe size={22} color="#2F6F5E" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Landing Page Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Edit the public marketing homepage's hero copy, features, FAQs, and testimonials.
          </Typography>
        </Box>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Hero & CTA" />
        <Tab label="Features" />
        <Tab label="FAQs" />
        <Tab label="Testimonials" />
      </Tabs>
      {tab === 0 && <ConfigTab />}
      {tab === 1 && <FeaturesTab />}
      {tab === 2 && <FaqsTab />}
      {tab === 3 && <TestimonialsTab />}
    </Box>
  );
};

export default LandingManagementPage;
