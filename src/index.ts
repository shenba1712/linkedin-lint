/**
 * Public API. Everything here is a compatibility contract — see docs/api-specifications.md.
 *
 * `src/` is pure: no fs, path, network, clock or randomness. ESLint enforces it.
 */
export { escapeCommentary, isReserved, unescapeCommentary } from './escape.js';

export type {
  Severity,
  Edit,
  Suggestion,
  DiagnosticKey,
  Diagnostic,
  Finding,
} from './types.js';
