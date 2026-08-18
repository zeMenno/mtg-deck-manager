import { describe, expect, it, vi } from "vitest";

import {
  MIN_INTERVAL_MS,
  getRateLimiterStats,
  resetRateLimiter,
  schedule,
} from "@/lib/scryfall/rate-limiter";

describe("rate limiter", () => {
  it("enforces minimum interval between request starts", async () => {
    vi.useFakeTimers();
    resetRateLimiter();

    const starts: number[] = [];
    const tasks = [0, 1, 2].map((i) =>
      schedule(async () => {
        starts.push(Date.now());
        return i;
      }),
    );

    // Flush microtasks + timers until all three complete.
    const resultsPromise = Promise.all(tasks);
    await vi.advanceTimersByTimeAsync(MIN_INTERVAL_MS * 3);
    const results = await resultsPromise;

    expect(results).toEqual([0, 1, 2]);
    expect(starts).toHaveLength(3);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);

    vi.useRealTimers();
  });

  it("serializes concurrency (inFlight never exceeds 1)", async () => {
    vi.useFakeTimers();
    resetRateLimiter();

    let maxInFlight = 0;
    const track = async (ms: number) => {
      const running = getRateLimiterStats().inFlight;
      maxInFlight = Math.max(maxInFlight, running);
      await new Promise((r) => setTimeout(r, ms));
      return running;
    };

    const p = Promise.all([
      schedule(() => track(20)),
      schedule(() => track(20)),
      schedule(() => track(20)),
    ]);

    await vi.advanceTimersByTimeAsync(MIN_INTERVAL_MS * 5 + 100);
    await p;

    expect(maxInFlight).toBeLessThanOrEqual(1);
    vi.useRealTimers();
  });

  it("resetRateLimiter rejects queued work", async () => {
    vi.useFakeTimers();
    resetRateLimiter();

    let started = false;
    const first = schedule(async () => {
      started = true;
      await new Promise((r) => setTimeout(r, 50));
      return "ok";
    });

    const second = schedule(async () => "late");
    // Let first start, then reset before second runs.
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toBe(true);
    resetRateLimiter();

    await expect(second).rejects.toThrow(/reset/i);
    await vi.advanceTimersByTimeAsync(50);
    await expect(first).resolves.toBe("ok");
    vi.useRealTimers();
  });
});
