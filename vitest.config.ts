import { defineConfig } from "vitest/config";

/**
 * This repository had **no vitest config at all**. Two things follow from that and both are here:
 *
 *  · `setupFiles` — `src/client.ts` aims every environment at `https://api.chaindoc.io`, so the
 *    suite's safety rested on twelve files each remembering to stub `fetch`. The setup file makes
 *    the refusal structural.
 *  · `pool: "forks"` — vitest 1.6.1's default `threads` pool aborts this suite at teardown on
 *    node 24. A suite that cannot finish cannot be evidence of anything.
 */
export default defineConfig({
  test: {
    setupFiles: ["./test/no-outbound.setup.ts"],
    pool: "forks",
    include: ["src/**/*.test.ts"],
  },
});
