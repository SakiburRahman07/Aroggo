import { addHours } from "date-fns";
import { hash } from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@/lib/db/prisma";
import { AppError, logAppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { buildInviteEmail } from "@/emails/invite-email";
import { buildPasswordResetEmail } from "@/emails/password-reset-email";
import { sendTransactionalEmail } from "@/lib/email/service";
import { signUpSchema, forgotPasswordSchema, resetPasswordSchema } from "@/features/auth/validation";

async function generateUniqueWorkspaceSlug(name: string) {
  const base = slugify(name) || `clinic-${Date.now()}`;
  let attempt = base;
  let suffix = 1;

  while (await db.workspace.findUnique({ where: { slug: attempt } })) {
    attempt = `${base}-${suffix}`;
    suffix += 1;
  }

  return attempt;
}

const defaultDepartments = [
  { name: "Administration", description: "Front desk and reception operations" },
  { name: "Clinical", description: "Doctors and care delivery" },
  { name: "Laboratory", description: "Lab processing and result handling" },
  { name: "Operations", description: "Management and coordination" }
];

export async function registerUser(input: unknown) {
  const data = signUpSchema.parse(input);
  const normalizedEmail = data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    throw new AppError({
      code: "CONFLICT_ERROR",
      message: "Duplicate signup email.",
      userMessage: "An account with this email already exists.",
      fieldErrors: {
        email: ["An account with this email already exists."]
      }
    });
  }

  const passwordHash = await hash(data.password, 12);

  if (data.inviteToken) {
    const invite = await db.workspaceInvite.findUnique({
      where: { token: data.inviteToken },
      include: { workspace: true }
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      throw new AppError({
        code: "BUSINESS_RULE_ERROR",
        message: "Workspace invite is invalid or expired.",
        userMessage: "This invite is no longer valid."
      });
    }

    if (invite.email.toLowerCase() !== normalizedEmail) {
      throw new AppError({
        code: "CONFLICT_ERROR",
        message: "Invite email does not match signup email.",
        userMessage: "Invite email does not match the signup email.",
        fieldErrors: {
          email: ["Invite email does not match the signup email."]
        }
      });
    }

    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: data.fullName,
          passwordHash,
          profile: {
            create: {
              fullName: data.fullName
            }
          }
        }
      });

      await tx.membership.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: createdUser.id,
          role: invite.role,
          departmentId: invite.departmentId,
          status: "ACTIVE",
          invitedById: invite.invitedById
        }
      });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date()
        }
      });

      return createdUser;
    });

    return {
      userId: user.id,
      redirectTo: `/app/${invite.workspace.slug}`
    };
  }

  const workspaceSlug = await generateUniqueWorkspaceSlug(data.workspaceName!);
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: data.fullName,
        passwordHash,
        profile: {
          create: {
            fullName: data.fullName
          }
        }
      }
    });

    const workspace = await tx.workspace.create({
      data: {
        name: data.workspaceName!,
        slug: workspaceSlug,
        timezone: data.timezone,
        createdById: user.id,
        settingsJson: {
          aiDraftsRequireReview: true,
          remindersEnabled: true
        }
      }
    });

    await tx.department.createMany({
      data: defaultDepartments.map((department) => ({
        workspaceId: workspace.id,
        ...department
      }))
    });

    await tx.membership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "CLINIC_ADMIN",
        status: "ACTIVE"
      }
    });

    return {
      userId: user.id,
      workspaceSlug: workspace.slug
    };
  });

  return {
    userId: result.userId,
    redirectTo: `/app/${result.workspaceSlug}`
  };
}

export async function requestPasswordReset(input: unknown) {
  const data = forgotPasswordSchema.parse(input);
  const normalizedEmail = data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { profile: true }
  });

  if (!user) {
    return { ok: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addHours(new Date(), 2);

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt
    }
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const email = buildPasswordResetEmail({
    fullName: user.profile?.fullName ?? user.name ?? user.email,
    resetUrl
  });

  const sendResult = await sendTransactionalEmail({
    templateKey: "password-reset",
    recipient: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text
  });

  if (!sendResult.ok) {
    logAppError(
      new AppError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: sendResult.error ?? "Password reset email delivery failed.",
        userMessage: "We couldn't send the reset email right now.",
        details: {
          flow: "password-reset",
          email: normalizedEmail
        }
      }),
      {
        route: "auth.requestPasswordReset",
        email: normalizedEmail
      }
    );
  }

  return { ok: true };
}

export async function resetPassword(input: unknown) {
  const data = resetPasswordSchema.parse(input);
  const token = await db.passwordResetToken.findUnique({
    where: { token: data.token }
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new AppError({
      code: "BUSINESS_RULE_ERROR",
      message: "Reset token is invalid or expired.",
      userMessage: "This reset link is invalid or expired."
    });
  }

  const passwordHash = await hash(data.password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: token.userId },
      data: {
        passwordHash
      }
    }),
    db.passwordResetToken.update({
      where: { id: token.id },
      data: {
        usedAt: new Date()
      }
    })
  ]);

  return { ok: true };
}

export async function sendWorkspaceInvite(params: {
  workspaceId: string;
  workspaceName: string;
  recipient: string;
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
}) {
  const email = buildInviteEmail({
    workspaceName: params.workspaceName,
    recipient: params.recipient,
    inviterName: params.inviterName,
    roleLabel: params.roleLabel,
    acceptUrl: params.acceptUrl
  });

  return sendTransactionalEmail({
    workspaceId: params.workspaceId,
    templateKey: "workspace-invite",
    recipient: params.recipient,
    subject: email.subject,
    html: email.html,
    text: email.text,
    metadata: {
      role: params.roleLabel
    }
  });
}

