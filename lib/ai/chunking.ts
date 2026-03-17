export interface ChunkResult {
  chunkIndex: number;
  content: string;
  metadata: {
    start: number;
    end: number;
  };
}

export function chunkText(text: string, size = 1200, overlap = 180): ChunkResult[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const chunks: ChunkResult[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + size);
    chunks.push({
      chunkIndex: index,
      content: normalized.slice(start, end),
      metadata: { start, end }
    });

    start = Math.max(end - overlap, end);
    index += 1;
  }

  return chunks;
}

export function scoreChunk(query: string, content: string) {
  const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);
  const normalized = content.toLowerCase();

  return queryTerms.reduce((score, term) => {
    if (normalized.includes(term)) {
      return score + 1;
    }

    return score;
  }, 0);
}
