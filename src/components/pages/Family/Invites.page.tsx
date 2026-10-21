import React, { useState } from "react";
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { FiMail } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import Button from "../../atoms/Button/Button";
import { useInviteService, type InviteResponseDTO } from "../../../services/useInviteService";
import { getErrorMessage } from "../../../utils/helper";
import { LinkInviteStatusEnum } from "../../../utils/enums";

const STATUS_COLOR: Record<LinkInviteStatusEnum, "default" | "success" | "error"> = {
  [LinkInviteStatusEnum.PENDING]: "default",
  [LinkInviteStatusEnum.ACCEPTED]: "success",
  [LinkInviteStatusEnum.DECLINED]: "error",
};

/**
 * A family member's own version of Elder/Invites.page.tsx — same token-based accept/
 * decline shape (see that page's comment for why there's no browsable inbox), but reached
 * when another family member invites you to co-manage an elder profile
 * (FamilyMembersPanel.tsx) instead of an elder being invited to claim their own profile.
 */
const FamilyInvitesPage: React.FC = () => {
  const inviteService = useInviteService();

  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResponseDTO | null>(null);

  const respond = async (action: "accept" | "decline") => {
    if (!token.trim() || submitting) return;
    setSubmitting(action);
    setError(null);
    setResult(null);
    try {
      const invite = action === "accept" ? await inviteService.accept(token.trim()) : await inviteService.decline(token.trim());
      setResult(invite);
      if (action === "accept") setToken("");
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
        <Typography variant="h5" fontWeight={800}>
          Family Link Invites
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            When another family member invites you to co-manage an elder profile, they'll share an
            invite token with you. Paste it below to accept or decline.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField label="Invite Token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token here" />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" loading={submitting === "accept"} disabled={!token.trim()} onClick={() => respond("accept")}>
                Accept
              </Button>
              <Button variant="outlined" loading={submitting === "decline"} disabled={!token.trim()} onClick={() => respond("decline")}>
                Decline
              </Button>
            </Stack>

            {result && (
              <Alert severity={result.status === LinkInviteStatusEnum.ACCEPTED ? "success" : "info"}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Invite {result.status === LinkInviteStatusEnum.ACCEPTED ? "accepted" : "declined"}.</span>
                  <Chip label={result.status} size="small" color={STATUS_COLOR[result.status]} />
                </Stack>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FamilyInvitesPage;
