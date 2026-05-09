import { vi } from "vitest";

/**
 * Standard mocks for Next.js and next-intl that should be applied
 * to all test files that import services using auth or i18n
 */
export function setupNextMocks() {
  vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
    useParams: vi.fn(),
    redirect: vi.fn(),
    notFound: vi.fn(),
  }));

  vi.mock("next-intl/server", () => ({
    getLocale: vi.fn(() => Promise.resolve("en")),
    getTranslations: vi.fn(),
  }));

  vi.mock("@/i18n/routing", () => ({
    redirect: vi.fn(),
  }));
}
