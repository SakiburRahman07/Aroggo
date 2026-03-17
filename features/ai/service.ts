import { db } from "@/lib/db/prisma";
import { generateStructuredData, generateText, isAiConfigured } from "@/lib/ai/gemini";
import { noteTaskSuggestionsSchema } from "@/features/ai/validation";
import { getWorkspaceAnalytics } from "@/features/analytics/service";
import { retrieveRelevantChunks } from "@/features/documents/service";
import { createTasksFromSuggestions } from "@/features/tasks/service";

export async function answerGroundedQuestion(params: {
  workspaceId: string;
  userId: string;
  question: string;
  patientId?: string;
}) {
  const chunks = await retrieveRelevantChunks(params.workspaceId, params.question, params.patientId);
  const context = chunks
    .map((chunk, index) => `Source ${index + 1} (${chunk.document.title}): ${chunk.content}`)
    .join("\n\n");

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

export async function generateVisitDraft(workspaceId: string, userId: string, visitId: string) {
  const visit = await db.visit.findFirst({
    where: {
      id: visitId,
      workspaceId
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

export async function generateOperationalSummary(workspaceId: string, userId: string) {
  const analytics = await getWorkspaceAnalytics(workspaceId);
  const deterministic = `Appointments today: ${analytics.appointmentsToday}. Overdue tasks: ${analytics.overdueTasks}. Follow-up backlog in the next 7 days: ${analytics.followUps}. Recent uploads: ${analytics.recentUploads.length}. AI queries today: ${analytics.aiUsage}.`;

  const result = isAiConfigured()
    ? await generateText(
        `Create a concise operations summary for a clinic manager based on the following metrics. Highlight priorities, risks, and pending work. Avoid diagnosis framing.\n\n${JSON.stringify(analytics)}`
      )
    : { text: deterministic, usage: null };

  await db.aIQuery.create({
    data: {
      workspaceId,
      userId,
      queryType: "OPERATIONAL_SUMMARY",
      prompt: "Generate operational summary",
      responseSummary: result.text,
      tokenUsage: result.usage as never
    }
  });

  return result.text;
}

