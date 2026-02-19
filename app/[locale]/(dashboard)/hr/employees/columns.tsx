"use client";

import { Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Contact, EmployeeDetail } from "@/prisma/generated/prisma/browser";

export type Employee = Contact & {
    employeeDetail: EmployeeDetail | null;
};

export const columns: Column<Employee>[] = [
    {
        header: "Name",
        cell: (item) => (
            <Link
                href={`/hr/employees/${item.id}`}
                className="font-medium hover:underline"
            >
                {item.name}
            </Link>
        ),
    },
    {
        header: "Department",
        cell: (item) => item.employeeDetail?.department || "-",
    },
    {
        header: "Job Title",
        cell: (item) => item.employeeDetail?.jobTitle || "-",
    },
    {
        header: "Status",
        cell: (item) => (
            <Badge variant={item.isActive ? "default" : "secondary"}>
                {item.isActive ? "Active" : "Inactive"}
            </Badge>
        ),
    },
    {
        header: "Email",
        accessorKey: "email",
        cell: (item) => item.email || "-",
    },
    {
        header: "Actions",
        className: "text-right",
        cell: (item) => (
            <div className="text-right">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/hr/employees/${item.id}`}>View</Link>
                </Button>
            </div>
        ),
    },
];
