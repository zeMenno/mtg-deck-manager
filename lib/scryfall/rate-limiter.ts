/**
 * Singleton rate limiter for Scryfall HTTP calls.
 *
 * Scryfall asks clients to stay under ~10 req/s. We enforce a 75ms minimum
 * interval between starts (≈13 req/s theoretical max) with concurrency 1.
 */

/** Minimum delay between consecutive request starts. */
export const MIN_INTERVAL_MS = 75;

type QueueItem<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

class RateLimiter {
  private lastStartAt = 0;
  private inFlight = 0;
  private queue: QueueItem<unknown>[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Schedule `fn` behind the rate-limit queue. Concurrent calls are serialized.
   */
  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.pump();
    });
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get inFlightCount(): number {
    return this.inFlight;
  }

  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const pending = this.queue.splice(0);
    for (const item of pending) {
      item.reject(new Error("Rate limiter reset"));
    }
    this.lastStartAt = 0;
    this.inFlight = 0;
  }

  private pump(): void {
    if (this.inFlight > 0 || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const wait = Math.max(0, this.lastStartAt + MIN_INTERVAL_MS - now);

    if (wait > 0) {
      if (this.timer) return;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, wait);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.lastStartAt = Date.now();
    this.inFlight = 1;

    void item
      .fn()
      .then((value) => {
        item.resolve(value);
      })
      .catch((err: unknown) => {
        item.reject(err);
      })
      .finally(() => {
        this.inFlight = 0;
        this.pump();
      });
  }
}

const limiter = new RateLimiter();

export function schedule<T>(fn: () => Promise<T>): Promise<T> {
  return limiter.schedule(fn);
}

/** Test helper — clears queue and timing state. */
export function resetRateLimiter(): void {
  limiter.reset();
}

export function getRateLimiterStats(): {
  pending: number;
  inFlight: number;
} {
  return {
    pending: limiter.pendingCount,
    inFlight: limiter.inFlightCount,
  };
}
