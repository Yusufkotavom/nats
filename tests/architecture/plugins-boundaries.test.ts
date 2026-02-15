import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function listFilesRecursively(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(entryPath));
      continue;
    }
    files.push(entryPath);
  }

  return files;
}

function isSourceFile(filePath: string) {
  return /\.(ts|tsx|js|jsx|mts)$/.test(filePath);
}

describe("Plugins boundaries", () => {
  it("prevents modules/plugins from importing from app/", () => {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const pluginsRoot = path.join(repoRoot, "modules", "plugins");
    const files = listFilesRecursively(pluginsRoot).filter(isSourceFile);

    const offenders: Array<{ file: string; line: string }> = [];
    const importPattern = /from\s+["']@\/app\//;
    const requirePattern = /require\(\s*["']@\/app\//;

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        if (importPattern.test(line) || requirePattern.test(line)) {
          offenders.push({
            file: path.relative(repoRoot, file),
            line: line.trim(),
          });
          break;
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

