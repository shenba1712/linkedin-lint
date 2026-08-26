/**
 * Public types. Breaking any of these needs a major version — see docs/devops-cicd.md §3.
 * All types, no runtime code, so this costs nothing in the browser bundle.
 */

/**
 * `error` — blocks publishing. `warn` — style, meant to be overruled. `info` — observation.
 *
 * Only `escape/*`, `counts/over-limit` and `bold/code-identifier` may be `error`, so
 * gating on it is safe. See docs/prd.md §6.
 */
export type Severity = 'error' | 'warn' | 'info';

/**
 * A mechanical replacement. Half-open range `[start, end)` over the ORIGINAL text,
 * so a highlighted range matches what the user typed.
 */
export interface Edit {
  readonly start: number;
  readonly end: number;
  /** Empty means delete. */
  readonly replacement: string;
}

/**
 * An edit an editor may offer. Never applied automatically — `--fix` applies
 * {@link Finding.fix} and ignores these. Applying one moves every other offset, so
 * the caller re-lints after each.
 */
export interface Suggestion extends Edit {
  /** Shown on the control that applies it — `use "look at"`. */
  readonly label: string;
}

/**
 * A `group.field` key. The dot is required and the compiler enforces it.
 *
 * 38 rules share this key space and half want `count`. See ADR-009 §3.
 */
export type DiagnosticKey = `${string}.${string}`;

/**
 * Why a rule fired. Numbers only by type, so content cannot get in. The one field
 * meant to leave the machine (ADR-008 §4). Send `flaggedWord.termIndex: 47`, never
 * the matched word — the caller has the same list.
 */
export type Diagnostic = Readonly<Record<DiagnosticKey, number | readonly number[]>>;

/** One thing the linter noticed. */
export interface Finding {
  /** `group/name`. Stable — renaming is a major version, because people suppress by id. */
  readonly id: string;
  readonly severity: Severity;
  /**
   * One line, plain, no emoji, no trailing period. States what was measured, never
   * who wrote it — "sentence lengths are 14, 15, 13", not "this reads as AI". CLAUDE.md §8.
   */
  readonly message: string;
  /** Half-open `[start, end)` over the ORIGINAL text. Absent for whole-post findings. */
  readonly start?: number;
  readonly end?: number;
  /** Prose. Not machine-applicable — see {@link suggestions}. */
  readonly advice?: string;
  /** Safe to apply automatically. `escape/*` only. Absent means nothing to auto-apply. */
  readonly fix?: Edit;
  /** Offered to a human. Never automatic. */
  readonly suggestions?: readonly Suggestion[];
  readonly diagnostic?: Diagnostic;
}
