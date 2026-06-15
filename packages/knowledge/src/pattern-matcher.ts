import type { ProjectPattern } from './types.js';
import { PatternRegistry } from './pattern-registry.js';

export class PatternMatcher {
  constructor(private registry: PatternRegistry) {}

  match(text: string): ProjectPattern[] {
    return this.registry.findMatching(text);
  }

  getRecommendedTasks(text: string): string[] {
    const patterns = this.registry.findMatching(text);
    const seen = new Set<string>();
    const tasks: string[] = [];
    for (const p of patterns) {
      for (const task of p.recommendedTasks) {
        if (!seen.has(task)) {
          seen.add(task);
          tasks.push(task);
        }
      }
    }
    return tasks;
  }

  getLessons(text: string): string[] {
    const patterns = this.registry.findMatching(text);
    const seen = new Set<string>();
    const lessons: string[] = [];
    for (const p of patterns) {
      for (const lesson of p.lessons) {
        if (!seen.has(lesson)) {
          seen.add(lesson);
          lessons.push(lesson);
        }
      }
    }
    return lessons;
  }

  getAntiPatterns(text: string): string[] {
    const patterns = this.registry.findMatching(text);
    const seen = new Set<string>();
    const anti: string[] = [];
    for (const p of patterns) {
      for (const a of p.antiPatterns) {
        if (!seen.has(a)) {
          seen.add(a);
          anti.push(a);
        }
      }
    }
    return anti;
  }
}
