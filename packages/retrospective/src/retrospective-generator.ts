import type { GraphStore } from '@apex/memory-graph';
import type { ManifestStore } from '@apex/manifest';
import type { Retrospective, RetrospectiveEvents } from './types.js';
import { RetrospectiveTemplate } from './retrospective-template.js';

export class RetrospectiveGenerator {
  constructor(
    private manifestStore: ManifestStore,
    private graphStore: GraphStore,
  ) {}

  generate(input: {
    manifestId: string;
    events: RetrospectiveEvents;
  }): Retrospective | null {
    const manifest = this.manifestStore.load(input.manifestId);
    if (!manifest) return null;

    const template = new RetrospectiveTemplate();
    return template.build({ manifest, events: input.events });
  }
}
