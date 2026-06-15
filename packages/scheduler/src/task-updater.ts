import { ManifestTaskState } from '@apex/types';
import { ManifestStore } from '@apex/manifest';

export interface ManifestTaskUpdater {
  updateTaskState(manifestId: string, taskId: string, state: ManifestTaskState): void;
}

export class DefaultManifestTaskUpdater implements ManifestTaskUpdater {
  private store: ManifestStore;

  constructor(store: ManifestStore) {
    this.store = store;
  }

  updateTaskState(manifestId: string, taskId: string, state: ManifestTaskState): void {
    const manifest = this.store.load(manifestId);
    if (!manifest) return;
    const task = manifest.tasks.find((t) => t.taskId === taskId);
    if (!task) return;
    task.state = state;
    manifest.updatedAt = new Date().toISOString();
    this.store.save(manifest);
  }
}
