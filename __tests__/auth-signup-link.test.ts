import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth login signup link", () => {
  it("points Sign up CTA to /register", () => {
    const filePath = join(process.cwd(), "app/[locale]/auth/page.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain('<Link href="/register" className="underline underline-offset-4">');
  });
});
