import type { KnowledgeEntry, ConsolidatedEntry, ConsolidationReport, ConsolidationConfig, SourceRef, SourceRefType } from './types.js';
import { KnowledgeNormalizer } from './knowledge-normalizer.js';
import { DuplicateDetector } from './duplicate-detector.js';
import { KnowledgeClusterer } from './knowledge-clusterer.js';
import { ConsolidatedStore } from './consolidated-store.js';
import type { SemanticRetriever } from '@apex/semantic';

export interface ConsolidationOptions {
  useSemantic?: boolean;
  retriever?: SemanticRetriever;
}

function buildSourceRef(entry: KnowledgeEntry): SourceRef {
  const typeMap: Record<string, SourceRefType> = {
    manifest: 'lesson',
    review: 'review',
    manual: 'lesson',
    retrospective: 'retrospective',
    pattern: 'pattern',
  };
  return {
    id: entry.id,
    type: typeMap[entry.source] ?? 'lesson',
  };
}

export class KnowledgeConsolidator {
  normalizer: KnowledgeNormalizer;
  detector: DuplicateDetector;
  clusterer: KnowledgeClusterer;
  store: ConsolidatedStore;
  config: ConsolidationConfig;

  constructor(config?: Partial<ConsolidationConfig>) {
    this.normalizer = new KnowledgeNormalizer();
    this.detector = new DuplicateDetector(this.normalizer);
    this.clusterer = new KnowledgeClusterer();
    this.store = new ConsolidatedStore();
    this.config = {
      enabled: config?.enabled ?? false,
      autoConsolidateOnIngest: config?.autoConsolidateOnIngest ?? false,
      keywordThreshold: config?.keywordThreshold ?? 0.7,
      semanticThreshold: config?.semanticThreshold ?? 0.85,
    };
  }

  async consolidate(
    entries: KnowledgeEntry[],
    options?: ConsolidationOptions,
  ): Promise<ConsolidationReport> {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        duplicatesFound: 0,
        clustersCreated: 0,
        consolidatedCreated: 0,
        methods: [],
      };
    }

    const methods: string[] = [];

    const keywordDups = this.detector.detect(entries, this.config.keywordThreshold);
    methods.push('keyword');

    let allDups = [...keywordDups];

    if (options?.useSemantic && options?.retriever) {
      const semanticDups = await this.detector.detectSemantic(
        entries,
        options.retriever,
        this.config.semanticThreshold,
      );

      const seen = new Set<string>();
      for (const dup of semanticDups) {
        const key = `${dup.keptId}:${dup.mergedId}`;
        const revKey = `${dup.mergedId}:${dup.keptId}`;
        const exists = allDups.some(
          d => `${d.keptId}:${d.mergedId}` === key || `${d.keptId}:${d.mergedId}` === revKey,
        );
        if (!exists) {
          allDups.push(dup);
        }
      }
      methods.push('semantic');
    }

    const clusters = this.clusterer.cluster(entries, allDups);

    const entryMap = new Map(entries.map(e => [e.id, e]));
    const clusterRefs = new Map<string, string[]>();
    for (const cluster of clusters) {
      for (const id of cluster.memberIds) {
        clusterRefs.set(id, [...(clusterRefs.get(id) ?? []), cluster.id]);
      }
    }

    const processedIds = new Set<string>();
    const created: ConsolidatedEntry[] = [];

    for (const cluster of clusters) {
      const members = cluster.memberIds
        .map(id => entryMap.get(id))
        .filter(Boolean) as KnowledgeEntry[];

      const canonicalText = members.reduce((best, e) => e.summary.length > best.length ? e.summary : best, '');

      const sources = members.map(buildSourceRef);
      const projectIds = [...new Set(members.map(e => e.projectId).filter(Boolean))] as string[];
      const manifestIds = [...new Set(members.map(e => e.manifestId).filter(Boolean))] as string[];
      const tags = [...new Set(members.flatMap(e => e.tags))];

      const consolidated = this.store.add({
        canonicalText,
        sources,
        projectIds,
        manifestIds,
        tags,
        frequency: members.length,
        clusterId: cluster.id,
      });

      for (const member of members) {
        processedIds.add(member.id);
      }

      created.push(consolidated);
    }

    const unclustered = entries.filter(e => !processedIds.has(e.id));
    for (const entry of unclustered) {
      const consolidated = this.store.add({
        canonicalText: entry.summary,
        sources: [buildSourceRef(entry)],
        projectIds: entry.projectId ? [entry.projectId] : [],
        manifestIds: entry.manifestId ? [entry.manifestId] : [],
        tags: entry.tags,
        frequency: 1,
      });
      created.push(consolidated);
    }

    return {
      totalEntries: entries.length,
      duplicatesFound: allDups.length,
      clustersCreated: clusters.length,
      consolidatedCreated: created.length,
      methods,
    };
  }

  findSimilar(
    entry: KnowledgeEntry,
    existing: KnowledgeEntry[],
  ): ConsolidatedEntry | null {
    const dups = this.detector.detect(
      [...existing, entry],
      this.config.keywordThreshold,
    );

    const myDups = dups.filter(
      d => d.mergedId === entry.id || d.keptId === entry.id,
    );

    if (myDups.length === 0) return null;

    const keptId = myDups[0].keptId === entry.id ? myDups[0].mergedId : myDups[0].keptId;
    const existingConsolidated = this.store
      .all()
      .find(c => c.sources.some(s => s.id === keptId));

    return existingConsolidated ?? null;
  }

  getStore(): ConsolidatedStore {
    return this.store;
  }
}
