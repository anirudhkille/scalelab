/**
 * Exhaustiveness guard for discriminated unions.
 *
 * Keep every switch on a union total. If a new variant appears, the call site
 * fails to compile because the argument is no longer `never`.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected variant: ${String(value)}`);
}
