"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";
import { AppError, buildErrorRedirectUrl, normalizeAppError, rethrowIfFrameworkControlFlow } from "@/lib/errors";
import { requirePatientPortalContext, requireWorkspaceContext } from "@/lib/auth/session";
import { fullNameSchema, optionalEmailSchema, optionalTrimmedString, passwordSchema } from "@/validation/common";
import {
  activatePatientPortalInvite,
  checkInPatientFromQr,
  createPatientPortalInvite,
  ensurePermanentPatientQr,
  markPortalNotificationsRead,
  reissuePermanentPatientQr,
  requestPatientProfileUpdate,
  toggleDocumentRelease,
  toggleVisitRelease
} from "@/features/patient-portal/service";

function buildPortalActivationErrorRedirect(token: string, error: string) {
  return `/portal/activate?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error)}`;
}

export async function sendPatientPortalInviteAction(workspaceSlug: string, patientId: string) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");
    const result = await createPatientPortalInvite({
      workspaceId: workspace.id,
      patientId,
      invitedById: membership.userId
    });

    await recordAuditLog({
      workspaceId: workspace.id,
      actorUserId: membership.userId,
      entityType: "patient_portal_invite",
      entityId: result.invite.id,
      action: "INVITE",
      changesJson: {
        patientId,
        expiresAt: result.invite.expiresAt,
        acceptUrl: result.acceptUrl,
        emailStatus: result.emailResult.ok ? "SENT" : "FAILED",
        emailError: result.emailResult.ok ? null : result.emailResult.error
      }
    });

    revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/patients/${patientId}`, error));
  }
}

export async function ensurePatientPermanentQrAction(workspaceSlug: string, patientId: string) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");
    await ensurePermanentPatientQr(workspace.id, patientId, membership.userId);
    revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/patients/${patientId}`, error));
  }
}

export async function reissuePatientPermanentQrAction(workspaceSlug: string, patientId: string) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");
    await reissuePermanentPatientQr(workspace.id, patientId, membership.userId);
    revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/patients/${patientId}`, error));
  }
}

export async function activatePatientPortalInviteAction(token: string, formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    fullNameSchema.parse(fullName);
    passwordSchema.parse(password);
  } catch (error) {
    const normalized = normalizeAppError(error);
    const fieldErrors = normalized.fieldErrors ?? {};

    if (fieldErrors.fullName?.length) {
      redirect(buildPortalActivationErrorRedirect(token, "full-name"));
    }

    if (fieldErrors.password?.length) {
      redirect(buildPortalActivationErrorRedirect(token, "password"));
    }

    redirect(buildPortalActivationErrorRedirect(token, "invalid"));
  }

  try {
    await activatePatientPortalInvite({
      token,
      fullName,
      password
    });
  } catch (error) {
    const normalized = normalizeAppError(error);

    if (normalized.userMessage.includes("invalid or expired")) {
      redirect(buildPortalActivationErrorRedirect(token, "token"));
    }

    if (normalized.userMessage.includes("internal staff account")) {
      redirect(buildPortalActivationErrorRedirect(token, "staff-email"));
    }

    if (normalized.userMessage.includes("already linked to another patient portal account")) {
      redirect(buildPortalActivationErrorRedirect(token, "email-in-use"));
    }

    redirect(buildPortalActivationErrorRedirect(token, "activation"));
  }

  redirect(`/portal/login?activated=1`);
}

export async function releaseDocumentToPatientAction(workspaceSlug: string, documentId: string, released: boolean) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["documents:write_clinical", "documents:write_lab"]);
    await toggleDocumentRelease({
      workspaceId: workspace.id,
      documentId,
      actorUserId: membership.userId,
      released
    });
    revalidatePath(`/app/${workspaceSlug}/documents/${documentId}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/documents/${documentId}`, error));
  }
}

export async function releaseVisitToPatientAction(workspaceSlug: string, visitId: string, formData: FormData) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "visits:write");
    const released = String(formData.get("released") ?? "false") === "true";

    await toggleVisitRelease({
      workspaceId: workspace.id,
      visitId,
      actorUserId: membership.userId,
      released,
      patientSummary: String(formData.get("patientSummary") ?? "") || null,
      followUpInstructions: String(formData.get("followUpInstructions") ?? "") || null
    });

    revalidatePath(`/app/${workspaceSlug}/visits/${visitId}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/visits/${visitId}`, error));
  }
}

export async function requestPortalProfileUpdateAction(formData: FormData) {
  try {
    const { workspace, portalAccount } = await requirePatientPortalContext();
    await requestPatientProfileUpdate({
      workspaceId: workspace.id,
      patientId: portalAccount.patientId,
      userId: portalAccount.userId,
      changes: {
        phone: String(formData.get("phone") ?? "") || null,
        email: optionalEmailSchema.parse(formData.get("email") ?? "") || null,
        address: optionalTrimmedString().parse(formData.get("address") ?? "") || null,
        emergencyContact: String(formData.get("emergencyContact") ?? "") || null
      }
    });

    revalidatePath("/portal/profile");
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl("/portal/profile", error));
  }
}

export async function portalSelfCheckInAction(formData: FormData) {
  try {
    const { portalAccount } = await requirePatientPortalContext();
    const qr = String(formData.get("qr") ?? "");
    await checkInPatientFromQr({
      userId: portalAccount.userId,
      publicId: qr
    });
    revalidatePath("/portal/check-in");
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    const qr = String(formData.get("qr") ?? "");
    redirect(buildErrorRedirectUrl("/portal/check-in", error, { searchParams: { qr } }));
  }
}

export async function markPortalNotificationsReadAction() {
  const { workspace, portalAccount } = await requirePatientPortalContext();
  await markPortalNotificationsRead(workspace.id, portalAccount.userId);
  revalidatePath("/portal/notifications");
}

export async function resolveScanInputAction(workspaceSlug: string, formData: FormData) {
  await requireWorkspaceContext(workspaceSlug);
  const rawValue = String(formData.get("scanInput") ?? "").trim();
  const publicId = rawValue.includes("/scan/") ? rawValue.split("/scan/").pop() ?? "" : rawValue;

  if (!publicId) {
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/scan`, new AppError({
      code: "VALIDATION_ERROR",
      message: "QR public ID is required.",
      userMessage: "A QR public ID or scan URL is required."
    })));
  }

  redirect(`/scan/${publicId}`);
}
