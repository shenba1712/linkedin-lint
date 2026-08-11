import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The `deps` gate from devops-cicd.md §2, as a failing test rather than a policy note.
 *
 * "Zero runtime dependencies" is only worth anything if it cannot drift, and the only
 * way to guarantee that is to break the build when it does (ADR-005).
 */

interface PackageJson {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly type?: string;
  readonly sideEffects?: boolean;
}

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageJson;

describe('package.json', () => {
  it('has zero runtime dependencies', () => {
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it('has zero peer dependencies', () => {
    expect(pkg.peerDependencies ?? {}).toEqual({});
  });

  it('is an ES module and tree-shakeable', () => {
    expect(pkg.type).toBe('module');
    expect(pkg.sideEffects).toBe(false);
  });
});
