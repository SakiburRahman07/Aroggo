import { addDays, isAfter, isBefore } from "date-fns";
import { hash } from "bcryptjs";
import { type AppointmentStatus, type QrIdentifierType, type Role } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/service";
import { enforceSimpleRateLimit } from "@/lib/security/rate-limit";
import { PATIENT_PORTAL_ROLE } from "@/lib/security/patient-portal";
import { randomPublicId, randomToken, sha256Hex } from "@/lib/security/tokens";

const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PORTAL_INVITE_WINDOW_DAYS = 3;

type ScanActor =
  | { kind: "patient"; userId: string; workspaceId: string; patientId: string }
  | { kind: "staff"; userId: string; role: Role; workspaceId: string };

export function buildScanUrl(publicId: string) {
  return `${portalBaseUrl}/scan/${publicId}`;
}

function buildPortalInviteUrl(token: string) {
  return `${portalBaseUrl}/portal/activate?token=${token}`;
}

async function getScanActor(userId: string, workspaceId: string, patientId: string): Promise<ScanActor | null> {
  const [portalAccount, membership, superAdminMembership] = await Promise.all([
    db.patientPortalAccount.findFirst({
      where: {
        userId,
        workspaceId,
        patientId,
        portalEnabled: true
      }
    }),
    db.membership.findFirst({
      where: {
        userId,
        workspaceId,
        status: "ACTIVE"
      }
    }),
    db.membership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        role: "SUPER_ADMIN"
      }
    })
  ]);

  if (portalAccount) {
    return { kind: "patient", userId, workspaceId, patientId };
  }

  if (membership) {
    return { kind: "staff", userId, role: membership.role, workspaceId };
  }

  if (superAdminMembership) {
    return { kind: "staff", userId, role: "SUPER_ADMIN", workspaceId };
  }

  return null;
}

async function recordQrLog(params: {
  workspaceId: string;
  patientId?: string | null;
  qrIdentifierId?: string | null;
  scannerUserId?: string | null;
  scannerRole: string;
  qrType: QrIdentifierType;
  scanContext: string;
  status: "SUCCESS" | "INVALID" | "EXPIRED" | "REVOKED" | "UNAUTHORIZED" | "RATE_LIMITED";
  destination?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  metadataJson?: Record<string, unknown>;
}) {
  return db.qrScanLog.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: params.patientId ?? null,
      qrIdentifierId: params.qrIdentifierId ?? null,
      scannerUserId: params.scannerUserId ?? null,
      scannerRole: params.scannerRole,
      qrType: params.qrType,
      scanContext: params.scanContext,
      status: params.status,
      destination: params.destination ?? null,
      ipAddress: params.ipAddress ?? null,
      deviceInfo: params.deviceInfo ?? null,
      metadataJson: params.metadataJson as never
    }
  });
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
      portalEnabled: true
    }
  });

  const acceptUrl = buildPortalInviteUrl(rawToken);
  await sendTransactionalEmail({
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
    acceptUrl
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
        portalEnabled: true
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

  return {
    patient,
    portalAccount,
    latestInvite,
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

function getStaffScanDestination(role: Role, workspaceSlug: string, patientId: string) {
  switch (role) {
    case "RECEPTIONIST":
      return `/app/${workspaceSlug}/patients/${patientId}?scan=front-desk`;
    case "DOCTOR":
      return `/app/${workspaceSlug}/patients/${patientId}?scan=clinical`;
    case "LAB_STAFF":
      return `/app/${workspaceSlug}/documents?patientId=${patientId}&scan=lab`;
    case "OPERATIONS_MANAGER":
      return `/app/${workspaceSlug}/patients/${patientId}?scan=operations`;
    case "CLINIC_ADMIN":
      return `/app/${workspaceSlug}/patients/${patientId}?scan=admin`;
    case "SUPER_ADMIN":
      return `/admin/support?patientId=${patientId}&scan=qr`;
    default:
      return `/app/${workspaceSlug}/patients/${patientId}`;
  }
}

export async function resolvePatientQrScan(params: {
  publicId: string;
  userId?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
}) {
  enforceSimpleRateLimit(`qr:${params.ipAddress ?? "anon"}:${params.publicId}`, 20, 60_000);

  const qr = await db.patientQrIdentifier.findFirst({
    where: {
      publicId: params.publicId
    },
    include: {
      patient: {
        include: {
          workspace: true
        }
      }
    }
  });

  if (!qr) {
    throw new Error("QR_INVALID");
  }

  if (qr.revokedAt) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId ?? null,
      scannerRole: "UNKNOWN",
      qrType: qr.qrType,
      scanContext: "scan-page",
      status: "REVOKED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo
    });
    throw new Error("QR_REVOKED");
  }

  if (qr.expiresAt && isAfter(new Date(), qr.expiresAt)) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId ?? null,
      scannerRole: "UNKNOWN",
      qrType: qr.qrType,
      scanContext: "scan-page",
      status: "EXPIRED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo
    });
    throw new Error("QR_EXPIRED");
  }

  if (!params.userId) {
    return {
      redirectTo: `/portal/login?callbackUrl=${encodeURIComponent(`/scan/${params.publicId}`)}`,
      kind: "login_required" as const
    };
  }

  const actor = await getScanActor(params.userId, qr.workspaceId, qr.patientId);

  if (!actor) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId,
      scannerRole: "UNKNOWN",
      qrType: qr.qrType,
      scanContext: "scan-page",
      status: "UNAUTHORIZED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo
    });
    throw new Error("QR_UNAUTHORIZED");
  }

  const redirectTo = actor.kind === "patient"
    ? `/portal/check-in?qr=${params.publicId}`
    : getStaffScanDestination(actor.role, qr.patient.workspace.slug, qr.patientId);

  await db.patientQrIdentifier.update({
    where: { id: qr.id },
    data: { lastUsedAt: new Date() }
  });

  await recordQrLog({
    workspaceId: qr.workspaceId,
    patientId: qr.patientId,
    qrIdentifierId: qr.id,
    scannerUserId: params.userId,
    scannerRole: actor.kind === "patient" ? PATIENT_PORTAL_ROLE : actor.role,
    qrType: qr.qrType,
    scanContext: "scan-page",
    status: "SUCCESS",
    destination: redirectTo,
    ipAddress: params.ipAddress,
    deviceInfo: params.deviceInfo
  });

  return {
    redirectTo,
    kind: actor.kind
  };
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
      followUpInstructions: params.followUpInstructions ?? undefined
    }
  });
}
