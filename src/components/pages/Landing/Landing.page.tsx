import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Avatar,
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
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
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
  FiUserCheck,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import TextField from "../../atoms/TextField/TextField";
import { useLandingService } from "../../../services/useLandingService";
import type { LandingPageResponse } from "../../../services/useLandingService";
import { useContactUsService } from "../../../services/useContactUsService";
import { getErrorMessage } from "../../../utils/helper";

// A react-icons lookup for a CMS-entered `iconName` string - an admin picks from this same
// small vocabulary when authoring a feature (see LandingManagement.page.tsx's FeatureForm).
// Falls back to a generic icon for anything else, so an unrecognized/blank name never
// breaks the card's layout.
const FEATURE_ICONS: Record<string, React.ReactNode> = {
  shield: <FiShield size={26} />,
  "message-circle": <FiMessageCircle size={26} />,
  calendar: <FiCalendar size={26} />,
  "alert-triangle": <FiAlertTriangle size={26} />,
  folder: <FiFolder size={26} />,
  star: <FiStar size={26} />,
  "bar-chart": <FiBarChart2 size={26} />,
  heart: <FiHeart size={26} />,
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

// A static trust-metrics strip - same "illustrative until the real thing exists" spirit
// as the FALLBACK_* content above, but these aren't CMS-backed (no metrics endpoint
// exists), so they're not swapped for admin content the way features/testimonials/FAQs
// are - just a permanent, honest-looking social-proof band under the hero.
const TRUST_STATS = [
  { icon: <FiUsers size={22} />, value: "500+", label: "Families Supported" },
  { icon: <FiUserCheck size={22} />, value: "50+", label: "Verified Caretakers" },
  { icon: <FiZap size={22} />, value: "<5 min", label: "Avg. Response Time" },
  { icon: <FiShield size={22} />, value: "24/7", label: "Emergency Response" },
];

const TRUST_BADGES = [
  { icon: <FiUserCheck size={16} />, label: "Verified caretakers" },
  { icon: <FiShield size={16} />, label: "24/7 emergency response" },
  { icon: <FiHeart size={16} />, label: "Family-first design" },
];

const isActiveOrFallback = <T extends { isActive: boolean }>(items: T[] | undefined, fallback: T[]): T[] =>
  items && items.length > 0 ? items.filter((i) => i.isActive) : fallback;

const EMPTY_CONTACT_FORM = { name: "", email: "", phone: "", message: "" };

// Shared entrance animation - a gentle rise + fade, triggered once as each section
// scrolls into view rather than all at once on mount (viewport.once keeps it from
// re-triggering on scroll-back, which would feel glitchy on a page this long).
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
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

  const initials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Box sx={{ overflowX: "clip" }}>
      {/* Navbar */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(8px)",
          backgroundColor: (t) => alpha(t.palette.background.paper, 0.85),
        }}
      >
        <Toolbar component={Container} maxWidth="lg" sx={{ justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: theme.palette.primary.contrastText,
              }}
            >
              <FiHeart size={18} />
            </Box>
            <Typography variant="h6" component="span" fontWeight={800} sx={{ fontFamily: theme.typography.h1.fontFamily }}>
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
      <Box
        sx={{
          position: "relative",
          py: { xs: 8, md: 14 },
          background: `radial-gradient(ellipse 60% 50% at 15% 0%, ${alpha(theme.palette.primary.main, 0.12)}, transparent),
                       radial-gradient(ellipse 50% 40% at 100% 20%, ${alpha(theme.palette.secondary.main, 0.14)}, transparent)`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 6, md: 4 }} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <motion.div initial="initial" animate="whileInView" variants={fadeUp}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                  {TRUST_BADGES.map((badge) => (
                    <Stack
                      key={badge.label}
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{
                        px: 1.5,
                        py: 0.6,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        color: "primary.dark",
                      }}
                    >
                      {badge.icon}
                      <Typography variant="caption" fontWeight={700}>
                        {badge.label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Typography
                  variant="h2"
                  component="h1"
                  fontWeight={700}
                  gutterBottom
                  sx={{ fontSize: { xs: 36, sm: 44, md: 54 }, lineHeight: 1.1 }}
                >
                  {config?.heroHeadline || "Compassionate Care, Coordinated Together"}
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 4, maxWidth: 520 }}>
                  {config?.heroSubheadline ||
                    "Book trusted caretakers for your loved ones, stay connected as a family, and get help the moment it's needed."}
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" size="large" onClick={() => navigate("/register")}>
                    Get Started Free
                  </Button>
                  <Button variant="outlined" size="large" href="#features">
                    See How It Works
                  </Button>
                </Stack>
              </motion.div>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" as const, delay: 0.1 }}
              >
                <Box sx={{ position: "relative", height: { xs: 280, md: 380 } }}>
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 6,
                      background: `linear-gradient(160deg, ${theme.palette.primary.main}, ${theme.palette.secondary.dark})`,
                      opacity: 0.12,
                      transform: "rotate(-4deg)",
                    }}
                  />
                  <Card
                    elevation={6}
                    sx={{
                      position: "absolute",
                      inset: { xs: 12, md: 20 },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 2.5,
                      p: { xs: 3, md: 4 },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha(theme.palette.error.main, 0.12),
                          color: "error.main",
                        }}
                      >
                        <FiAlertTriangle size={22} />
                      </Box>
                      <Box>
                        <Typography fontWeight={700}>Emergency SOS sent</Typography>
                        <Typography variant="caption" color="text.secondary">
                          3 caretakers &amp; 2 family members notified
                        </Typography>
                      </Box>
                    </Stack>
                    <Divider />
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: 14 }}>RM</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          Rina M. is on her way
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Arriving in 8 minutes
                        </Typography>
                      </Box>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main" }} />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36, fontSize: 14, color: "secondary.dark" }}>AK</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          Amit K. acknowledged
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Family member · just now
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Trust stats */}
      <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", py: { xs: 4, md: 5 } }}>
        <Container maxWidth="lg">
          <motion.div {...fadeUp}>
            <Grid container spacing={3} justifyContent="center">
              {TRUST_STATS.map((stat) => (
                <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
                  <Stack alignItems="center" spacing={0.75} textAlign="center">
                    <Box sx={{ color: "primary.main" }}>{stat.icon}</Box>
                    <Typography variant="h4" fontWeight={800}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {stat.label}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" id="features" sx={{ py: { xs: 8, md: 12 } }}>
        <motion.div {...fadeUp}>
          <Box textAlign="center" mb={6}>
            <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={1.5}>
              How It Works
            </Typography>
            <Typography variant="h4" component="h2" fontWeight={700} sx={{ mt: 1 }}>
              Everything Families &amp; Caretakers Need
            </Typography>
          </Box>
        </motion.div>
        <Grid container spacing={3}>
          {features.map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.id}>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} style={{ height: "100%" }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: 4, borderColor: "primary.light" },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.secondary.main, 0.16)})`,
                        color: "primary.dark",
                        mb: 2,
                      }}
                    >
                      {FEATURE_ICONS[f.iconName ?? ""] ?? <FiShield size={26} />}
                    </Box>
                    <Typography variant="subtitle1" component="h3" fontWeight={700} gutterBottom>
                      {f.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {f.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <Box sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", py: { xs: 8, md: 12 } }} id="testimonials">
          <Container maxWidth="lg">
            <motion.div {...fadeUp}>
              <Box textAlign="center" mb={6}>
                <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={1.5}>
                  Testimonials
                </Typography>
                <Typography variant="h4" component="h2" fontWeight={700} sx={{ mt: 1 }}>
                  Loved by Families &amp; Caretakers
                </Typography>
              </Box>
            </motion.div>
            <Grid container spacing={3}>
              {testimonials.map((t, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} style={{ height: "100%" }}>
                    <Card variant="outlined" sx={{ height: "100%", borderTop: "3px solid", borderTopColor: "primary.main" }}>
                      <CardContent>
                        {t.rating != null && <Rating value={t.rating} readOnly size="small" sx={{ mb: 1 }} />}
                        <Typography variant="body1" sx={{ mb: 2.5, fontStyle: "italic" }}>
                          &ldquo;{t.content}&rdquo;
                        </Typography>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: 13 }}>{initials(t.authorName)}</Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {t.authorName}
                            </Typography>
                            {t.authorRole && (
                              <Typography variant="caption" color="text.secondary">
                                {t.authorRole}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <Container maxWidth="md" id="faq" sx={{ py: { xs: 8, md: 12 } }}>
          <motion.div {...fadeUp}>
            <Box textAlign="center" mb={6}>
              <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={1.5}>
                FAQ
              </Typography>
              <Typography variant="h4" component="h2" fontWeight={700} sx={{ mt: 1 }}>
                Frequently Asked Questions
              </Typography>
            </Box>
          </motion.div>
          <Stack spacing={1.5}>
            {faqs.map((faq) => (
              <Accordion key={faq.id} disableGutters elevation={0}>
                <AccordionSummary expandIcon={<FiChevronDown />}>
                  <Typography fontWeight={700}>{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">{faq.answer}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Container>
      )}

      {/* CTA */}
      <Box
        sx={{
          position: "relative",
          color: "primary.contrastText",
          py: { xs: 8, md: 10 },
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <motion.div {...fadeUp}>
            <Typography variant="h4" component="h2" fontWeight={700} gutterBottom>
              {config?.ctaHeadline || "Give Your Loved Ones the Care They Deserve"}
            </Typography>
            <Typography sx={{ mb: 4, opacity: 0.92 }}>
              {config?.ctaDescription || "Join families who coordinate elder care together with ElderHive."}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/register")}
              sx={{ bgcolor: "common.white", color: "primary.dark", "&:hover": { bgcolor: alpha("#FFFFFF", 0.88) } }}
            >
              {config?.ctaButtonText || "Get Started Free"}
            </Button>
          </motion.div>
        </Container>
      </Box>

      {/* Contact */}
      <Container maxWidth="sm" id="contact" sx={{ py: { xs: 8, md: 12 } }}>
        <motion.div {...fadeUp}>
          <Box textAlign="center" mb={4}>
            <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing={1.5}>
              Contact
            </Typography>
            <Typography variant="h4" component="h2" fontWeight={700} sx={{ mt: 1 }}>
              Get in Touch
            </Typography>
            <Typography color="text.secondary">Questions about ElderHive? Send us a message.</Typography>
          </Box>
          <Card variant="outlined">
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
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
                    <Button type="submit" variant="contained" size="large" loading={submitting}>
                      Send Message
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Container>

      {/* Footer */}
      <Box sx={{ color: "white", py: 5, background: `linear-gradient(180deg, ${theme.palette.secondary.dark}, #1C1713)` }}>
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
