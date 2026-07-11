import { describe, expect, it } from "vitest";
import { resolveRepoInput } from "./resolve-input";

describe("resolveRepoInput", () => {
  it("accepts owner/repo shorthand", () => {
    expect(resolveRepoInput("vercel/ai")).toEqual({
      owner: "vercel",
      repo: "ai",
    });
  });

  it("accepts full https URLs", () => {
    expect(resolveRepoInput("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("strips www. and protocol", () => {
    expect(resolveRepoInput("http://www.github.com/shadcn-ui/ui")).toEqual({
      owner: "shadcn-ui",
      repo: "ui",
    });
  });

  it("accepts gitbrief.dev swapped URLs", () => {
    expect(resolveRepoInput("https://gitbrief.dev/supabase/supabase")).toEqual({
      owner: "supabase",
      repo: "supabase",
    });
  });

  it("strips trailing .git", () => {
    expect(resolveRepoInput("github.com/gin-gonic/gin.git")).toEqual({
      owner: "gin-gonic",
      repo: "gin",
    });
  });

  it("handles /tree deep links keeping branch", () => {
    expect(
      resolveRepoInput("https://github.com/vercel/ai/tree/main/packages/ai"),
    ).toEqual({ owner: "vercel", repo: "ai", branch: "main" });
  });

  it("handles /blob deep links keeping branch", () => {
    expect(
      resolveRepoInput("github.com/fastapi/fastapi/blob/master/README.md"),
    ).toEqual({ owner: "fastapi", repo: "fastapi", branch: "master" });
  });

  it("drops query strings and hashes", () => {
    expect(resolveRepoInput("https://github.com/vercel/ai?tab=readme#usage")).toEqual(
      { owner: "vercel", repo: "ai" },
    );
  });

  it("rejects non-github hosts", () => {
    expect(resolveRepoInput("https://gitlab.com/foo/bar")).toBeNull();
  });

  it("rejects bare words and empty input", () => {
    expect(resolveRepoInput("vercel")).toBeNull();
    expect(resolveRepoInput("")).toBeNull();
    expect(resolveRepoInput("   ")).toBeNull();
  });

  it("rejects invalid owner characters", () => {
    expect(resolveRepoInput("ver cel/ai")).toBeNull();
    expect(resolveRepoInput("-vercel/ai")).toBeNull();
  });

  it("tolerates trailing slashes", () => {
    expect(resolveRepoInput("github.com/vercel/ai/")).toEqual({
      owner: "vercel",
      repo: "ai",
    });
  });
});
