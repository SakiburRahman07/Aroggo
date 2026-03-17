import pdfParse from "pdf-parse";
import { db } from "@/lib/db/prisma";
import { chunkText, scoreChunk } from "@/lib/ai/chunking";
import { generateStructuredData, generateText, isAiConfigured } from "@/lib/ai/gemini";
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

async function summarizeDocument(title: string, extractedText: string) {
  if (!extractedText) {
    return null;
  }

  if (!isAiConfigured()) {
    return `${title}: ${extractedText.slice(0, 320)}${extractedText.length > 320 ? "..." : ""}`;
  }

  const result = await generateText(`Summarize the following clinic document for operations and documentation review. Avoid diagnosis framing.\n\nTitle: ${title}\n\n${extractedText}`);
  return result.text;
}

async function extractStructuredDataFromText(extractedText: string) {
  if (!extractedText) {
    return null;
  }

  if (!isAiConfigured()) {
    return null;
  }

  const result = await generateStructuredData<{
    patientName?: string;
    reportDate?: string;
    labName?: string;
    doctorName?: string;
    tests?: Array<{ name: string; result?: string; abnormal?: boolean }>;
  }>(`Extract the clinic document metadata and key test data from the content below.\n\n${extractedText}`);

  return structuredExtractionSchema.parse(result.data);
}

export async function listDocuments(workspaceId: string) {
  return db.document.findMany({
    where: { workspaceId },
    include: {
      patient: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getDocumentDetail(workspaceId: string, documentId: string) {
  const document = await db.document.findFirst({
    where: {
      id: documentId,
      workspaceId
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

  try {
    const signedUrl = await createSignedDocumentUrl(document.storagePath);
    return {
      ...document,
      signedUrl
    };
  } catch {
    return {
      ...document,
      signedUrl: null
    };
  }
}

export async function uploadAndProcessDocument(params: {
  workspaceId: string;
  userId: string;
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
    const summary = await summarizeDocument(data.title, extractedText);
    const extractedJson = await extractStructuredDataFromText(extractedText);
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

export async function retrieveRelevantChunks(workspaceId: string, question: string, patientId?: string) {
  const chunks = await db.documentChunk.findMany({
    where: {
      workspaceId,
      patientId: patientId || undefined
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
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 6)
    .filter((item) => item.relevance > 0 || item.chunkIndex < 2);
}

