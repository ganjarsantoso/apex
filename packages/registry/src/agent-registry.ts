import { TypedEventBus } from '@apex/events';
import { generateId } from '@apex/shared';
import {
  AgentSpec,
  AgentSpecSchema,
  AgentRole,
  AgentStatus,
  AgentCapability,
  RegistryStats,
} from './schema.js';
import { DEFAULT_AGENTS } from './default-agents.js';

export class AgentRegistry {
  private agents = new Map<string, AgentSpec>();
  private eventBus: TypedEventBus;

  constructor(eventBus?: TypedEventBus) {
    this.eventBus = eventBus ?? new TypedEventBus();
  }

  registerDefaults(): void {
    for (const agent of DEFAULT_AGENTS) {
      this.register(agent);
    }
  }

  register(spec: AgentSpec): boolean {
    const parsed = AgentSpecSchema.safeParse(spec);
    if (!parsed.success) return false;

    this.agents.set(spec.agentId, { ...spec });
    this.eventBus.emit('AgentRegistered', {
      version: '1.0',
      eventId: `evt_${generateId()}`,
      timestamp: new Date().toISOString(),
      source: 'registry',
      correlationId: spec.agentId,
      agentId: spec.agentId,
      role: spec.role,
      capabilities: spec.capabilities,
      status: spec.status,
    });
    return true;
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  getAgent(agentId: string): AgentSpec | undefined {
    return this.agents.get(agentId);
  }

  findByRole(role: AgentRole): AgentSpec[] {
    return Array.from(this.agents.values()).filter((a) => a.role === role && a.enabled);
  }

  findByCapability(key: keyof AgentCapability): AgentSpec[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.enabled && a.capabilities[key] === true
    );
  }

  findIdleAgents(): AgentSpec[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.status === 'IDLE' && a.enabled
    );
  }

  updateStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const from = agent.status;
    agent.status = status;
    agent.updatedAt = new Date().toISOString();

    this.eventBus.emit('AgentStatusChanged', {
      version: '1.0',
      eventId: `evt_${generateId()}`,
      timestamp: new Date().toISOString(),
      source: 'registry',
      correlationId: agentId,
      agentId,
      from,
      to: status,
    });
    return true;
  }

  updateLoadFactor(agentId: string, factor: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.loadFactor = Math.max(0, Math.min(1, factor));
    agent.updatedAt = new Date().toISOString();
    return true;
  }

  list(opts?: { role?: AgentRole; status?: AgentStatus; enabled?: boolean }): AgentSpec[] {
    let result = Array.from(this.agents.values());
    if (opts?.role) result = result.filter((a) => a.role === opts.role);
    if (opts?.status) result = result.filter((a) => a.status === opts.status);
    if (opts?.enabled !== undefined) result = result.filter((a) => a.enabled === opts.enabled);
    return result;
  }

  getStats(): RegistryStats {
    const all = Array.from(this.agents.values());
    return {
      total: all.length,
      idle: all.filter((a) => a.status === 'IDLE').length,
      busy: all.filter((a) => a.status === 'BUSY').length,
      offline: all.filter((a) => a.status === 'OFFLINE').length,
      error: all.filter((a) => a.status === 'ERROR').length,
    };
  }
}
