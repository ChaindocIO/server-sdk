/**
 * ⛔ **Nothing in this suite reaches the network, and that is now a property of the REPOSITORY
 * rather than of every author remembering to stub `fetch`.**
 *
 * `src/client.ts`'s `ENVIRONMENT_URLS` points production, staging **and** development all three at
 * `https://api.chaindoc.io`. There is no local default and no environment variable: a `ChaindocClient`
 * constructed without an explicit `baseUrl` — which is the documented, ordinary way to construct one —
 * is aimed at the live API. Until this file the suite was safe only because all twelve test files
 * happened to stub `globalThis.fetch` themselves; there was no vitest config at all, no setup file,
 * and therefore one forgotten `vi.stubGlobal` between here and a real call. Firing 18 proved the
 * outbound ledger empty across 134 cases with a recording stub — a reading of that day, not a pin.
 *
 * This replaces `fetch` before any test file is imported. A test that wants an answer replaces it
 * again with its own stub, which is a decision taken in the open; a test that forgets gets a loud,
 * local failure naming the URL it tried to reach, instead of a request that succeeds.
 */
import { beforeEach } from "vitest";

/** Every attempt, in order, so a failure can say what was reached rather than that something was. */
export const attempted: string[] = [];

const refuse = async (input: unknown): Promise<never> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : ((input as { url?: string })?.url ?? String(input));

  attempted.push(url);

  throw new Error(
    `outbound call refused by test/no-outbound.setup.ts: ${url}\n` +
      "This suite must not reach the network. ENVIRONMENT_URLS points every environment at the " +
      "live API, so an un-stubbed fetch is a real call. Stub it in the test that needs an answer.",
  );
};

globalThis.fetch = refuse as unknown as typeof fetch;

/**
 * ⛔ RE-ARM, and it has to actually assign.
 *
 * A test file that replaces `globalThis.fetch` and does not restore it leaves its stub in place for
 * every file that runs after it in the same worker. If that stub answers, the pin is gone for the
 * rest of the process — silently, because a stub that answers looks exactly like a passing test.
 *
 * ⚠️ The first version of this block read `if (globalThis.fetch !== refuse) return` and then did
 * nothing in either branch: a no-op wearing the shape of a guard. It was found by review, not by a
 * run, because a no-op re-arm and a working one are indistinguishable from any green suite. A test
 * that wants its own stub sets it inside the test or in its own `beforeEach`, which runs after this
 * one.
 */
beforeEach(() => {
  globalThis.fetch = refuse as unknown as typeof fetch;
});
