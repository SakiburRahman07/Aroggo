export function buildPasswordResetEmail({ fullName, resetUrl }: { fullName: string; resetUrl: string }) {
  return {
    subject: "Reset your OpsPilot Health password",
    text: `Hi ${fullName}, reset your password with this link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your password</h1>
        <p>Hi ${fullName},</p>
        <p>Use the link below to reset your OpsPilot Health password. This link expires in 2 hours.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 12px; background: #0f172a; color: white; text-decoration: none;">Reset password</a>
        </p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${resetUrl}</p>
      </div>
    `
  };
}

