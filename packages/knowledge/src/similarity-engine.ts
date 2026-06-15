import type { Document, SimilarityMatch } from './types.js';
import type { SimilarityProvider } from './providers.js';

const STOP_WORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are','as','at','be',
  'because','been','before','being','below','between','both','but','by','can','did','do','does',
  'doing','don','down','during','each','few','for','from','further','had','has','have','having',
  'he','her','here','hers','herself','him','himself','his','how','i','if','in','into','is','it',
  'its','itself','just','me','more','most','my','myself','no','nor','not','now','of','on','once',
  'only','or','other','our','ours','ourselves','out','over','own','per','same','she','should',
  'so','some','such','than','that','the','their','theirs','them','themselves','then','there',
  'these','they','this','those','through','to','too','under','until','up','very','was','we',
  'were','what','when','where','which','while','who','why','will','with','you','your','yours',
  'yourself','yourselves','would','could','may','might','shall','need','dare','ought','used',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

export class SimilarityEngine implements SimilarityProvider {
  private termFreqs: Map<string, Map<string, number>> = new Map();
  private docLengths: Map<string, number> = new Map();
  private docMeta: Map<string, Document> = new Map();
  private numDocs = 0;

  private readonly k1 = 1.5;
  private readonly b = 0.75;

  indexDocument(doc: Document): void {
    const tokens = tokenize(doc.text);
    const freqs = new Map<string, number>();

    for (const t of tokens) {
      freqs.set(t, (freqs.get(t) ?? 0) + 1);
    }

    for (const [term, count] of freqs) {
      let postings = this.termFreqs.get(term);
      if (!postings) {
        postings = new Map();
        this.termFreqs.set(term, postings);
      }
      postings.set(doc.id, count);
    }

    this.docLengths.set(doc.id, tokens.length);
    this.docMeta.set(doc.id, doc);
    this.numDocs++;
  }

  indexDocuments(docs: Document[]): void {
    for (const doc of docs) {
      this.indexDocument(doc);
    }
  }

  removeDocument(id: string): void {
    this.docMeta.delete(id);
    this.docLengths.delete(id);

    for (const postings of this.termFreqs.values()) {
      postings.delete(id);
    }

    this.numDocs = this.docMeta.size;
  }

  search(query: string, topK = 5): SimilarityMatch[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const avgDocLen = avg(Array.from(this.docLengths.values()));
    if (avgDocLen === 0) return [];

    const candidates = new Map<string, number>();

    for (const term of queryTokens) {
      const postings = this.termFreqs.get(term);
      if (!postings) continue;

      const idf = Math.log((this.numDocs - postings.size + 0.5) / (postings.size + 0.5) + 1);
      if (idf <= 0) continue;

      for (const [docId, tf] of postings) {
        const docLen = this.docLengths.get(docId) ?? 0;
        const score = idf * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * (docLen / avgDocLen))));
        candidates.set(docId, (candidates.get(docId) ?? 0) + score);
      }
    }

    const sorted = Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    return sorted.map(([docId, score]) => {
      const meta = this.docMeta.get(docId)!;
      return {
        id: docId,
        text: meta.text,
        score: Math.round(score * 10000) / 10000,
        source: meta.source,
        projectId: meta.projectId,
        manifestId: meta.manifestId,
      };
    });
  }

  clear(): void {
    this.termFreqs.clear();
    this.docLengths.clear();
    this.docMeta.clear();
    this.numDocs = 0;
  }

  get stats(): { documents: number; terms: number } {
    return {
      documents: this.numDocs,
      terms: this.termFreqs.size,
    };
  }
}
