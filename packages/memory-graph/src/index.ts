export * from './schema.js';
export * from './types.js';
export * from './store.js';
export * from './builder.js';

import { InMemoryGraphStore } from './store.js';
import { GraphBuilder } from './builder.js';
import { GraphStore } from './types.js';

export class MemoryGraph {
  readonly store: GraphStore;
  readonly builder: GraphBuilder;

  constructor() {
    this.store = new InMemoryGraphStore();
    this.builder = new GraphBuilder(this.store);
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { entities: number; relationships: number } {
    return this.store.stats();
  }
}
