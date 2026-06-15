export interface GuardEvent {
  command: string;
  blocked: boolean;
  reason?: string;
  timestamp: string;
}

const BLOCKED_COMMANDS: RegExp[] = [
  /^rm\s+-rf\s+\/$/,
  /^sudo\s+/,
  /^\w+\s*\|\s*(sh|bash|zsh|powershell)/,
  /^curl\s+.*\|\s*(sh|bash)/,
  /^wget\s+.*\|\s*(sh|bash)/,
  /^chmod\s+777/,
  /^dd\s+if=\/dev\/zero/,
  /:(){ :\|:& };:/,
];

const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\/\s*$/,
  />\s*\/dev\/\w+/,
  /drop\s+table/i,
  /truncate\s+table/i,
];

export class RuntimeGuard {
  private events: GuardEvent[] = [];

  checkCommand(command: string): GuardEvent {
    const event: GuardEvent = {
      command,
      blocked: false,
      timestamp: new Date().toISOString(),
    };

    for (const pattern of BLOCKED_COMMANDS) {
      if (pattern.test(command.trim())) {
        event.blocked = true;
        event.reason = `Command matches blocked pattern: ${pattern}`;
        this.events.push(event);
        return event;
      }
    }

    this.events.push(event);
    return event;
  }

  checkContent(content: string): GuardEvent {
    const event: GuardEvent = {
      command: content,
      blocked: false,
      timestamp: new Date().toISOString(),
    };

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(content)) {
        event.blocked = true;
        event.reason = `Content matches dangerous pattern: ${pattern}`;
        this.events.push(event);
        return event;
      }
    }

    return event;
  }

  getEvents(): GuardEvent[] {
    return [...this.events];
  }

  getBlockedCount(): number {
    return this.events.filter((e) => e.blocked).length;
  }
}
