"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit";
import { requirePatientPortalContext, requireWorkspaceContext } from "@/lib/auth/session";
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

const activationSchema = z.object({
  fullName: z.string().min(2),
  password: z.string().min(8)
});

export async function sendPatientPortalInviteAction(workspaceSlug: string, patientId: string) {
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
      acceptUrl: result.acceptUrl
    }
  });

  revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
}

export async function ensurePatientPermanentQrAction(workspaceSlug: string, patientId: string) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");
  await ensurePermanentPatientQr(workspace.id, patientId, membership.userId);
  revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
}

export async function reissuePatientPermanentQrAction(workspaceSlug: string, patientId: string) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");
  await reissuePermanentPatientQr(workspace.id, patientId, membership.userId);
  revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
}

export async function activatePatientPortalInviteAction(token: string, formData: FormData) {
  const parsed = activationSchema.parse({
    fullName: formData.get("fullName"),
    password: formData.get("password")
  });

  await activatePatientPortalInvite({
    token,
    fullName: parsed.fullName,
    password: parsed.password
  });

  redirect(`/portal/login?activated=1`);
}

export async function releaseDocumentToPatientAction(workspaceSlug: string, documentId: string, released: boolean) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["documents:write_clinical", "documents:write_lab"]);
  await toggleDocumentRelease({
    workspaceId: workspace.id,
    documentId,
    actorUserId: membership.userId,
    released
  });
  revalidatePath(`/app/${workspaceSlug}/documents/${documentId}`);
}

export async function releaseVisitToPatientAction(workspaceSlug: string, visitId: string, formData: FormData) {
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
}

export async function requestPortalProfileUpdateAction(formData: FormData) {
  const { workspace, portalAccount } = await requirePatientPortalContext();
  await requestPatientProfileUpdate({
    workspaceId: workspace.id,
    patientId: portalAccount.patientId,
    userId: portalAccount.userId,
    changes: {
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      emergencyContact: String(formData.get("emergencyContact") ?? "") || null
    }
  });

  revalidatePath("/portal/profile");
}

export async function portalSelfCheckInAction(formData: FormData) {
  const { portalAccount } = await requirePatientPortalContext();
  const qr = String(formData.get("qr") ?? "");
  await checkInPatientFromQr({
    userId: portalAccount.userId,
    publicId: qr
  });
  revalidatePath("/portal/check-in");
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
    throw new Error("A QR public ID or scan URL is required.");
  }

  redirect(`/scan/${publicId}`);
}
