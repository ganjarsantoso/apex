import { ProjectSpec, Task, TaskGraph } from '@apex/types';
import { generateId, slugify } from '@apex/shared';
import type { SimilarityProvider } from '@apex/knowledge';

export class TaskDecomposer {
  constructor(private similarity?: SimilarityProvider) {}

  decompose(spec: ProjectSpec): TaskGraph {
    const tasks: Task[] = [];
    const milestone = spec.title;

    for (const component of spec.components) {
      const isTest = component.name.includes('tests');

      const task: Task = {
        id: `TASK-${generateId().toUpperCase()}`,
        title: `Implement ${component.name}`,
        objective: component.purpose,
        dependencies: component.dependencies ?? [],
        files: {
          create: isTest ? [] : [`src/${slugify(component.name)}.ts`],
          modify: [],
          test: isTest ? [`tests/${slugify(component.name)}.test.ts`] : [],
        },
        steps: [
          { description: `Write failing test for ${component.name}`, expectedOutput: 'Test FAILS' },
          { description: `Implement minimal ${component.name}`, expectedOutput: 'Test PASSES' },
          { description: 'Refactor if needed', expectedOutput: 'All tests GREEN' },
          { description: 'Commit changes', expectedOutput: 'Changes committed' },
        ],
        acceptanceCriteria: [
          `All tests pass for ${component.name}`,
          'Coverage >= 80%',
        ],
        status: 'PENDING',
      };

      tasks.push(task);
    }

    if (this.similarity && tasks.length > 0) {
      const query = `${spec.topic} ${spec.components.map(c => c.name).join(' ')}`;
      const matches = this.similarity.search(query, 3);
      if (matches.length > 0) {
        tasks[0].steps.unshift({
          description: `Review past related project: "${matches[0].text.slice(0, 80)}..."`,
          expectedOutput: 'Understanding of prior context',
        });
        tasks[0].acceptanceCriteria.push('Reviewed prior project context');
      }
    }

    return { milestone, tasks };
  }
}
