import type { ProjectPattern } from '../types.js';

export const FALLBACK_PATTERN: ProjectPattern = {
  id: 'default',
  name: 'General Project',
  triggerKeywords: [],
  lessons: [
    'Write unit tests covering core logic before building peripheral features',
    'Add input validation and error handling at system boundaries',
    'Document public API surfaces as they are designed, not after implementation',
  ],
  recommendedTasks: [
    'Write unit tests for core business logic',
    'Add input validation and error handling',
    'Document public API with usage examples',
    'Set up linting and formatting as pre-commit hooks',
  ],
  antiPatterns: [
    'Do not skip error handling — failing open is a security risk',
    'Avoid tight coupling between modules — prefer dependency injection',
    'Do not commit secrets, keys, or credentials',
    'Avoid premature optimization — profile before optimizing',
  ],
};
