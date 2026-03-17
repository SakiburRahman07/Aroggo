interface InviteEmailParams {
  workspaceName: string;
  recipient: string;
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
}

export function buildInviteEmail({ workspaceName, inviterName, roleLabel, acceptUrl }: InviteEmailParams) {
  return {
    subject: `You have been invited to ${workspaceName} on OpsPilot Health`,
    text: `${inviterName} invited you to join ${workspaceName} as ${roleLabel}. Accept the invite: ${acceptUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Join ${workspaceName}</h1>
        <p>${inviterName} invited you to join <strong>${workspaceName}</strong> as <strong>${roleLabel}</strong> on OpsPilot Health.</p>
        <p style="margin: 24px 0;">
          <a href="${acceptUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 12px; background: #0f172a; color: white; text-decoration: none;">Accept invitation</a>
        </p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${acceptUrl}</p>
      </div>
    `
  };
}
