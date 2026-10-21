import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, Divider, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import { FiUsers } from "react-icons/fi";
import TextField from "../../../atoms/TextField/TextField";
import Button from "../../../atoms/Button/Button";
import { useElderProfileService, type FamilyMemberSummaryDTO } from "../../../../services/useElderProfileService";
import { useInviteService, type InviteResponseDTO } from "../../../../services/useInviteService";
import { useAuthenticatedUser } from "../../../../contexts/AuthenticatedUserContext";
import { getErrorMessage } from "../../../../utils/helper";
import { LinkInviteStatusEnum, UserTypeEnum } from "../../../../utils/enums";

export interface FamilyMembersPanelProps {
  elderProfileId: number;
}

/**
 * Shown below the manual edit fields on ElderProfilesForm.page.tsx (edit mode only).
 * Unlike ElderSphere's own reference (which searches for an EXISTING account by id and
 * links it directly), ElderHive's invite flow (Prompt 63) is deliberately email/phone
 * based - the invitee doesn't need an account yet - so "inviting" here is just entering
 * a contact, not picking a search result.
 */
const FamilyMembersPanel: React.FC<FamilyMembersPanelProps> = ({ elderProfileId }) => {
  const elderProfileService = useElderProfileService();
  const inviteService = useInviteService();
  const { user } = useAuthenticatedUser();

  const [members, setMembers] = useState<FamilyMemberSummaryDTO[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([elderProfileService.listFamilyMembers(elderProfileId), inviteService.listForProfile(elderProfileId)])
      .then(([familyMembers, invites]) => {
        setMembers(familyMembers);
        setPendingInvites(invites.filter((i) => i.status === LinkInviteStatusEnum.PENDING && i.invitedRole === UserTypeEnum.FAMILY_MEMBER));
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load family members")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = members.some((m) => m.isOwner && m.userId === user?.id);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    setError(null);
    try {
      await inviteService.createInvite(elderProfileId, {
        invitedEmail: inviteEmail.trim(),
        invitedRole: UserTypeEnum.FAMILY_MEMBER,
        relationshipLabel: relationshipLabel.trim() || undefined,
      });
      setSuccessMessage(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setRelationshipLabel("");
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not send this invite"));
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: number) => {
    setBusyUserId(userId);
    setError(null);
    try {
      await elderProfileService.removeFamilyMember(elderProfileId, userId);
      setSuccessMessage("Family member removed");
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove this family member"));
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) return null;

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <FiUsers size={18} />
          <Typography variant="h6" fontWeight={700}>
            Family Members
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <List dense disablePadding>
          {members.map((member) => (
            <ListItem
              key={member.userId}
              divider
              secondaryAction={
                !member.isOwner && isOwner ? (
                  <Button variant="text" color="error" size="small" loading={busyUserId === member.userId} onClick={() => handleRemove(member.userId)}>
                    Remove
                  </Button>
                ) : undefined
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{member.fullName ?? "Unknown"}</span>
                    {member.isOwner && <Chip label="Owner" size="small" color="primary" variant="outlined" />}
                  </Stack>
                }
                secondary={member.relationshipLabel}
              />
            </ListItem>
          ))}
        </List>

        {pendingInvites.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mt={2} mb={1}>
              Pending Invites
            </Typography>
            <List dense disablePadding>
              {pendingInvites.map((invite) => (
                <ListItem key={invite.id} divider>
                  <ListItemText
                    primary={invite.invitedEmail ?? invite.invitedPhone ?? "Invited contact"}
                    secondary={invite.relationshipLabel ?? "Awaiting response"}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {isOwner && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Invite a family member to co-manage this profile
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Email address"
                placeholder="family.member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <TextField
                label="Relationship (optional)"
                placeholder="e.g. Sibling, Spouse"
                value={relationshipLabel}
                onChange={(e) => setRelationshipLabel(e.target.value)}
              />
              <Box>
                <Button variant="contained" onClick={handleInvite} loading={inviting} disabled={!inviteEmail.trim()}>
                  Send Invite
                </Button>
              </Box>
            </Stack>
          </>
        )}
      </CardContent>

      <Box sx={{ px: 2, pb: 1 }}>
        {successMessage && (
          <Alert severity="success" sx={{ mt: 1 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
      </Box>
    </Card>
  );
};

export default FamilyMembersPanel;
