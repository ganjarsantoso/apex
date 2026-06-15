import { Task } from '@apex/types';

export class DependencyMapper {
  mapDependencies(tasks: Task[]): Task[] {
    const mapped = [...tasks];
    const taskIds = new Set(mapped.map((t) => t.id));

    for (const task of mapped) {
      task.dependencies = task.dependencies.filter((dep) => taskIds.has(dep));
    }

    return this.topologicalSort(mapped);
  }

  getCriticalPath(tasks: Task[]): Task[] {
    const sorted = this.topologicalSort(tasks);
    const longestPath: Task[] = [];
    const visited = new Set<string>();

    for (const task of sorted) {
      if (task.dependencies.length === 0 && !visited.has(task.id)) {
        longestPath.push(task);
        visited.add(task.id);
      }
    }

    return longestPath;
  }

  private topologicalSort(tasks: Task[]): Task[] {
    const sorted: Task[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) return;

      visiting.add(taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        for (const dep of task.dependencies) {
          visit(dep);
        }
        visiting.delete(taskId);
        visited.add(taskId);
        sorted.push(task);
      }
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return sorted;
  }
}
