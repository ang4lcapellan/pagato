import { createHmac } from "node:crypto";

type Bucket = { attempts: number; resetAt: number };
export type RateLimitResult = { allowed: boolean; retryAfter: number };

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly secret: string, private readonly capacity = 10_000) {}

  consume(scope: string, discriminator: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const key = createHmac("sha256", this.secret).update(scope + "\0" + discriminator).digest("base64url");
    const current = this.buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { attempts: 0, resetAt: now + windowMs } : current;
    bucket.attempts += 1;
    this.buckets.set(key, bucket);

    if (this.buckets.size > this.capacity) {
      for (const [storedKey, value] of this.buckets) if (value.resetAt <= now) this.buckets.delete(storedKey);
      while (this.buckets.size > this.capacity) this.buckets.delete(this.buckets.keys().next().value as string);
    }

    return { allowed: bucket.attempts <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
}
