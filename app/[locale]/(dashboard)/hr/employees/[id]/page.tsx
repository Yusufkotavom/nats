import { notFound } from "next/navigation";
import { EmployeeForm } from "../_components/employee-form";

import { getEmployee } from "../actions";
import { SuperJSON } from "@/lib/superjson";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const response = await getEmployee(id);

    if (!response.success || !response.data) {
        notFound();
    }

    const employee = SuperJSON.deserialize(response.data);

    return <EmployeeForm initialData={employee} isEditing />;
}
