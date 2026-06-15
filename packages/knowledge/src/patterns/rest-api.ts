import type { ProjectPattern } from '../types.js';

export const REST_API_PATTERN: ProjectPattern = {
  id: 'rest-api',
  name: 'REST API',
  triggerKeywords: ['api', 'rest', 'endpoint', 'express', 'fastify', 'server', 'route', 'http'],
  lessons: [
    'Use a consistent error response format across all endpoints',
    'Validate request bodies with Zod or Joi before processing',
    'Implement rate limiting early to prevent abuse',
    'Use structured logging with correlation IDs for debugging',
  ],
  recommendedTasks: [
    'Set up request validation middleware (Zod schemas)',
    'Implement consistent error handling middleware',
    'Add request logging with correlation IDs',
    'Set up health check endpoint',
    'Configure CORS properly for production',
  ],
  antiPatterns: [
    'Avoid raw try/catch in every handler — use a global error middleware',
    'Do not expose internal error details in production responses',
    'Avoid synchronous file I/O in request handlers',
    'Do not skip input validation on any endpoint',
  ],
};
