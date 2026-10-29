import React, { useState } from "react";
import { Alert, Box, Card, CardContent, Chip, Grid, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import { FiCheckCircle, FiKey, FiMail, FiUserPlus } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import Button from "../../atoms/Button/Button";
import { useInviteService, type InviteResponseDTO } from "../../../services/useInviteService";
import { getErrorMessage, formatDateTime, formatEnumLabel} from "../../../utils/helper";
import { LinkInviteStatusEnum } from "../../../utils/enums";

const STATUS_COLOR: Record<LinkInviteStatusEnum, "default" | "success" | "error"> = {
  [LinkInviteStatusEnum.PENDING]: "default",
  [LinkInviteStatusEnum.ACCEPTED]: "success",
  [LinkInviteStatusEnum.DECLINED]: "error",
};

const HOW_IT_WORKS = [
  { icon: <FiUserPlus size={18} />, title: "You're invited", text: "A family member sets you up as a co-manager on an elder profile." },
  { icon: <FiKey size={18} />, title: "Get the token", text: "They share an invite token with you directly, since there's no email delivery yet." },
  { icon: <FiCheckCircle size={18} />, title: "Paste & decide", text: "Paste it below and accept or decline — it takes effect immediately." },
];

/**
 * A family member's own version of Elder/Invites.page.tsx — same token-based accept/
 * decline shape (see that page's comment for why there's no browsable inbox), but reached
 * when another family member invites you to co-manage an elder profile
 * (FamilyMembersPanel.tsx) instead of an elder being invited to claim their own profile.
 *
 * `history` is purely a session-local list of every token this tab has resolved — there's
 * no backend endpoint to list invites addressed to a user (see useInviteService's own
 * comment), so without this a second token handled in the same visit would silently
 * overwrite the feedback for the first.
 */
const FamilyInvitesPage: React.FC = () => {
  const inviteService = useInviteService();

  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<InviteResponseDTO[]>([]);

  const respond = async (action: "accept" | "decline") => {
    if (!token.trim() || submitting) return;
    setSubmitting(action);
    setError(null);
    try {
      const invite = action === "accept" ? await inviteService.accept(token.trim()) : await inviteService.decline(token.trim());
      setHistory((prev) => [invite, ...prev]);
      setToken("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not respond to this invite"));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiMail size={22} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Family Link Invites
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Accept or decline an invite to co-manage someone's elder profile.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} mb={3}>
        {HOW_IT_WORKS.map((step) => (
          <Grid key={step.title} size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.75} color="primary.main">
                  {step.icon}
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    {step.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {step.text}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined">
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
            <TextField
              label="Invite Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token here"
              sx={{ flex: 1 }}
            />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" loading={submitting === "accept"} disabled={!token.trim()} onClick={() => respond("accept")}>
                Accept
              </Button>
              <Button variant="outlined" loading={submitting === "decline"} disabled={!token.trim()} onClick={() => respond("decline")}>
                Decline
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Handled this session
            </Typography>
            <List dense disablePadding>
              {history.map((invite, i) => (
                <ListItem key={`${invite.id}-${i}`} divider={i < history.length - 1} disableGutters>
                  <ListItemText
                    primary={invite.relationshipLabel ? `As ${invite.relationshipLabel}` : `Invite #${invite.id}`}
                    secondary={formatDateTime(invite.updatedAt ?? invite.createdAt)}
                  />
                  <Chip label={formatEnumLabel(invite.status)} size="small" color={STATUS_COLOR[invite.status]} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FamilyInvitesPage;
