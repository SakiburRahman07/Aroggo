import { db } from "@/lib/db/prisma";
import { generateStructuredData, generateText, isAiConfigured } from "@/lib/ai/groq";
import { buildVisitVisibilityWhere, type ViewerContext } from "@/lib/security/scopes";
import { noteTaskSuggestionsSchema } from "@/features/ai/validation";
import { getWorkspaceAnalytics } from "@/features/analytics/service";
import { retrieveRelevantChunks } from "@/features/documents/service";
import { createTasksFromSuggestions } from "@/features/tasks/service";

const OPERATIONAL_SUMMARY_CACHE_WINDOW_MS = 15 * 60 * 1000;

type WorkspaceAnalyticsSnapshot = Awaited<ReturnType<typeof getWorkspaceAnalytics>>;

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return value === 1 ? singular : plural;
}

function buildOperationalSummaryFallback(analytics: WorkspaceAnalyticsSnapshot) {
  const noShows = analytics.appointmentStatusDistribution.find((item) => item.status === "NO_SHOW")?._count ?? 0;
  const pendingUploads = analytics.processingDistribution.reduce((total, item) => {
    return item.processingStatus === "READY" ? total : total + item._count;
  }, 0);
  const busiestDoctor = [...analytics.doctorWorkload].sort((left, right) => right.appointmentsToday - left.appointmentsToday)[0];
  const priorities = [
    analytics.overdueTasks > 0 ? `${analytics.overdueTasks} overdue ${pluralize(analytics.overdueTasks, "task")}` : null,
    analytics.followUps > 0 ? `${analytics.followUps} ${pluralize(analytics.followUps, "follow-up")} due within 7 days` : null,
    pendingUploads > 0 ? `${pendingUploads} uploaded ${pluralize(pendingUploads, "document")} still processing` : null
  ].filter(Boolean);

  return [
    `Today shows ${analytics.appointmentsToday} scheduled ${pluralize(analytics.appointmentsToday, "appointment")}.`,
    priorities.length > 0 ? `Priority focus: ${priorities.join(", ")}.` : "No major operational blockers stand out right now.",
    noShows > 0 ? `${noShows} ${pluralize(noShows, "no-show")} appear in the current appointment status mix.` : null,
    busiestDoctor ? `${busiestDoctor.name} has the heaviest booked load today with ${busiestDoctor.appointmentsToday} ${pluralize(busiestDoctor.appointmentsToday, "appointment")}.` : null,
    `Recent uploads tracked: ${analytics.recentUploads.length}. AI actions recorded today: ${analytics.aiUsage}.`
  ]
    .filter(Boolean)
    .join(" ");
}

async function getCachedOperationalSummary(workspaceId: string, createdAfter?: Date) {
  return db.aIQuery.findFirst({
    where: {
      workspaceId,
      queryType: "OPERATIONAL_SUMMARY",
      responseSummary: { not: null },
      ...(createdAfter ? { createdAt: { gte: createdAfter } } : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      responseSummary: true
    }
  });
}

export async function answerGroundedQuestion(params: {
  workspaceId: string;
  userId: string;
  viewer: ViewerContext;
  question: string;
  patientId?: string;
}) {
  const chunks = await retrieveRelevantChunks(params.workspaceId, params.question, params.viewer, params.patientId);
  const context = chunks.map((chunk, index) => `Source ${index + 1} (${chunk.document.title}): ${chunk.content}`).join("\n\n");

  const fallback = context
    ? `Relevant records were found. Review these source snippets:\n\n${context.slice(0, 1000)}`
    : "No strongly relevant document chunks were found in the current workspace scope.";

  const answer = isAiConfigured()
    ? await generateText(
        `Answer the question using only the provided clinic document context. If the context is insufficient, say so. Avoid diagnosis framing.\n\nQuestion: ${params.question}\n\nContext:\n${context || "No context found."}`
      )
    : { text: fallback, usage: null };

  const query = await db.aIQuery.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      patientId: params.patientId || null,
      queryType: "GROUNDED_QA",
      prompt: params.question,
      responseSummary: answer.text,
      tokenUsage: answer.usage as never,
      metadataJson: {
        sources: chunks.map((chunk) => ({
          documentId: chunk.documentId,
          documentTitle: chunk.document.title,
          chunkIndex: chunk.chunkIndex
        }))
      } as never
    }
  });

  return query;
}

export async function generateVisitDraft(workspaceId: string, userId: string, visitId: string, viewer: ViewerContext) {
  const visit = await db.visit.findFirst({
    where: {
      AND: [buildVisitVisibilityWhere(workspaceId, viewer), { id: visitId }]
    },
    include: {
      patient: true,
      doctor: {
        include: { profile: true }
      }
    }
  });

  if (!visit) {
    throw new Error("Visit not found.");
  }

  const draft = isAiConfigured()
    ? await generateText(
        `Create an editable visit note draft for operational documentation review. Do not provide diagnosis recommendations.\n\nPatient: ${visit.patient.fullName}\nSymptoms: ${visit.symptoms ?? "n/a"}\nObservations: ${visit.observations ?? "n/a"}\nExisting diagnosis note: ${visit.diagnosisNote ?? "n/a"}`
      )
    : {
        text: `Draft visit note\n\nPatient: ${visit.patient.fullName}\nSymptoms: ${visit.symptoms ?? "Pending input"}\nObservations: ${visit.observations ?? "Pending input"}\nAssessment notes: Review required before finalizing.`,
        usage: null
      };

  await db.aIQuery.create({
    data: {
      workspaceId,
      userId,
      patientId: visit.patientId,
      queryType: "VISIT_DRAFT",
      prompt: `Generate visit draft for ${visit.id}`,
      responseSummary: draft.text,
      tokenUsage: draft.usage as never
    }
  });

  return draft.text;
}

export async function generateMeetingTasks(params: {
  workspaceId: string;
  userId: string;
  note: string;
}) {
  const fallback = {
    summary: "Review the internal note and confirm the suggested operational follow-ups.",
    tasks: params.note
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((line) => ({ title: line, priority: "MEDIUM" as const }))
  };

  const parsed = isAiConfigured()
    ? await generateStructuredData<{
        summary: string;
        tasks: Array<{ title: string; description?: string; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueAt?: string }>;
      }>(`Summarize the meeting or internal note and extract actionable clinic operations tasks. Return JSON with summary and tasks.\n\n${params.note}`)
    : { data: fallback, usage: null };

  const normalized = noteTaskSuggestionsSchema.parse(parsed.data);
  const query = await db.aIQuery.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      queryType: "NOTE_TO_TASKS",
      prompt: params.note,
      responseSummary: normalized.summary,
      tokenUsage: parsed.usage as never,
      metadataJson: normalized as never
    }
  });

  return query;
}

export async function confirmMeetingTasks(workspaceId: string, userId: string, aiQueryId: string) {
  const query = await db.aIQuery.findFirst({
    where: {
      id: aiQueryId,
      workspaceId,
      userId,
      queryType: "NOTE_TO_TASKS"
    }
  });

  if (!query?.metadataJson || typeof query.metadataJson !== "object") {
    throw new Error("No task suggestions found.");
  }

  const data = noteTaskSuggestionsSchema.parse(query.metadataJson);
  return createTasksFromSuggestions(workspaceId, userId, data.tasks);
}

export async function generateOperationalSummary(
  workspaceId: string,
  userId: string,
  analyticsInput?: WorkspaceAnalyticsSnapshot
) {
  const analytics = analyticsInput ?? (await getWorkspaceAnalytics(workspaceId));
  const fallback = buildOperationalSummaryFallback(analytics);
  const recentCached = await getCachedOperationalSummary(workspaceId, new Date(Date.now() - OPERATIONAL_SUMMARY_CACHE_WINDOW_MS));

  if (recentCached?.responseSummary) {
    return recentCached.responseSummary;
  }

  if (!isAiConfigured()) {
    return fallback;
  }

  try {
    const result = await generateText(
      `Create a concise operations summary for a clinic manager based on the following metrics. Highlight priorities, risks, pending work, and workload concentration. Keep it to 3 or 4 sentences. Avoid diagnosis framing.\n\n${JSON.stringify(analytics)}`
    );
    const summary = result.text.trim() || fallback;

    await db.aIQuery.create({
      data: {
        workspaceId,
        userId,
        queryType: "OPERATIONAL_SUMMARY",
        prompt: "Generate operational summary",
        responseSummary: summary,
        tokenUsage: result.usage as never
      }
    });

    return summary;
  } catch {
    const previousSummary = await getCachedOperationalSummary(workspaceId);
    return previousSummary?.responseSummary ?? fallback;
  }
}