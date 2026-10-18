// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("app source files contain no Hangul (UI is English-only)", () => {
  const files = [...sourceFiles("src"), "index.html"];
  expect(files.length).toBeGreaterThan(5);
  const offenders = files.filter((f) => HANGUL.test(readFileSync(f, "utf8")));
  expect(offenders).toEqual([]);
});
