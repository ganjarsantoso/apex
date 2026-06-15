import { ProjectSpecInput } from '@apex/types';
import type { LessonProvider } from '@apex/knowledge';

export interface Question {
  id: string;
  text: string;
  category: 'purpose' | 'constraint' | 'scope' | 'technical';
  options?: string[];
}

export class QuestionEngine {
  constructor(private lessons?: LessonProvider) {}

  generateQuestions(input: ProjectSpecInput): Question[] {
    const questions: Question[] = [];

    questions.push({
      id: 'q-purpose',
      text: `What specific problem does "${input.title}" solve for the end user?`,
      category: 'purpose',
      options: [
        'Improve existing workflow',
        'Enable new capability',
        'Fix recurring issue',
        'Replace legacy system',
      ],
    });

    questions.push({
      id: 'q-constraint',
      text: 'What are the key constraints?',
      category: 'constraint',
      options: [
        'Time-sensitive deadline',
        'Budget limitation',
        'Team size constraint',
        'Compatibility requirement',
      ],
    });

    questions.push({
      id: 'q-scope',
      text: 'Does this need to integrate with existing systems?',
      category: 'scope',
      options: [
        'Yes, multiple integrations',
        'Yes, one integration',
        'No, standalone',
        'Not sure yet',
      ],
    });

    questions.push({
      id: 'q-testing',
      text: 'What level of testing is expected?',
      category: 'technical',
      options: [
        'Unit tests only',
        'Unit + integration tests',
        'Full TDD with all levels',
        'Manual testing only',
      ],
    });

    if (this.lessons) {
      const entries = this.lessons.getLessons(input.title || input.topic || '');
      for (const entry of entries.slice(0, 2)) {
        questions.push({
          id: `q_prior_${entry.id}`,
          text: `Prior project noted: "${entry.summary}". Should we account for this?`,
          category: 'constraint',
          options: ['Yes, add as constraint', 'No, not relevant'],
        });
      }
    }

    return questions;
  }
}
