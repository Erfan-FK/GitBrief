import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./ratelimit";

describe("checkRateLimit (memory sliding window)", () => {
  it("allows 10 then blocks the 11th", async () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
    const eleventh = await checkRateLimit(ip);
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.remaining).toBe(0);
    expect(eleventh.resetMs).toBeGreaterThan(0);
  });

  it("isolates windows per IP", async () => {
    const a = await checkRateLimit(`a-${Math.random()}`);
    const b = await checkRateLimit(`b-${Math.random()}`);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
