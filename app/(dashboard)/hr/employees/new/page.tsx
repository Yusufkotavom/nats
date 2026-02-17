import { EmployeeForm } from "../_components/employee-form";
import { Separator } from "@/components/ui/separator";

export default function NewEmployeePage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">New Employee</h2>
                <p className="text-muted-foreground">
                    Add a new employee to your organization.
                </p>
            </div>
            <Separator />
            <div className="max-w-3xl">
                <EmployeeForm />
            </div>
        </div>
    );
}
