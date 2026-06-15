import { ProjectSpec, ProjectSpecInput } from '@apex/types';
import { generateId, formatTimestamp } from '@apex/shared';
import type { LessonProvider } from '@apex/knowledge';
import { QuestionEngine, Question } from './question-engine.js';
import { SpecBuilder } from './spec-builder.js';

export interface BrainstormSession {
  id: string;
  topic: string;
  startedAt: string;
  questionsAsked: number;
  approachesProposed: string[];
  spec: ProjectSpec | null;
  approved: boolean;
}

export class Brainstorm {
  private questionEngine: QuestionEngine;
  private specBuilder: SpecBuilder;
  private sessions: Map<string, BrainstormSession> = new Map();

  constructor(lessons?: LessonProvider) {
    this.questionEngine = new QuestionEngine(lessons);
    this.specBuilder = new SpecBuilder();
  }

  startSession(topic: string): BrainstormSession {
    const session: BrainstormSession = {
      id: generateId(),
      topic,
      startedAt: formatTimestamp(),
      questionsAsked: 0,
      approachesProposed: [],
      spec: null,
      approved: false,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): BrainstormSession | undefined {
    return this.sessions.get(id);
  }

  async exploreTopic(sessionId: string, input: ProjectSpecInput): Promise<{
    questions: Question[];
    spec?: ProjectSpec;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const questions = this.questionEngine.generateQuestions(input);
    session.questionsAsked = questions.length;

    return { questions };
  }

  async proposeApproaches(sessionId: string): Promise<{
    approaches: Array<{ name: string; description: string; tradeoffs: string[] }>;
    recommendation: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const approaches = [
      {
        name: 'Minimal Viable',
        description: 'Build only what is strictly required. Simple, fast, easy to maintain.',
        tradeoffs: ['May need refactoring later', 'Lowest initial complexity'],
      },
      {
        name: 'Modular Architecture',
        description: 'Design with clear boundaries and interfaces. Extensible from day one.',
        tradeoffs: ['More initial setup', 'Better long-term maintainability'],
      },
      {
        name: 'Production-Ready',
        description: 'Include monitoring, error tracking, and operational concerns upfront.',
        tradeoffs: ['Heavier initial build', 'Production-ready immediately'],
      },
    ];

    session.approachesProposed = approaches.map((a) => a.name);
    return {
      approaches,
      recommendation: 'Modular Architecture â€” balances speed with maintainability.',
    };
  }

  async buildSpec(sessionId: string, input: ProjectSpecInput): Promise<ProjectSpec> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const spec = this.specBuilder.build(input);
    session.spec = spec;
    return spec;
  }

  approve(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.approved = true;
    return true;
  }
}
