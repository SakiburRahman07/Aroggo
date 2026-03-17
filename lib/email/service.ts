import { Resend } from "resend";
import { env } from "@/config/env";
import { db } from "@/lib/db/prisma";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface EmailPayload {
  workspaceId?: string;
  templateKey: string;
  recipient: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export async function sendTransactionalEmail(payload: EmailPayload) {
  const log = await db.emailLog.create({
    data: {
      workspaceId: payload.workspaceId,
      provider: "resend",
      templateKey: payload.templateKey,
      recipient: payload.recipient,
      subject: payload.subject,
      status: "PENDING",
      metadataJson: payload.metadata as never
    }
  });

  if (!resend || !env.RESEND_FROM_EMAIL) {
    await db.emailLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: "Resend is not configured"
      }
    });

    return { ok: false, error: "Resend is not configured" };
  }

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: payload.recipient,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });

    await db.emailLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        sentAt: new Date()
      }
    });

    return { ok: true };
  } catch (error) {
    await db.emailLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown email error"
      }
    });

    return { ok: false, error: error instanceof Error ? error.message : "Unknown email error" };
  }
}
