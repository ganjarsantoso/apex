import type { KnowledgeEntry, DuplicateResult, Cluster } from './types.js';

class UnionFind {
  private parent: Map<string, string> = new Map();

  constructor(ids: string[]) {
    for (const id of ids) {
      this.parent.set(id, id);
    }
  }

  find(x: string): string {
    const p = this.parent.get(x)!;
    if (p !== x) {
      this.parent.set(x, this.find(p));
    }
    return this.parent.get(x)!;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }

  groups(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!result.has(root)) result.set(root, []);
      result.get(root)!.push(id);
    }
    return result;
  }
}

export class KnowledgeClusterer {
  cluster(
    entries: KnowledgeEntry[],
    duplicatePairs: DuplicateResult[],
    minClusterSize = 2,
  ): Cluster[] {
    if (entries.length === 0 || duplicatePairs.length === 0) return [];

    const allIds = entries.map(e => e.id);
    const uf = new UnionFind(allIds);

    for (const pair of duplicatePairs) {
      uf.union(pair.keptId, pair.mergedId);
    }

    const entryMap = new Map(entries.map(e => [e.id, e]));
    const pairScores = new Map<string, number>();
    for (const pair of duplicatePairs) {
      pairScores.set(`${pair.keptId}:${pair.mergedId}`, pair.similarity);
    }

    const clusters: Cluster[] = [];

    for (const [, members] of uf.groups()) {
      if (members.length < minClusterSize) continue;

      const entryRefs = members.map(id => entryMap.get(id)).filter(Boolean) as KnowledgeEntry[];
      const label = entryRefs.reduce((best, e) => e.summary.length > best.length ? e.summary : best, '');

      let totalScore = 0;
      let pairCount = 0;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = `${members[i]}:${members[j]}`;
          const revKey = `${members[j]}:${members[i]}`;
          const score = pairScores.get(key) ?? pairScores.get(revKey) ?? 0;
          if (score > 0) {
            totalScore += score;
            pairCount++;
          }
        }
      }

      clusters.push({
        id: `cluster-${members.sort()[0].slice(0, 8)}`,
        label,
        memberIds: members,
        size: members.length,
        avgScore: pairCount > 0 ? Math.round((totalScore / pairCount) * 10000) / 10000 : 0,
      });
    }

    return clusters.sort((a, b) => b.size - a.size);
  }
}
