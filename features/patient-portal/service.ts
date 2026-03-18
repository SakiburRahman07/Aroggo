import { addDays, isBefore } from "date-fns";
import { hash } from "bcryptjs";
import { type AppointmentStatus, type QrIdentifierType, type Role } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/service";
import { randomPublicId, randomToken, sha256Hex } from "@/lib/security/tokens";
import { resolvePatientQrScan as resolveRoleAwarePatientQrScan } from "@/features/qr/service";

const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PORTAL_INVITE_WINDOW_DAYS = 3;

export function buildScanUrl(publicId: string) {
  return `${portalBaseUrl}/scan/${publicId}`;
}

function buildPortalInviteUrl(token: string) {
  return `${portalBaseUrl}/portal/activate?token=${token}`;
}


export async function ensurePermanentPatientQr(workspaceId: string, patientId: string, createdById?: string) {
  const existing = await db.patientQrIdentifier.findFirst({
    where: {
      workspaceId,
      patientId,
      qrType: "PERMANENT_IDENTITY",
      revokedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return existing;
  }

  return db.patientQrIdentifier.create({
    data: {
      workspaceId,
      patientId,
      publicId: randomPublicId("ptid"),
      qrType: "PERMANENT_IDENTITY",
      createdById: createdById ?? null
    }
  });
}

export async function issueActionQr(params: {
  workspaceId: string;
  patientId: string;
  qrType: Exclude<QrIdentifierType, "PERMANENT_IDENTITY">;
  createdById?: string;
  expiresAt: Date;
  payload?: Record<string, unknown>;
}) {
  const rawToken = randomToken(18);
  const qr = await db.patientQrIdentifier.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: params.patientId,
      publicId: randomPublicId("ptact"),
      qrType: params.qrType,
      tokenHash: sha256Hex(rawToken),
      actionPayloadJson: (params.payload ?? {}) as never,
      expiresAt: params.expiresAt,
      createdById: params.createdById ?? null
    }
  });

  return {
    qr,
    rawToken
  };
}

export async function revokePatientQr(workspaceId: string, patientId: string, qrType: QrIdentifierType) {
  await db.patientQrIdentifier.updateMany({
    where: {
      workspaceId,
      patientId,
      qrType,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function reissuePermanentPatientQr(workspaceId: string, patientId: string, createdById?: string) {
  await revokePatientQr(workspaceId, patientId, "PERMANENT_IDENTITY");
  return ensurePermanentPatientQr(workspaceId, patientId, createdById);
}

export async function createPatientPortalInvite(params: {
  workspaceId: string;
  patientId: string;
  invitedById: string;
}) {
  const patient = await db.patient.findFirst({
    where: {
      id: params.patientId,
      workspaceId: params.workspaceId
    },
    include: {
      workspace: true
    }
  });

  if (!patient) {
    throw new Error("Patient not found.");
  }

  if (!patient.email) {
    throw new Error("Patient email is required before sending portal access.");
  }

  const rawToken = randomToken(24);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = addDays(new Date(), PORTAL_INVITE_WINDOW_DAYS);

  await db.patientPortalInvite.updateMany({
    where: {
      workspaceId: params.workspaceId,
      patientId: params.patientId,
      status: "PENDING"
    },
    data: {
      status: "REVOKED"
    }
  });

  const invite = await db.patientPortalInvite.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: params.patientId,
      email: patient.email,
      tokenHash,
      invitedById: params.invitedById,
      expiresAt
    }
  });

  await db.patient.update({
    where: { id: patient.id },
    data: {
      portalEnabled: true,
      adminState: "PORTAL_INVITED"
    }
  });

  const acceptUrl = buildPortalInviteUrl(rawToken);
  const emailResult = await sendTransactionalEmail({
    workspaceId: params.workspaceId,
    templateKey: "patient-portal-invite",
    recipient: patient.email,
    subject: `Activate your ${patient.workspace.name} patient portal`,
    html: `<p>Hello ${patient.fullName},</p><p>Your clinic invited you to the Aroggo patient portal.</p><p><a href="${acceptUrl}">Activate portal access</a></p><p>This link expires on ${expiresAt.toDateString()}.</p>`,
    text: `Activate your patient portal: ${acceptUrl}`,
    metadata: {
      patientId: patient.id,
      kind: "patient-portal-invite"
    }
  });

  return {
    invite,
    acceptUrl,
    emailResult
  };
}

export async function activatePatientPortalInvite(params: {
  token: string;
  fullName: string;
  password: string;
}) {
  const invite = await db.patientPortalInvite.findFirst({
    where: {
      tokenHash: sha256Hex(params.token)
    },
    include: {
      patient: true,
      workspace: true
    }
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw new Error("This portal activation link is invalid or expired.");
  }

  const existingUser = await db.user.findUnique({
    where: { email: invite.email },
    include: { memberships: true }
  });

  if (existingUser?.memberships.length) {
    throw new Error("This email is already used by an internal staff account. Use a different address for patient portal access.");
  }

  const passwordHash = await hash(params.password, 12);

  const account = await db.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: params.fullName,
            passwordHash,
            profile: {
              upsert: {
                create: { fullName: params.fullName },
                update: { fullName: params.fullName }
              }
            }
          }
        })
      : await tx.user.create({
          data: {
            email: invite.email,
            name: params.fullName,
            passwordHash,
            profile: {
              create: { fullName: params.fullName }
            }
          }
        });

    const portalAccount = await tx.patientPortalAccount.upsert({
      where: {
        patientId: invite.patientId
      },
      create: {
        patientId: invite.patientId,
        userId: user.id,
        workspaceId: invite.workspaceId,
        portalEnabled: true,
        activatedAt: new Date()
      },
      update: {
        userId: user.id,
        portalEnabled: true,
        activatedAt: new Date()
      }
    });

    await tx.patient.update({
      where: { id: invite.patientId },
      data: {
        portalEnabled: true,
        adminState: "PORTAL_ACTIVE"
      }
    });

    await tx.patientPortalInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACTIVATED",
        activatedAt: new Date()
      }
    });

    return portalAccount;
  });

  return {
    account,
    workspaceSlug: invite.workspace.slug
  };
}

export async function getPatientPortalSnapshot(userId: string) {
  const portalAccount = await db.patientPortalAccount.findFirst({
    where: {
      userId,
      portalEnabled: true
    },
    include: {
      patient: true,
      workspace: true,
      user: {
        include: { profile: true }
      }
    }
  });

  if (!portalAccount) {
    return null;
  }

  const [appointments, documents, visits, notifications, latestQr] = await Promise.all([
    db.appointment.findMany({
      where: {
        workspaceId: portalAccount.workspaceId,
        patientId: portalAccount.patientId
      },
      include: {
        doctor: {
          include: { profile: true }
        }
      },
      orderBy: { scheduledAt: "asc" },
      take: 12
    }),
    db.document.findMany({
      where: {
        workspaceId: portalAccount.workspaceId,
        patientId: portalAccount.patientId,
        releasedToPatient: true
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.visit.findMany({
      where: {
        workspaceId: portalAccount.workspaceId,
        patientId: portalAccount.patientId,
        releasedToPatient: true
      },
      include: {
        doctor: {
          include: { profile: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.notification.findMany({
      where: {
        workspaceId: portalAccount.workspaceId,
        userId
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    ensurePermanentPatientQr(portalAccount.workspaceId, portalAccount.patientId)
  ]);

  return {
    portalAccount,
    appointments,
    documents,
    visits,
    notifications,
    latestQr,
    scanUrl: buildScanUrl(latestQr.publicId)
  };
}

export async function getStaffPatientPortalSnapshot(workspaceId: string, patientId: string) {
  const [patient, portalAccount, latestInvite, permanentQr, releasedDocumentCount, releasedVisitCount] = await Promise.all([
    db.patient.findFirst({ where: { id: patientId, workspaceId } }),
    db.patientPortalAccount.findFirst({
      where: { workspaceId, patientId },
      include: {
        user: {
          include: { profile: true }
        }
      }
    }),
    db.patientPortalInvite.findFirst({
      where: { workspaceId, patientId },
      orderBy: { createdAt: "desc" }
    }),
    db.patientQrIdentifier.findFirst({
      where: {
        workspaceId,
        patientId,
        qrType: "PERMANENT_IDENTITY",
        revokedAt: null
      },
      orderBy: { createdAt: "desc" }
    }),
    db.document.count({ where: { workspaceId, patientId, releasedToPatient: true } }),
    db.visit.count({ where: { workspaceId, patientId, releasedToPatient: true } })
  ]);

  if (!patient) {
    return null;
  }

  const [latestInviteAuditLog, latestInviteEmail] = await Promise.all([
    latestInvite
      ? db.auditLog.findFirst({
          where: {
            workspaceId,
            entityType: "patient_portal_invite",
            entityId: latestInvite.id
          },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve(null),
    db.emailLog.findFirst({
      where: {
        workspaceId,
        templateKey: "patient-portal-invite",
        metadataJson: {
          path: ["patientId"],
          equals: patientId
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const manualInviteUrl = latestInviteAuditLog && typeof latestInviteAuditLog.changesJson === "object" && latestInviteAuditLog.changesJson && "acceptUrl" in latestInviteAuditLog.changesJson
    ? String(latestInviteAuditLog.changesJson.acceptUrl)
    : null;

  return {
    patient,
    portalAccount,
    latestInvite,
    latestInviteEmail,
    manualInviteUrl,
    permanentQr,
    releasedDocumentCount,
    releasedVisitCount,
    permanentQrUrl: permanentQr ? buildScanUrl(permanentQr.publicId) : null
  };
}

export async function requestPatientProfileUpdate(params: {
  workspaceId: string;
  patientId: string;
  userId: string;
  changes: Record<string, unknown>;
}) {
  return db.patientProfileUpdateRequest.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: params.patientId,
      requestedByUserId: params.userId,
      requestedChangesJson: params.changes as never
    }
  });
}

export async function markPortalNotificationsRead(workspaceId: string, userId: string) {
  await db.notification.updateMany({
    where: {
      workspaceId,
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function resolvePatientQrScan(params: {
  publicId: string;
  userId?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  intent?: "default" | "check_in" | "visit" | "report_upload" | "patient_summary";
}) {
  return resolveRoleAwarePatientQrScan(params);
}

export async function checkInPatientFromQr(params: {
  userId: string;
  publicId: string;
}) {
  const portalAccount = await db.patientPortalAccount.findFirst({
    where: {
      userId: params.userId,
      portalEnabled: true
    }
  });

  if (!portalAccount) {
    throw new Error("Portal access not found.");
  }

  const qr = await db.patientQrIdentifier.findFirst({
    where: {
      publicId: params.publicId,
      workspaceId: portalAccount.workspaceId,
      patientId: portalAccount.patientId,
      revokedAt: null
    }
  });

  if (!qr) {
    throw new Error("QR code is invalid for this patient.");
  }

  const appointment = await db.appointment.findFirst({
    where: {
      workspaceId: portalAccount.workspaceId,
      patientId: portalAccount.patientId,
      scheduledAt: {
        gte: addDays(new Date(), -1),
        lte: addDays(new Date(), 1)
      },
      status: {
        in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] satisfies AppointmentStatus[]
      }
    },
    orderBy: { scheduledAt: "asc" }
  });

  if (!appointment) {
    throw new Error("No eligible appointment was found for self check-in.");
  }

  await db.$transaction([
    db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CHECKED_IN"
      }
    }),
    db.appointmentCheckInEvent.create({
      data: {
        workspaceId: appointment.workspaceId,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        source: "PATIENT_QR",
        metadataJson: {
          qrIdentifierId: qr.id,
          checkedInVia: "patient-portal"
        } as never
      }
    })
  ]);

  return appointment;
}

export async function toggleDocumentRelease(params: {
  workspaceId: string;
  documentId: string;
  actorUserId: string;
  released: boolean;
}) {
  return db.document.update({
    where: { id: params.documentId },
    data: {
      clinicalState: params.released ? "RELEASED_TO_PATIENT" : "SIGNED",
      releasedToPatient: params.released,
      releasedAt: params.released ? new Date() : null,
      releasedById: params.released ? params.actorUserId : null
    }
  });
}

export async function toggleVisitRelease(params: {
  workspaceId: string;
  visitId: string;
  actorUserId: string;
  released: boolean;
  patientSummary?: string | null;
  followUpInstructions?: string | null;
}) {
  return db.visit.update({
    where: { id: params.visitId },
    data: {
      releasedToPatient: params.released,
      releasedAt: params.released ? new Date() : null,
      releasedById: params.released ? params.actorUserId : null,
      patientSummary: params.patientSummary ?? undefined,
      followUpInstructions: params.followUpInstructions ?? undefined,
      reviewedAt: params.released ? new Date() : undefined
    }
  });
}
