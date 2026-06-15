import { describe, it, expect } from 'vitest';
import { TypedEventBus } from '../event-bus.js';

describe('TypedEventBus', () => {
  it('subscribes and emits events', async () => {
    const bus = new TypedEventBus();
    let received: unknown = null;
    bus.on('PhaseTransitioned', (event) => {
      received = event;
    });
    await bus.emit('PhaseTransitioned', {
      version: '1.0',
      eventId: 'evt_1',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'corr_1',
      phaseId: 'phase_1',
      from: 'IDEA',
      to: 'DISCOVERY',
      trigger: '/brainstorm',
    });
    expect(received).not.toBeNull();
  });

  it('delivers typed payload fields', async () => {
    const bus = new TypedEventBus();
    let fromPhase = '';
    bus.on('PhaseTransitioned', (event) => {
      fromPhase = event.from;
    });
    await bus.emit('PhaseTransitioned', {
      version: '1.0',
      eventId: 'evt_2',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'corr_2',
      phaseId: 'phase_2',
      from: 'DISCOVERY',
      to: 'PLANNING',
      trigger: 'spec_complete',
    });
    expect(fromPhase).toBe('DISCOVERY');
  });

  it('propagates correlationId through emit chain', async () => {
    const bus = new TypedEventBus();
    let capturedCorrelationId = '';
    bus.on('TaskStarted', (event) => {
      capturedCorrelationId = event.correlationId;
    });
    await bus.emit('TaskStarted', {
      version: '1.0',
      eventId: 'evt_3',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'TASK-001',
      taskId: 'TASK-001',
    });
    expect(capturedCorrelationId).toBe('TASK-001');
  });

  it('supports removeAll cleanup', async () => {
    const bus = new TypedEventBus();
    let callCount = 0;
    bus.on('TaskCompleted', () => { callCount++; });
    await bus.emit('TaskCompleted', {
      version: '1.0',
      eventId: 'evt_4',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'corr_4',
      taskId: 'TASK-001',
      result: 'PASS',
    });
    bus.removeAll();
    await bus.emit('TaskCompleted', {
      version: '1.0',
      eventId: 'evt_5',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'corr_5',
      taskId: 'TASK-002',
      result: 'PASS',
    });
    expect(callCount).toBe(1);
  });

  it('supports multiple subscribers for same event', async () => {
    const bus = new TypedEventBus();
    let countA = 0;
    let countB = 0;
    bus.on('PhaseTransitioned', () => { countA++; });
    bus.on('PhaseTransitioned', () => { countB++; });
    await bus.emit('PhaseTransitioned', {
      version: '1.0',
      eventId: 'evt_6',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'corr_6',
      phaseId: 'phase_6',
      from: 'IDEA',
      to: 'DISCOVERY',
      trigger: '/brainstorm',
    });
    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });

  it('stores EventEnvelope metadata in history', async () => {
    const bus = new TypedEventBus();
    await bus.emit('SecurityIssueDetected', {
      version: '1.0',
      eventId: 'evt_7',
      timestamp: '2026-01-01T00:00:00.000Z',
      source: 'sentinel',
      correlationId: 'sec_1',
      issue: 'Hardcoded AWS key',
      severity: 'CRITICAL',
    });
    const history = bus.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].metadata.version).toBe('1.0');
    expect(history[0].metadata.source).toBe('sentinel');
    expect(history[0].metadata.correlationId).toBe('sec_1');
  });

  it('supports emitFrom convenience method', async () => {
    const bus = new TypedEventBus();
    let captured: unknown = null;
    bus.on('PolicyViolationDetected', (event) => {
      captured = event;
    });
    await bus.emitFrom('sentinel', 'PolicyViolationDetected', {
      correlationId: 'pol_1',
      agentId: 'planner',
      operation: 'shell',
      policy: 'interactive_profile',
    });
    expect(captured).not.toBeNull();
    const evt = captured as Record<string, unknown>;
    expect(evt.source).toBe('sentinel');
    expect(evt.version).toBe('1.0');
  });

  it('handles async handlers', async () => {
    const bus = new TypedEventBus();
    let result = '';
    bus.on('TaskFailed', async (event) => {
      await Promise.resolve();
      result = event.reason;
    });
    await bus.emit('TaskFailed', {
      version: '1.0',
      eventId: 'evt_8',
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: 'corr_8',
      taskId: 'TASK-003',
      reason: 'TEST_FAILURE',
    });
    expect(result).toBe('TEST_FAILURE');
  });
});
