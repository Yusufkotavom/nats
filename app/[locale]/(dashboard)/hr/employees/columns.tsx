"use client";

import { Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Contact, EmployeeDetail } from "@/prisma/generated/prisma/browser";

export type Employee = Contact & {
    employeeDetail: EmployeeDetail | null;
};

export const getColumns = (t: any, tCommon: any): Column<Employee>[] => [
    {
        header: t("name"),
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
        header: t("department"),
        cell: (item) => item.employeeDetail?.department || "-",
    },
    {
        header: t("job_title"),
        cell: (item) => item.employeeDetail?.jobTitle || "-",
    },
    {
        header: tCommon("status"),
        cell: (item) => (
            <Badge variant={item.isActive ? "default" : "secondary"}>
                {item.isActive ? t("active") : t("inactive")}
            </Badge>
        ),
    },
    {
        header: t("email"),
        accessorKey: "email",
        cell: (item) => item.email || "-",
    },
    {
        header: tCommon("actions"),
        className: "text-right",
        cell: (item) => (
            <div className="text-right">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/hr/employees/${item.id}`}>{tCommon("view")}</Link>
                </Button>
            </div>
        ),
    },
];
