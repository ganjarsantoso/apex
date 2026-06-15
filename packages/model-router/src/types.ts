export interface ModelSpec {
  modelId: string;
  provider: string;
  displayName: string;
  available: boolean;
  maxTokens: number;
  capabilities: string[];
}

export interface ResolutionResult {
  modelId: string;
  agentId: string;
  taskId: string;
  source: 'role' | 'profile' | 'default' | 'fallback';
  reason: string;
}

export interface ModelConfiguration {
  defaultModel: string;
  roleOverrides: Record<string, string>;
  agentOverrides: Record<string, string>;
}

export interface ResetOptions {
  keepDefault?: boolean;
  roleOverrides?: boolean;
  agentOverrides?: boolean;
}

export interface ConfigStore {
  load(): ModelConfiguration;
  save(config: ModelConfiguration): void;
  reset(options?: ResetOptions): ModelConfiguration;
}
