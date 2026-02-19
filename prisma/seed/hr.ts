import { prisma } from "./utils";
import { ContactType, SalaryComponentType, PayrollPeriodStatus } from "../generated/prisma/client";

export async function seedHR() {
    console.log("Seeding HR Module...");

    // 1. Departments
    const departments = [
        { name: "Engineering", code: "ENG" },
        { name: "Sales", code: "SALES" },
        { name: "Human Resources", code: "HR" },
        { name: "Finance", code: "FIN" },
    ];

    for (const dept of departments) {
        await prisma.department.upsert({
            where: { code: dept.code },
            update: { name: dept.name },
            create: { name: dept.name, code: dept.code },
        });
    }

    // 2. Salary Components
    console.log("Creating Salary Components...");

    let basicComponent = await prisma.salaryComponent.findFirst({ where: { name: "Basic Salary" } });
    if (!basicComponent) {
        basicComponent = await prisma.salaryComponent.create({
            data: {
                name: "Basic Salary",
                type: SalaryComponentType.EARNING,
                isTaxable: true,
            },
        });
    }

    let transportComponent = await prisma.salaryComponent.findFirst({ where: { name: "Transport Allowance" } });
    if (!transportComponent) {
        transportComponent = await prisma.salaryComponent.create({
            data: {
                name: "Transport Allowance",
                type: SalaryComponentType.EARNING,
                isTaxable: false,
            },
        });
    }

    let taxComponent = await prisma.salaryComponent.findFirst({ where: { name: "Income Tax" } });
    if (!taxComponent) {
        taxComponent = await prisma.salaryComponent.create({
            data: {
                name: "Income Tax",
                type: SalaryComponentType.DEDUCTION,
                isTaxable: false,
            },
        });
    }

    // 3. Employees (Contacts + EmployeeDetail)
    const employeesData = [
        {
            name: "John Doe",
            email: "john.doe@example.com",
            role: "Software Engineer",
            deptCode: "ENG",
            baseSalary: 5000,
            joinDate: new Date("2024-01-15")
        },
        {
            name: "Jane Smith",
            email: "jane.smith@example.com",
            role: "Sales Manager",
            deptCode: "SALES",
            baseSalary: 6000,
            joinDate: new Date("2023-05-10")
        },
        {
            name: "Robert Johnson",
            email: "robert.johnson@example.com",
            role: "HR Specialist",
            deptCode: "HR",
            baseSalary: 4000,
            joinDate: new Date("2025-02-01")
        },
    ];

    const employees = [];
    for (const empData of employeesData) {
        let employee = await prisma.contact.findFirst({
            where: { email: empData.email, type: ContactType.EMPLOYEE },
        });

        if (!employee) {
            employee = await prisma.contact.create({
                data: {
                    name: empData.name,
                    email: empData.email,
                    type: ContactType.EMPLOYEE,
                    isActive: true,
                },
            });
        }

        // Upsert EmployeeDetail
        const department = await prisma.department.findUnique({ where: { code: empData.deptCode } });

        // Check if detail exists
        const existingDetail = await prisma.employeeDetail.findUnique({ where: { contactId: employee.id } });
        if (!existingDetail) {
            await prisma.employeeDetail.create({
                data: {
                    contactId: employee.id,
                    jobTitle: empData.role,
                    department: department?.name || "General",
                    joinDate: empData.joinDate,
                    // employmentStatus: "FULL_TIME", // Default
                }
            });
        }

        // Assign Salary Structure
        const existingStructure = await prisma.salaryStructure.findFirst({
            where: { contactId: employee.id, isActive: true },
        });

        if (!existingStructure) {
            await prisma.salaryStructure.create({
                data: {
                    name: "Standard Structure 2026",
                    contactId: employee.id,
                    baseSalary: empData.baseSalary,
                    isActive: true,
                    items: {
                        create: [
                            { componentId: basicComponent!.id, amount: empData.baseSalary, formula: "" },
                            { componentId: transportComponent!.id, amount: 200, formula: "" },
                            // Dummy tax calculation/fixed
                            { componentId: taxComponent!.id, amount: empData.baseSalary * 0.1, formula: "" }
                        ]
                    },
                },
            });
        }
    }

    // 4. Payroll Period
    console.log("Creating Payroll Period...");
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodName = `Payroll ${startOfMonth.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;

    const existingPeriod = await prisma.payrollPeriod.findFirst({
        where: { name: periodName },
    });

    if (!existingPeriod) {
        await prisma.payrollPeriod.create({
            data: {
                name: periodName,
                startDate: startOfMonth,
                endDate: endOfMonth,
                status: PayrollPeriodStatus.DRAFT,
            },
        });
    }
}
