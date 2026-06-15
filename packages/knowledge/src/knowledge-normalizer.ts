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

const DEFAULT_SYNONYM_MAP: Record<string, string[]> = {
  build: ['compile', 'transpile', 'bundle', 'package'],
  deploy: ['release', 'publish', 'ship'],
  fail: ['failure', 'error', 'crash', 'broken'],
  test: ['spec', 'test-case', 'integration-test'],
  config: ['configuration', 'setup', 'setting'],
  dependency: ['dep', 'library', 'module'],
  auth: ['authentication', 'login', 'sign-in'],
  api: ['endpoint', 'route', 'service'],
  db: ['database', 'sql', 'persistence'],
  cache: ['redis', 'memcached'],
};

function buildVariantToCanonical(map: Record<string, string[]>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(map)) {
    result.set(canonical, canonical);
    for (const v of variants) {
      result.set(v, canonical);
    }
  }
  return result;
}

export class KnowledgeNormalizer {
  private variantToCanonical: Map<string, string>;

  constructor(dictionary?: Record<string, string[]>) {
    const merged = { ...DEFAULT_SYNONYM_MAP };
    if (dictionary) {
      for (const [canonical, variants] of Object.entries(dictionary)) {
        if (merged[canonical]) {
          merged[canonical] = [...new Set([...merged[canonical], ...variants])];
        } else {
          merged[canonical] = variants;
        }
      }
    }
    this.variantToCanonical = buildVariantToCanonical(merged);
  }

  normalize(text: string): string {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));

    const normalized = words.map(w => this.variantToCanonical.get(w) ?? w);
    return [...new Set(normalized)].sort().join(' ');
  }

  addSynonym(canonical: string, variants: string[]): void {
    this.variantToCanonical.set(canonical, canonical);
    for (const v of variants) {
      this.variantToCanonical.set(v, canonical);
    }
  }

  extend(dictionary: Record<string, string[]>): void {
    for (const [canonical, variants] of Object.entries(dictionary)) {
      this.addSynonym(canonical, variants);
    }
  }
}
