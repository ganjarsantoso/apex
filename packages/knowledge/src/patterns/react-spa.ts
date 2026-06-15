import type { ProjectPattern } from '../types.js';

export const REACT_SPA_PATTERN: ProjectPattern = {
  id: 'react-spa',
  name: 'React Single Page Application',
  triggerKeywords: ['react', 'spa', 'component', 'hook', 'jsx', 'frontend', 'ui'],
  lessons: [
    'Use React Router for client-side routing with lazy-loaded routes',
    'Extract reusable custom hooks for data fetching and side effects',
    'Use a state management solution appropriate to scale (Context for small, Zustand for medium)',
  ],
  recommendedTasks: [
    'Set up routing with React Router (lazy-loaded routes)',
    'Create shared component library with Storybook',
    'Configure build optimization (code splitting, lazy loading, tree shaking)',
    'Set up error boundaries and loading states',
  ],
  antiPatterns: [
    'Avoid prop drilling deeper than 3 levels — use Context or Zustand',
    'Do not put business logic directly in components — extract to hooks',
    'Avoid large monolithic components — keep components under 200 lines',
    'Do not skip accessibility (aria labels, keyboard navigation)',
  ],
};
