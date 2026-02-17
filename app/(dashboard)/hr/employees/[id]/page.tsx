import { notFound } from "next/navigation";
import { EmployeeForm } from "../_components/employee-form";
import { Separator } from "@/components/ui/separator";
import { getEmployee } from "../actions";
import { SuperJSON } from "@/lib/superjson";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const response = await getEmployee(id);

    if (!response.success || !response.data) {
        notFound();
    }

    const employee = SuperJSON.deserialize(response.data);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Edit Employee</h2>
                <p className="text-muted-foreground">
                    View and update employee details.
                </p>
            </div>
            <Separator />
            <div className="max-w-3xl">
                <EmployeeForm initialData={employee} isEditing />
            </div>
        </div>
    );
}
