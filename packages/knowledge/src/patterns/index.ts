import type { ProjectPattern } from '../types.js';
import { REACT_SPA_PATTERN } from './react-spa.js';
import { CLI_TOOL_PATTERN } from './cli-tool.js';
import { REST_API_PATTERN } from './rest-api.js';
import { RAG_SYSTEM_PATTERN } from './rag-system.js';
import { FALLBACK_PATTERN } from './defaults.js';

export const DEFAULT_PATTERNS: ProjectPattern[] = [
  REACT_SPA_PATTERN,
  CLI_TOOL_PATTERN,
  REST_API_PATTERN,
  RAG_SYSTEM_PATTERN,
  FALLBACK_PATTERN,
];

export { REACT_SPA_PATTERN } from './react-spa.js';
export { CLI_TOOL_PATTERN } from './cli-tool.js';
export { REST_API_PATTERN } from './rest-api.js';
export { RAG_SYSTEM_PATTERN } from './rag-system.js';
export { FALLBACK_PATTERN } from './defaults.js';
