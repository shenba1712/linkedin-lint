/**
 * linkedin-lint — public entry point.
 *
 * Everything exported from here is public API and a compatibility contract.
 * See docs/api-specifications.md before changing any of it.
 *
 * `escapeCommentary` — the reason this package exists — lands in #03. `Stats`,
 * `Baseline`, `LintOptions` and `Profile` land in #02b–#02d.
 *
 * The one rule that governs this directory: it is pure. No `fs`, no `path`, no
 * network, no clock, no randomness. Where a rule needs outside data, the caller
 * passes it in. ESLint enforces all of that; see eslint.config.mjs.
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
