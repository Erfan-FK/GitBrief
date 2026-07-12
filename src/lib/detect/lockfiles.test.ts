import { describe, expect, it } from "vitest";
import {
  parseGemfileLock,
  parseGoMod,
  parsePackageLock,
  parsePnpmLock,
  parseTomlPackages,
  parseYarnLock,
} from "./lockfiles";

describe("parsePnpmLock", () => {
  it("reads v9 importers with peer suffixes", () => {
    const lock = `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      next:
        specifier: ^15.3.0
        version: 15.3.0(react@19.0.0)
      react:
        specifier: ^19.0.0
        version: 19.0.0
`;
    const map = parsePnpmLock(lock);
    expect(map.get("next")).toBe("15.3.0");
    expect(map.get("react")).toBe("19.0.0");
  });
});

describe("parsePackageLock", () => {
  it("reads v3 packages map", () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "app" },
        "node_modules/tailwindcss": { version: "4.1.4" },
        "node_modules/@types/react": { version: "19.0.1" },
      },
    });
    const map = parsePackageLock(lock);
    expect(map.get("tailwindcss")).toBe("4.1.4");
    expect(map.get("@types/react")).toBe("19.0.1");
  });
});

describe("parseYarnLock", () => {
  it("reads classic format", () => {
    const lock = `
# yarn lockfile v1

"react@^18.2.0":
  version "18.3.1"
  resolved "https://registry.yarnpkg.com/react/-/react-18.3.1.tgz"

vitest@^1.0.0:
  version "1.6.0"
`;
    const map = parseYarnLock(lock);
    expect(map.get("react")).toBe("18.3.1");
    expect(map.get("vitest")).toBe("1.6.0");
  });

  it("reads berry format", () => {
    const lock = `
__metadata:
  version: 8

"zod@npm:^3.23.0":
  version: 3.24.1
`;
    const map = parseYarnLock(lock);
    expect(map.get("zod")).toBe("3.24.1");
  });
});

describe("parseTomlPackages", () => {
  it("reads poetry/cargo style [[package]] blocks", () => {
    const lock = `
[[package]]
name = "fastapi"
version = "0.115.8"

[[package]]
name = "pydantic"
version = "2.10.4"
`;
    const map = parseTomlPackages(lock);
    expect(map.get("fastapi")).toBe("0.115.8");
    expect(map.get("pydantic")).toBe("2.10.4");
  });
});

describe("parseGoMod", () => {
  it("reads require blocks and single requires", () => {
    const mod = `
module github.com/acme/app

go 1.22

require (
\tgithub.com/gin-gonic/gin v1.10.0
\tgolang.org/x/crypto v0.31.0 // indirect
)

require github.com/stretchr/testify v1.9.0
`;
    const map = parseGoMod(mod);
    expect(map.get("github.com/gin-gonic/gin")).toBe("1.10.0");
    expect(map.get("github.com/stretchr/testify")).toBe("1.9.0");
  });
});

describe("parseGemfileLock", () => {
  it("reads direct gem specs", () => {
    const lock = `GEM
  remote: https://rubygems.org/
  specs:
    rails (7.1.3)
      actioncable (= 7.1.3)
    pg (1.5.6)

PLATFORMS
  ruby
`;
    const map = parseGemfileLock(lock);
    expect(map.get("rails")).toBe("7.1.3");
    expect(map.get("pg")).toBe("1.5.6");
    // transitive (6-space indent) excluded
    expect(map.get("actioncable")).toBeUndefined();
  });
});
