import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Rating,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiFolder,
  FiHeart,
  FiMail,
  FiMessageCircle,
  FiPhone,
  FiShield,
  FiStar,
} from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import { useLandingService } from "../../../services/useLandingService";
import type { LandingPageResponse } from "../../../services/useLandingService";
import { useContactUsService } from "../../../services/useContactUsService";
import { getErrorMessage } from "../../../utils/helper";

const BRAND_COLOR = "#2F6F5E";

// A react-icons lookup for a CMS-entered `iconName` string - an admin picks from this same
// small vocabulary when authoring a feature (see LandingManagement.page.tsx's FeatureForm).
// Falls back to a generic icon for anything else, so an unrecognized/blank name never
// breaks the card's layout.
const FEATURE_ICONS: Record<string, React.ReactNode> = {
  shield: <FiShield size={28} />,
  "message-circle": <FiMessageCircle size={28} />,
  calendar: <FiCalendar size={28} />,
  "alert-triangle": <FiAlertTriangle size={28} />,
  folder: <FiFolder size={28} />,
  star: <FiStar size={28} />,
  "bar-chart": <FiBarChart2 size={28} />,
  heart: <FiHeart size={28} />,
};

// Shown only until an admin saves real content (LandingPageServiceImpl#getPublicPage
// returns config: null / empty lists for a brand-new environment) - keeps the page from
// ever looking broken/empty for a visitor, while always preferring real CMS content the
// moment it exists.
const FALLBACK_FEATURES = [
  { id: -1, title: "Book Trusted Care", description: "Find and book verified caretakers for temple visits, hospital trips, groceries, and more.", iconName: "calendar", isActive: true },
  { id: -2, title: "Emergency SOS", description: "One tap alerts nearby caretakers and every linked family member - not just whoever set up the profile.", iconName: "alert-triangle", isActive: true },
  { id: -3, title: "Stay Connected", description: "Message caretakers directly and see real-time status on every booking.", iconName: "message-circle", isActive: true },
  { id: -4, title: "Family Oversight", description: "Every family member linked to an elder profile can book, monitor, and respond together.", iconName: "shield", isActive: true },
];

const FALLBACK_TESTIMONIALS = [
  { id: -1, authorName: "Amit Verma", authorRole: "Family member", content: "ElderHive helped us find a wonderful caretaker for my mother within a day.", avatarUrl: null, rating: 5, isActive: true },
  { id: -2, authorName: "Priya Nair", authorRole: "Family member", content: "The emergency alert feature is real peace of mind for our whole family.", avatarUrl: null, rating: 5, isActive: true },
];

const FALLBACK_FAQS = [
  { id: -1, question: "How are caretakers verified?", answer: "Every caretaker is reviewed and verified by our team before they can accept bookings.", isActive: true },
  { id: -2, question: "Can I reschedule or cancel a booking?", answer: "Yes - bookings can be rescheduled or cancelled from your dashboard up until the visit begins.", isActive: true },
  { id: -3, question: "Who gets notified during an emergency?", answer: "Every nearby available caretaker and every family member linked to that elder's profile - not just whoever created it.", isActive: true },
];

const isActiveOrFallback = <T extends { isActive: boolean }>(items: T[] | undefined, fallback: T[]): T[] =>
  items && items.length > 0 ? items.filter((i) => i.isActive) : fallback;

const EMPTY_CONTACT_FORM = { name: "", email: "", phone: "", message: "" };

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const landingService = useLandingService();
  const contactUsService = useContactUsService();

  const [page, setPage] = useState<LandingPageResponse | null>(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    landingService
      .getPublicPage()
      .then(setPage)
      .catch(() => setPage(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = page?.config;
  const features = isActiveOrFallback(page?.features, FALLBACK_FEATURES);
  const testimonials = isActiveOrFallback(page?.testimonials, FALLBACK_TESTIMONIALS);
  const faqs = isActiveOrFallback(page?.faqs, FALLBACK_FAQS);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setSubmitting(true);
    try {
      await contactUsService.submit(contactForm);
      setSubmitted(true);
      setContactForm(EMPTY_CONTACT_FORM);
    } catch (err) {
      setContactError(getErrorMessage(err, "Could not submit your message. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Navbar */}
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar component={Container} maxWidth="lg" sx={{ justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FiHeart color={BRAND_COLOR} size={22} />
            <Typography variant="h6" component="span" fontWeight={800}>
              ElderHive
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="text" onClick={() => navigate("/login")}>
              Log In
            </Button>
            <Button variant="contained" onClick={() => navigate("/register")}>
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{ bgcolor: "background.default", py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h2" component="h1" fontWeight={800} gutterBottom sx={{ fontSize: { xs: 32, md: 48 } }}>
            {config?.heroHeadline || "Compassionate Care, Coordinated Together"}
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 4 }}>
            {config?.heroSubheadline ||
              "Book trusted caretakers for your loved ones, stay connected as a family, and get help the moment it's needed."}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button variant="contained" size="large" onClick={() => navigate("/register")}>
              Get Started Free
            </Button>
            <Button variant="outlined" size="large" href="#features">
              See How It Works
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" id="features" sx={{ py: 10 }}>
        <Box textAlign="center" mb={6}>
          <Typography variant="h4" component="h2" fontWeight={800}>
            Everything Families &amp; Caretakers Need
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {features.map((f) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.id}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: `${BRAND_COLOR}1A`,
                      color: BRAND_COLOR,
                      mb: 2,
                    }}
                  >
                    {FEATURE_ICONS[f.iconName ?? ""] ?? <FiShield size={28} />}
                  </Box>
                  <Typography variant="subtitle1" component="h3" fontWeight={700} gutterBottom>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <Box sx={{ bgcolor: "background.default", py: 10 }} id="testimonials">
          <Container maxWidth="lg">
            <Box textAlign="center" mb={6}>
              <Typography variant="h4" component="h2" fontWeight={800}>
                Loved by Families &amp; Caretakers
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {testimonials.map((t) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      {t.rating != null && <Rating value={t.rating} readOnly size="small" sx={{ mb: 1 }} />}
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        &ldquo;{t.content}&rdquo;
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {t.authorName}
                      </Typography>
                      {t.authorRole && (
                        <Typography variant="caption" color="text.secondary">
                          {t.authorRole}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <Container maxWidth="md" id="faq" sx={{ py: 10 }}>
          <Box textAlign="center" mb={6}>
            <Typography variant="h4" component="h2" fontWeight={800}>
              Frequently Asked Questions
            </Typography>
          </Box>
          {faqs.map((faq) => (
            <Accordion key={faq.id}>
              <AccordionSummary expandIcon={<FiChevronDown />}>
                <Typography fontWeight={700}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      )}

      {/* CTA */}
      <Box sx={{ bgcolor: BRAND_COLOR, color: "white", py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h4" component="h2" fontWeight={800} gutterBottom>
            {config?.ctaHeadline || "Give Your Loved Ones the Care They Deserve"}
          </Typography>
          <Typography sx={{ mb: 4, opacity: 0.9 }}>
            {config?.ctaDescription || "Join families who coordinate elder care together with ElderHive."}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/register")}
            sx={{ bgcolor: "white", color: BRAND_COLOR, "&:hover": { bgcolor: "grey.100" } }}
          >
            {config?.ctaButtonText || "Get Started Free"}
          </Button>
        </Container>
      </Box>

      {/* Contact */}
      <Container maxWidth="sm" id="contact" sx={{ py: 10 }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h2" fontWeight={800}>
            Get in Touch
          </Typography>
          <Typography color="text.secondary">Questions about ElderHive? Send us a message.</Typography>
        </Box>
        <Card variant="outlined">
          <CardContent>
            {submitted ? (
              <Alert severity="success">Thanks for reaching out - we'll get back to you soon.</Alert>
            ) : (
              <Box component="form" onSubmit={handleContactSubmit}>
                {contactError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {contactError}
                  </Alert>
                )}
                <Stack spacing={2}>
                  <TextField
                    label="Full Name"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <TextField
                    label="Phone (optional)"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                  <TextField
                    label="Message"
                    required
                    multiline
                    minRows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                  />
                  <Button type="submit" variant="contained" loading={submitting}>
                    Send Message
                  </Button>
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: "grey.900", color: "white", py: 5 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <FiHeart size={18} />
                <Typography variant="subtitle1" fontWeight={800}>
                  ElderHive
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent={{ md: "flex-end" }}>
                <MuiLink href="#features" color="inherit" underline="hover" sx={{ opacity: 0.85 }}>
                  Features
                </MuiLink>
                <MuiLink href="#faq" color="inherit" underline="hover" sx={{ opacity: 0.85 }}>
                  FAQ
                </MuiLink>
                <MuiLink href="#contact" color="inherit" underline="hover" sx={{ opacity: 0.85 }}>
                  Contact
                </MuiLink>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <FiMail size={14} /> <Typography variant="body2">support@elderhive.app</Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <FiPhone size={14} /> <Typography variant="body2">+91 98765 43210</Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.15)" }} />
          <Typography variant="body2" textAlign="center" sx={{ opacity: 0.6 }}>
            © {new Date().getFullYear()} ElderHive. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
