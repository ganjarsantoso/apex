import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModelConfiguration, ConfigStore, ResetOptions } from './types.js';

function cloneConfig(c: ModelConfiguration): ModelConfiguration {
  return { defaultModel: c.defaultModel, roleOverrides: { ...c.roleOverrides }, agentOverrides: { ...c.agentOverrides } };
}

const DEFAULT_CONFIG: ModelConfiguration = {
  defaultModel: 'big-pickle',
  roleOverrides: {},
  agentOverrides: {},
};

export class FileConfigStore implements ConfigStore {
  private path: string;
  private cache: ModelConfiguration | null = null;

  constructor(path?: string) {
    this.path = path ?? resolve(process.cwd(), 'apex.config.json');
  }

  load(): ModelConfiguration {
    if (this.cache) return this.cache;
    if (!existsSync(this.path)) {
      this.cache = cloneConfig(DEFAULT_CONFIG);
      return this.cache;
    }
    try {
      const raw = readFileSync(this.path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ModelConfiguration>;
      this.cache = {
        defaultModel: parsed.defaultModel ?? DEFAULT_CONFIG.defaultModel,
        roleOverrides: { ...parsed.roleOverrides ?? {} },
        agentOverrides: { ...parsed.agentOverrides ?? {} },
      };
      return this.cache;
    } catch {
      this.cache = cloneConfig(DEFAULT_CONFIG);
      return this.cache;
    }
  }

  save(config: ModelConfiguration): void {
    this.cache = cloneConfig(config);
    writeFileSync(this.path, JSON.stringify(config, null, 2), 'utf-8');
  }

  reset(options?: ResetOptions): ModelConfiguration {
    const current = this.load();
    if (options?.keepDefault) {
      if (options?.roleOverrides !== false) current.roleOverrides = {};
      if (options?.agentOverrides !== false) current.agentOverrides = {};
      this.save(current);
    } else if (options?.roleOverrides === true) {
      current.roleOverrides = {};
      this.save(current);
    } else if (options?.agentOverrides === true) {
      current.agentOverrides = {};
      this.save(current);
    } else {
      this.cache = cloneConfig(DEFAULT_CONFIG);
      this.save(this.cache);
    }
    return this.load();
  }
}
