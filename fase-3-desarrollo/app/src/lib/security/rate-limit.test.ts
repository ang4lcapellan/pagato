import { expect, it } from "vitest";
import { FixedWindowRateLimiter } from "./fixed-window-rate-limit";

it("blocks attempts beyond the window limit without storing the raw identity", () => {
  const limiter = new FixedWindowRateLimiter("a".repeat(32));
  expect(limiter.consume("sign-in", "user@example.com", 2, 60_000, 1_000).allowed).toBe(true);
  expect(limiter.consume("sign-in", "user@example.com", 2, 60_000, 1_001).allowed).toBe(true);
  const blocked = limiter.consume("sign-in", "user@example.com", 2, 60_000, 1_002);
  expect(blocked.allowed).toBe(false);
  expect(blocked.retryAfter).toBe(60);
});

it("starts a fresh bucket after the window expires", () => {
  const limiter = new FixedWindowRateLimiter("b".repeat(32));
  limiter.consume("reset", "user@example.com", 1, 1_000, 5_000);
  expect(limiter.consume("reset", "user@example.com", 1, 1_000, 6_000).allowed).toBe(true);
});
