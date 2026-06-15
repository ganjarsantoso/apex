import { ModelSpec } from './types.js';

const BUILTIN_MODELS: ModelSpec[] = [
  {
    modelId: 'big-pickle',
    provider: 'opencode',
    displayName: 'Big Pickle',
    available: true,
    maxTokens: 128000,
    capabilities: ['reasoning', 'coding', 'planning', 'analysis', 'security', 'orchestration'],
  },
];

export class ModelRegistry {
  private models: Map<string, ModelSpec> = new Map();

  constructor(models?: ModelSpec[]) {
    for (const m of models ?? BUILTIN_MODELS) {
      this.models.set(m.modelId, m);
    }
  }

  register(model: ModelSpec): void {
    this.models.set(model.modelId, model);
  }

  get(modelId: string): ModelSpec | undefined {
    return this.models.get(modelId);
  }

  list(): ModelSpec[] {
    return Array.from(this.models.values());
  }

  listAvailable(): ModelSpec[] {
    return this.list().filter((m) => m.available);
  }

  validate(modelId: string): boolean {
    const model = this.models.get(modelId);
    return !!model && model.available;
  }
}
