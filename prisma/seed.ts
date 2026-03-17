import { hash } from "bcryptjs";
import { db } from "../lib/db/prisma";

function getSeedConnectionHint() {
  const activeDatabaseUrl = process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

  if (!activeDatabaseUrl) {
    return "Set DATABASE_URL, or PRISMA_DATABASE_URL for a seed-only override, to a valid PostgreSQL connection string before running the seed.";
  }

  try {
    const parsed = new URL(activeDatabaseUrl);
    const isSupabaseDirectHost =
      parsed.hostname.startsWith("db.") &&
      parsed.hostname.endsWith(".supabase.co") &&
      (parsed.port === "" || parsed.port === "5432");

    if (isSupabaseDirectHost) {
      return [
        "The seed is trying to use Supabase's direct Postgres host on port 5432.",
        "That host is often unreachable on networks without working IPv6 or where direct Postgres traffic is blocked.",
        "Set DATABASE_URL to the Supabase pooled connection string on port 6543 for app runtime and seeding.",
        "Keep DIRECT_URL on the direct Postgres connection string on port 5432 for Prisma migrations.",
        "If you only want to override the seed without changing the rest of the app, set PRISMA_DATABASE_URL to the pooled URI before running `pnpm prisma:seed`."
      ].join("\n");
    }
  } catch {
    return "Check DATABASE_URL or PRISMA_DATABASE_URL. It must start with postgresql:// or postgres:// and be URL-encoded if the password contains special characters.";
  }

  return [
    "Check that the database host, port, password, and SSL options are correct.",
    "For Supabase, DATABASE_URL should usually be the pooled URI and DIRECT_URL should stay on the direct URI."
  ].join("\n");
}

async function main() {
  const passwordHash = await hash("DemoPass123!", 12);

  await db.taskComment.deleteMany();
  await db.appointmentCheckInEvent.deleteMany();
  await db.qrScanLog.deleteMany();
  await db.patientQrIdentifier.deleteMany();
  await db.patientProfileUpdateRequest.deleteMany();
  await db.patientPortalInvite.deleteMany();
  await db.patientPortalAccount.deleteMany();
  await db.task.deleteMany();
  await db.documentChunk.deleteMany();
  await db.document.deleteMany();
  await db.visit.deleteMany();
  await db.appointment.deleteMany();
  await db.notification.deleteMany();
  await db.emailLog.deleteMany();
  await db.aIQuery.deleteMany();
  await db.auditLog.deleteMany();
  await db.membership.deleteMany();
  await db.workspaceInvite.deleteMany();
  await db.department.deleteMany();
  await db.patient.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.profile.deleteMany();
  await db.workspace.deleteMany();
  await db.user.deleteMany();

  const [admin, doctor, receptionist, labStaff, operations, patientPortalUser] = await Promise.all([
    db.user.create({
      data: {
        email: "admin@demo.opspilot.health",
        name: "Ava Rahman",
        passwordHash,
        profile: { create: { fullName: "Ava Rahman" } }
      }
    }),
    db.user.create({
      data: {
        email: "doctor@demo.opspilot.health",
        name: "Dr. Omar Hasan",
        passwordHash,
        profile: { create: { fullName: "Dr. Omar Hasan" } }
      }
    }),
    db.user.create({
      data: {
        email: "reception@demo.opspilot.health",
        name: "Nadia Karim",
        passwordHash,
        profile: { create: { fullName: "Nadia Karim" } }
      }
    }),
    db.user.create({
      data: {
        email: "lab@demo.opspilot.health",
        name: "Farhan Iqbal",
        passwordHash,
        profile: { create: { fullName: "Farhan Iqbal" } }
      }
    }),
    db.user.create({
      data: {
        email: "ops@demo.opspilot.health",
        name: "Mina Sultana",
        passwordHash,
        profile: { create: { fullName: "Mina Sultana" } }
      }
    }),
    db.user.create({
      data: {
        email: "mahin.portal@example.com",
        name: "Mahin Chowdhury",
        passwordHash,
        profile: { create: { fullName: "Mahin Chowdhury" } }
      }
    })
  ]);

  const workspace = await db.workspace.create({
    data: {
      name: "North Avenue Family Care",
      slug: "north-avenue-family-care",
      timezone: "Asia/Dhaka",
      createdById: admin.id,
      settingsJson: {
        aiDraftsRequireReview: true,
        remindersEnabled: true
      }
    }
  });

  const [administration, clinical, laboratory, opsDepartment] = await Promise.all([
    db.department.create({ data: { workspaceId: workspace.id, name: "Administration", description: "Front desk and reception operations" } }),
    db.department.create({ data: { workspaceId: workspace.id, name: "Clinical", description: "Doctors and clinical delivery" } }),
    db.department.create({ data: { workspaceId: workspace.id, name: "Laboratory", description: "Lab processing and reporting" } }),
    db.department.create({ data: { workspaceId: workspace.id, name: "Operations", description: "Operational leadership and planning" } })
  ]);

  await db.membership.createMany({
    data: [
      { workspaceId: workspace.id, userId: admin.id, role: "CLINIC_ADMIN", status: "ACTIVE", departmentId: administration.id },
      { workspaceId: workspace.id, userId: doctor.id, role: "DOCTOR", status: "ACTIVE", departmentId: clinical.id },
      { workspaceId: workspace.id, userId: receptionist.id, role: "RECEPTIONIST", status: "ACTIVE", departmentId: administration.id },
      { workspaceId: workspace.id, userId: labStaff.id, role: "LAB_STAFF", status: "ACTIVE", departmentId: laboratory.id },
      { workspaceId: workspace.id, userId: operations.id, role: "OPERATIONS_MANAGER", status: "ACTIVE", departmentId: opsDepartment.id }
    ]
  });

  const [patientA, patientB] = await Promise.all([
    db.patient.create({
      data: {
        workspaceId: workspace.id,
        patientCode: "PAT-00001",
        fullName: "Mahin Chowdhury",
        dob: new Date("1992-05-12"),
        gender: "MALE",
        phone: "+8801700000001",
        email: "mahin@example.com",
        address: "Dhanmondi, Dhaka",
        emergencyContact: "+8801700000099",
        notes: "Recurring follow-up for blood pressure review.",
        portalEnabled: true,
        createdById: receptionist.id
      }
    }),
    db.patient.create({
      data: {
        workspaceId: workspace.id,
        patientCode: "PAT-00002",
        fullName: "Sara Jahan",
        dob: new Date("1988-10-22"),
        gender: "FEMALE",
        phone: "+8801700000002",
        email: "sara@example.com",
        address: "Banani, Dhaka",
        emergencyContact: "+8801700000088",
        notes: "Upload recent lab reports before appointment.",
        createdById: receptionist.id
      }
    })
  ]);

  const appointment = await db.appointment.create({
    data: {
      workspaceId: workspace.id,
      patientId: patientA.id,
      doctorUserId: doctor.id,
      scheduledAt: new Date(),
      durationMinutes: 30,
      reason: "Follow-up consultation",
      status: "CONFIRMED",
      createdById: receptionist.id,
      notes: "Patient requested updated prescription review."
    }
  });

  const visit = await db.visit.create({
    data: {
      workspaceId: workspace.id,
      patientId: patientA.id,
      appointmentId: appointment.id,
      doctorUserId: doctor.id,
      status: "DRAFT",
      symptoms: "Headache and mild dizziness over the last two days.",
      observations: "Blood pressure reading pending confirmation.",
      aiDraft: "Draft visit summary pending clinician review.",
      patientSummary: "Your blood pressure follow-up was reviewed and no urgent concern was identified.",
      followUpInstructions: "Continue home monitoring and return for your follow-up in two weeks.",
      releasedToPatient: true,
      releasedAt: new Date(),
      releasedById: doctor.id,
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
    }
  });

  const document = await db.document.create({
    data: {
      workspaceId: workspace.id,
      patientId: patientB.id,
      uploadedById: labStaff.id,
      title: "CBC Report - March Follow-up",
      docType: "LAB_REPORT",
      mimeType: "text/plain",
      storagePath: `${workspace.id}/demo-cbc-report.txt`,
      processingStatus: "READY",
      extractedText: "CBC panel completed. Hemoglobin stable. WBC slightly elevated. Recommend clinician review with prior report.",
      summary: "CBC report processed and ready for follow-up review.",
      releasedToPatient: true,
      releasedAt: new Date(),
      releasedById: labStaff.id,
      extractedJson: {
        patientName: patientB.fullName,
        labName: "North Avenue Lab",
        tests: [
          { name: "Hemoglobin", result: "12.8 g/dL", abnormal: false },
          { name: "WBC", result: "11.4 x10^9/L", abnormal: true }
        ]
      }
    }
  });

  await db.documentChunk.createMany({
    data: [
      {
        documentId: document.id,
        workspaceId: workspace.id,
        patientId: patientB.id,
        chunkIndex: 0,
        content: "CBC panel completed. Hemoglobin stable. WBC slightly elevated.",
        metadataJson: { start: 0, end: 70 } as never
      },
      {
        documentId: document.id,
        workspaceId: workspace.id,
        patientId: patientB.id,
        chunkIndex: 1,
        content: "Recommend clinician review with prior report before follow-up.",
        metadataJson: { start: 71, end: 135 } as never
      }
    ]
  });

  const task = await db.task.create({
    data: {
      workspaceId: workspace.id,
      patientId: patientA.id,
      appointmentId: appointment.id,
      title: "Confirm follow-up blood pressure reading",
      description: "Front desk should confirm the home reading the patient mentioned before the doctor review.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeUserId: receptionist.id,
      createdById: admin.id,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });

  await db.taskComment.create({
    data: {
      taskId: task.id,
      userId: operations.id,
      content: "Coordinate with reception and attach the note to the appointment before 2 PM."
    }
  });

  await db.patientPortalAccount.create({
    data: {
      patientId: patientA.id,
      userId: patientPortalUser.id,
      workspaceId: workspace.id,
      portalEnabled: true,
      activatedAt: new Date(),
      qrPublicId: "demo-qr-public-id"
    }
  });

  await db.patientQrIdentifier.create({
    data: {
      workspaceId: workspace.id,
      patientId: patientA.id,
      publicId: "ptid_demo_mahin",
      qrType: "PERMANENT_IDENTITY",
      createdById: receptionist.id
    }
  });

  await db.notification.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: receptionist.id,
        type: "TASK_ASSIGNED",
        title: "New follow-up task assigned",
        body: task.title
      },
      {
        workspaceId: workspace.id,
        userId: labStaff.id,
        type: "DOCUMENT_PROCESSED",
        title: "Document processed",
        body: "CBC Report - March Follow-up is ready for review."
      },
      {
        workspaceId: workspace.id,
        userId: patientPortalUser.id,
        type: "APPOINTMENT_REMINDER",
        title: "Portal ready",
        body: "Your patient portal is active and your appointment is still confirmed."
      }
    ]
  });

  await db.aIQuery.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: admin.id,
        queryType: "OPERATIONAL_SUMMARY",
        prompt: "Generate operational summary",
        responseSummary: "Appointments are flowing normally, but follow-up capture should be tightened for the afternoon block."
      },
      {
        workspaceId: workspace.id,
        userId: doctor.id,
        patientId: patientB.id,
        queryType: "GROUNDED_QA",
        prompt: "What stands out in Sara's recent lab report?",
        responseSummary: "The stored report notes slightly elevated WBC and recommends clinician review with the prior report."
      }
    ]
  });

  console.log("Seed complete.");
  console.log("Demo admin login: admin@demo.opspilot.health / DemoPass123!");
  console.log("Demo patient portal login: mahin.portal@example.com / DemoPass123!");
}

main()
  .catch((error: unknown) => {
    console.error(error);

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Can't reach database server") || message.includes("Error validating datasource")) {
      console.error("\nSeed connection hint:");
      console.error(getSeedConnectionHint());
    }

    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });