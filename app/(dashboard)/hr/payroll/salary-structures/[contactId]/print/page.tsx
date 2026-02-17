export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactType } from "@/prisma/generated/prisma/client";
import { getSalaryStructure } from "../../../actions";
import { SalarySlip } from "./_components/salary-slip";

interface PageProps {
    params: Promise<{ contactId: string }>;
}

export default async function PrintSalarySlipPage({ params }: PageProps) {
    const { contactId } = await params;

    const [contact, companyProfile] = await Promise.all([
        prisma.contact.findUnique({
            where: { id: contactId, type: ContactType.EMPLOYEE },
        }),
        prisma.companyProfile.findFirst(),
    ]);

    if (!contact) {
        notFound();
    }

    const { data: salaryStructure } = await getSalaryStructure(contactId);

    return (
        <SalarySlip
            contact={contact}
            companyProfile={companyProfile}
            salaryStructure={salaryStructure}
        />
    );
}
