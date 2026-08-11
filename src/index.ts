/**
 * linkedin-lint — public entry point.
 *
 * Everything exported from here is public API and a compatibility contract.
 * See docs/api-specifications.md before changing any of it.
 *
 * Nothing is implemented yet. The types land in #02 and `escapeCommentary` — the
 * reason this package exists — lands in #03. This file exists so the build has an
 * input and the `exports` map has a target.
 *
 * The one rule that governs this directory: it is pure. No `fs`, no `path`, no
 * network, no clock, no randomness. Where a rule needs outside data, the caller
 * passes it in. ESLint enforces all of that; see eslint.config.mjs.
 */
export {};
