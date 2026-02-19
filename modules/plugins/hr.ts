import { Users } from "lucide-react";
import type { ModulePlugin } from "./types";

export const hrPlugin: ModulePlugin = {
    id: "hr",
    navigation: [
        {
            section: "Operations",
            items: [
                {
                    title: "Navigation.hr",
                    url: "#",
                    icon: Users,
                    items: [
                        { title: "HR.dashboard", url: "/hr/dashboard" },
                        { title: "HR.employees", url: "/hr/employees" },
                        { title: "HR.departments", url: "/hr/departments" },
                        { title: "HR.payroll", url: "/hr/payroll" },
                        { title: "HR.attendance", url: "/hr/attendance" },
                        { title: "HR.leaves", url: "/hr/leaves" },
                    ],
                },
            ],
        },
    ],
    permissions: [
        {
            name: "payroll.view",
            description: "Allows viewing payroll data",
            module: "hr",
        },
        {
            name: "payroll.create",
            description: "Allows creating payroll periods and running payroll",
            module: "hr",
        },
        {
            name: "payroll.approve",
            description: "Allows approving payroll runs",
            module: "hr",
        },
        {
            name: "payroll.configure",
            description: "Allows configuring salary structures and components",
            module: "hr",
        },
    ],
};
