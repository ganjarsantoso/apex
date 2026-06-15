import {
  BaseEvent,
  EventEnvelope,
  EventName,
  EventPayload,
} from './types.js';

let nextId = 0;
function generateId(): string {
  nextId++;
  return `evt_${Date.now()}_${nextId}`;
}

type Handler = (event: Record<string, unknown>) => void | Promise<void>;

export class TypedEventBus {
  private handlers = new Map<string, Handler[]>();
  private envelopes: EventEnvelope[] = [];

  on<E extends EventName>(name: E, handler: (event: EventPayload<E>) => void | Promise<void>): void {
    const handlers = this.handlers.get(name) ?? [];
    handlers.push(handler as unknown as Handler);
    this.handlers.set(name, handlers);
  }

  off<E extends EventName>(name: E, handler: (event: EventPayload<E>) => void | Promise<void>): void {
    const handlers = this.handlers.get(name) ?? [];
    const idx = handlers.indexOf(handler as unknown as Handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  async emit<E extends EventName>(name: E, event: EventPayload<E>): Promise<void> {
    const envelope: EventEnvelope = {
      metadata: {
        version: event.version,
        timestamp: event.timestamp,
        correlationId: event.correlationId,
        eventId: event.eventId,
        source: event.source,
      },
      payload: { ...event } as unknown as Record<string, unknown>,
    };
    this.envelopes.push(envelope);

    const handlers = this.handlers.get(name) ?? [];
    await Promise.all(handlers.map((h) => h(event as unknown as Record<string, unknown>)));
  }

  async emitFrom<E extends EventName>(source: string, name: E, partial: Omit<EventPayload<E>, keyof BaseEvent> & { correlationId: string }): Promise<void> {
    const fullEvent = {
      version: '1.0' as const,
      eventId: generateId(),
      timestamp: new Date().toISOString(),
      source,
      ...partial,
    } as EventPayload<E>;
    await this.emit<E>(name, fullEvent);
  }

  removeAll(): void {
    this.handlers.clear();
  }

  getHistory(): EventEnvelope[] {
    return [...this.envelopes];
  }
}
