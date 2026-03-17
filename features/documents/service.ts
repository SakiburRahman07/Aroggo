import pdfParse from "pdf-parse";
import { type Role } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { chunkText, scoreChunk } from "@/lib/ai/chunking";
import { generateStructuredData, generateText, isAiConfigured } from "@/lib/ai/groq";
import {
  buildDocumentVisibilityWhere,
  canUploadDocumentType,
  getScopedDocumentAccess,
  type ViewerContext
} from "@/lib/security/scopes";
import { uploadDocumentBuffer, createSignedDocumentUrl } from "@/lib/storage/supabase";
import { structuredExtractionSchema, documentUploadSchema } from "@/features/documents/validation";

async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const pdf = await pdfParse(buffer);
    return pdf.text.trim();
  }

  if (file.type.startsWith("text/") || file.type === "application/json") {
    return await file.text();
  }

  return "";
}

function buildDocumentSummaryFallback(title: string, extractedText: string) {
  return `${title}: ${extractedText.slice(0, 320)}${extractedText.length > 320 ? "..." : ""}`;
}

async function summarizeDocument(title: string, extractedText: string) {
  if (!extractedText) {
    return null;
  }

  const fallback = buildDocumentSummaryFallback(title, extractedText);

  if (!isAiConfigured()) {
    return fallback;
  }

  try {
    const result = await generateText(
      `Summarize the following clinic document for operations and documentation review. Avoid diagnosis framing.\n\nTitle: ${title}\n\n${extractedText}`
    );
    return result.text || fallback;
  } catch {
    return fallback;
  }
}

async function extractStructuredDataFromText(extractedText: string) {
  if (!extractedText || !isAiConfigured()) {
    return null;
  }

  try {
    const result = await generateStructuredData<{
      patientName?: string;
      reportDate?: string;
      labName?: string;
      doctorName?: string;
      tests?: Array<{ name: string; result?: string; abnormal?: boolean }>;
    }>(`Extract the clinic document metadata and key test data from the content below.\n\n${extractedText}`);

    return structuredExtractionSchema.parse(result.data);
  } catch {
    return null;
  }
}

export async function listDocuments(workspaceId: string, viewer: ViewerContext) {
  return db.document.findMany({
    where: buildDocumentVisibilityWhere(workspaceId, viewer),
    include: {
      patient: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getDocumentDetail(workspaceId: string, documentId: string, viewer: ViewerContext) {
  const documentAccess = getScopedDocumentAccess(viewer.role);
  const document = await db.document.findFirst({
    where: {
      AND: [buildDocumentVisibilityWhere(workspaceId, viewer), { id: documentId }]
    },
    include: {
      patient: true,
      uploadedBy: {
        include: { profile: true }
      },
      chunks: {
        orderBy: { chunkIndex: "asc" }
      }
    }
  });

  if (!document) {
    return null;
  }

  const sanitizedDocument = {
    ...document,
    extractedText: documentAccess.showRawText ? document.extractedText : null,
    extractedJson: documentAccess.showStructuredExtraction ? document.extractedJson : null,
    chunks: documentAccess.showRawText ? document.chunks : []
  };

  try {
    const signedUrl = await createSignedDocumentUrl(document.storagePath);
    return {
      ...sanitizedDocument,
      signedUrl
    };
  } catch {
    return {
      ...sanitizedDocument,
      signedUrl: null
    };
  }
}

export async function uploadAndProcessDocument(params: {
  workspaceId: string;
  userId: string;
  role: Role;
  formData: FormData;
}) {
  const file = params.formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A document file is required.");
  }

  const data = documentUploadSchema.parse({
    title: params.formData.get("title"),
    docType: params.formData.get("docType"),
    patientId: params.formData.get("patientId") || undefined
  });

  if (!canUploadDocumentType(params.role, data.docType)) {
    throw new Error("Your role cannot upload this document type.");
  }

  const storagePath = `${params.workspaceId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const document = await db.document.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: data.patientId || null,
      uploadedById: params.userId,
      title: data.title,
      docType: data.docType,
      mimeType: file.type,
      storagePath,
      processingStatus: "PROCESSING"
    }
  });

  try {
    await uploadDocumentBuffer(storagePath, file);
    const extractedText = await extractTextFromFile(file);
    const [summary, extractedJson] = await Promise.all([
      summarizeDocument(data.title, extractedText),
      extractStructuredDataFromText(extractedText)
    ]);
    const chunks = chunkText(extractedText);

    await db.$transaction([
      db.document.update({
        where: { id: document.id },
        data: {
          extractedText: extractedText || null,
          summary,
          extractedJson: extractedJson as never,
          processingStatus: "READY"
        }
      }),
      db.documentChunk.deleteMany({
        where: { documentId: document.id }
      }),
      db.documentChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId: document.id,
          workspaceId: params.workspaceId,
          patientId: data.patientId || null,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadataJson: chunk.metadata as never
        }))
      })
    ]);

    return document.id;
  } catch (error) {
    await db.document.update({
      where: { id: document.id },
      data: {
        processingStatus: "FAILED",
        processingError: error instanceof Error ? error.message : "Unknown document processing error"
      }
    });

    throw error;
  }
}

export async function retrieveRelevantChunks(workspaceId: string, question: string, viewer: ViewerContext, patientId?: string) {
  const chunks = await db.documentChunk.findMany({
    where: {
      workspaceId,
      ...(patientId ? { patientId } : {}),
      document: buildDocumentVisibilityWhere(workspaceId, viewer, patientId)
    },
    include: {
      document: true
    },
    take: 100
  });

  return chunks
    .map((chunk) => ({
      ...chunk,
      relevance: scoreChunk(question, chunk.content)
    }))
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 6)
    .filter((item) => item.relevance > 0 || item.chunkIndex < 2);
}