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

/** A mechanical replacement. Offsets are over the ORIGINAL text, so ranges match what was typed. */
export interface Edit {
  readonly start: number;
  /** Exclusive. */
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
 * Why a rule fired — numbers only, by type, so content cannot appear structurally.
 * This is the one field designed to leave the machine (ADR-008 §4, ADR-012 §1).
 *
 * Send an index into a shipped list, never the matched text: `flaggedWord.termIndex: 47`
 * identifies `delve` exactly, because the caller has the same list.
 */
export type Diagnostic = Readonly<Record<DiagnosticKey, number | readonly number[]>>;

/** One thing the linter noticed. */
export interface Finding {
  /** `group/name`. Stable — renaming is a major version, because people suppress by id. */
  readonly id: string;
  readonly severity: Severity;
  /**
   * One line, plain, no emoji, no trailing period.
   *
   * States what was measured, never who wrote it: "sentence lengths are 14, 15, 13"
   * not "this reads as AI". The package cannot know, and the writers a heuristic
   * misjudges are mostly people writing formal or second-language English.
   */
  readonly message: string;
  /** Over the ORIGINAL text. Absent for whole-post findings. */
  readonly start?: number;
  /** Exclusive. */
  readonly end?: number;
  /** Prose. Not machine-applicable — see {@link suggestions}. */
  readonly advice?: string;
  /** Safe to apply automatically. `escape/*` only. Absent means nothing to auto-apply. */
  readonly fix?: Edit;
  /** Offered to a human. Never automatic. */
  readonly suggestions?: readonly Suggestion[];
  readonly diagnostic?: Diagnostic;
}
