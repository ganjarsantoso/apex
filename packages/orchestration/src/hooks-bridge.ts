import { TypedEventBus, EventPayload, EventName } from '@apex/events';
import { RuntimeProfile } from '@apex/types';

export interface HookEvent {
  type: string;
  phase: string;
  profile: RuntimeProfile;
  timestamp: string;
  payload?: unknown;
}

/**
 * @deprecated Use TypedEventBus directly via on()/emit(). HooksBridge wraps
 * TypedEventBus for backward compatibility with existing register() callers.
 */
export class HooksBridge {
  private bus: TypedEventBus;

  constructor(bus?: TypedEventBus) {
    this.bus = bus ?? new TypedEventBus();
  }

  getEventBus(): TypedEventBus {
    return this.bus;
  }

  register(eventType: string, handler: (event: HookEvent) => void | Promise<void>): void {
    this.bus.on(eventType as EventName, handler as unknown as (event: EventPayload<EventName>) => void | Promise<void>);
  }

  async emit(eventType: string, event: Omit<HookEvent, 'timestamp'>): Promise<void> {
    const fullEvent: HookEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    await this.bus.emit(eventType as EventName, fullEvent as unknown as EventPayload<EventName>);
  }

  removeAll(eventType?: string): void {
    if (eventType) {
      this.bus.on(eventType as EventName, () => {});
    } else {
      this.bus.removeAll();
    }
  }

  getRegisteredEvents(): string[] {
    return [];
  }
}
