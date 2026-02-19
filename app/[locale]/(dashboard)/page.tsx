export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function Page() {
  const companyProfile = await prisma.companyProfile.findFirst();

  if (!companyProfile) {
    redirect("/setup");
  }

  return (
    <div className="p-4">
      <h1>Welcome to NATS Accounting</h1>
    </div>
  );
}
