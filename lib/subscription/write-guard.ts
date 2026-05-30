import { getSession } from "@/lib/auth/auth";
import { getCompanyAccessState } from "@/lib/subscription/access";

export async function assertCompanyWriteAccess() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const session = await getSession();
  if (!session?.activeCompanyId || session.isPlatformSuperAdmin) {
    return;
  }

  const access = await getCompanyAccessState(session.activeCompanyId);
  if (access.isReadOnly) {
    throw new Error(
      "Company is in read-only mode because trial/subscription is inactive. Activate a plan to continue.",
    );
  }
}
