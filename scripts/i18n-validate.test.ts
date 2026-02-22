import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanSourceCode, generateDefaultValue, flattenKeys } from './i18n-validate';

describe('i18n Validation Script', () => {
  let tempDir: string;
  let sourceDir: string;

  beforeAll(() => {
    // Create a temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-test-'));
    sourceDir = path.join(tempDir, 'app');
    fs.mkdirSync(sourceDir, { recursive: true });

    // Create a dummy source file
    const componentContent = `
      import { useTranslations } from "next-intl";
      
      export default function TestComponent() {
        const t = useTranslations("TestNamespace");
        const tCommon = useTranslations("Common");
        
        return (
          <div>
            <h1>{t("title")}</h1>
            <p>{t("description")}</p>
            <button>{tCommon("submit")}</button>
            <span>{t.rich("formatted_text")}</span>
          </div>
        );
      }
    `;
    fs.writeFileSync(path.join(sourceDir, 'page.tsx'), componentContent);
  });

  afterAll(() => {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate correct default values', () => {
    expect(generateDefaultValue('simple_key')).toBe('Simple Key');
    expect(generateDefaultValue('nested.key_name')).toBe('Key Name');
    expect(generateDefaultValue('already_Title_Case')).toBe('Already Title Case');
    expect(generateDefaultValue('camelCaseKey')).toBe('Camel Case Key');
    expect(generateDefaultValue('mixed_caseKey')).toBe('Mixed Case Key');
  });

  it('should flatten keys correctly', () => {
    const obj = {
      a: '1',
      b: {
        c: '2',
        d: {
          e: '3'
        }
      }
    };
    
    const flat = flattenKeys(obj);
    expect(flat).toEqual({
      'a': '1',
      'b.c': '2',
      'b.d.e': '3'
    });
  });

  it('should scan source code and find translation usage', () => {
    const { usage } = scanSourceCode(sourceDir);
    
    expect(usage.has("TestNamespace")).toBe(true);
    expect(usage.has("Common")).toBe(true);
    
    const testKeys = usage.get("TestNamespace");
    expect(testKeys?.has("title")).toBe(true);
    expect(testKeys?.has("description")).toBe(true);
    expect(testKeys?.has("formatted_text")).toBe(true);
    
    const commonKeys = usage.get("Common");
    expect(commonKeys?.has("submit")).toBe(true);
  });
});
