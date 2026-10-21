import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiUserPlus } from "react-icons/fi";
import TextField from "../../../atoms/TextField/TextField";
import Button from "../../../atoms/Button/Button";
import { useElderProfileService } from "../../../../services/useElderProfileService";
import { useInviteService } from "../../../../services/useInviteService";
import { getErrorMessage } from "../../../../utils/helper";
import { UserTypeEnum } from "../../../../utils/enums";

const BACK_PATH = "/family/elder-profiles";

/**
 * Alternate "add" flow to ElderProfilesForm.page.tsx's manual entry: creates a
 * placeholder ElderProfile (named after whoever you're inviting) and sends them a
 * token-based invite to claim it as their own account - unlike ElderSphere's reference
 * (which searches an EXISTING elder account by id), ElderHive's invite flow (Prompt 63) is
 * email/phone based, so the elder doesn't need an account yet; they register and accept
 * the invite (see Elder/Invites.page.tsx) once they receive it.
 */
const LinkElderProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const elderProfileService = useElderProfileService();
  const inviteService = useInviteService();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const profile = await elderProfileService.create({ fullName: fullName.trim() });
      await inviteService.createInvite(profile.id, {
        invitedEmail: email.trim(),
        invitedRole: UserTypeEnum.ELDER,
        relationshipLabel: relationshipLabel.trim() || undefined,
      });
      navigate(BACK_PATH);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send this link request"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Button variant="text" startIcon={<FiArrowLeft size={16} />} onClick={() => navigate(BACK_PATH)}>
          Back
        </Button>
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <FiUserPlus size={22} />
        <Typography variant="h5" fontWeight={800}>
          Link an Existing Elder
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Enter the elder's name and email address. They'll receive an invite and must accept it
            before the profile shows as linked to their own account.
          </Typography>
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            <TextField label="Elder's Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <TextField
              label="Elder's Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Relationship (optional)"
              placeholder="e.g. Mother, Father, Grandparent"
              value={relationshipLabel}
              onChange={(e) => setRelationshipLabel(e.target.value)}
            />
            <Box>
              <Button type="submit" variant="contained" loading={submitting} disabled={!canSubmit}>
                Send Link Request
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LinkElderProfilePage;
