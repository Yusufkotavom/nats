import { prisma } from '@/lib/prisma';
import { SalaryComponentType, PayrollPeriodStatus } from '@/prisma/generated/prisma/client';

async function main() {
    console.log('🌱 Seeding Payroll Data...');

    // 1. Ensure Salary Components Exist
    console.log('Creating Salary Components...');

    let basicComponent = await prisma.salaryComponent.findFirst({ where: { name: 'Basic Salary' } });
    if (!basicComponent) {
        basicComponent = await prisma.salaryComponent.create({
            data: {
                name: 'Basic Salary',
                type: SalaryComponentType.EARNING,
                isTaxable: true,
            },
        });
    }

    let transportComponent = await prisma.salaryComponent.findFirst({ where: { name: 'Transport Allowance' } });
    if (!transportComponent) {
        transportComponent = await prisma.salaryComponent.create({
            data: {
                name: 'Transport Allowance',
                type: SalaryComponentType.EARNING,
                isTaxable: false,
            },
        });
    }

    let taxComponent = await prisma.salaryComponent.findFirst({ where: { name: 'Income Tax' } });
    if (!taxComponent) {
        taxComponent = await prisma.salaryComponent.create({
            data: {
                name: 'Income Tax',
                type: SalaryComponentType.DEDUCTION,
                isTaxable: false,
            },
        });
    }

    // 2. Ensure Employees Exist
    console.log('Checking/Creating Employees...');
    const employeesData = [
        { name: 'John Doe', email: 'john.doe@example.com' },
        { name: 'Jane Smith', email: 'jane.smith@example.com' },
        { name: 'Robert Johnson', email: 'robert.johnson@example.com' },
    ];

    const employees = [];
    for (const empData of employeesData) {
        let employee = await prisma.contact.findFirst({
            where: { email: empData.email, type: 'EMPLOYEE' },
        });

        if (!employee) {
            employee = await prisma.contact.create({
                data: {
                    ...empData,
                    type: 'EMPLOYEE',
                    isActive: true,
                },
            });
            console.log(`Created employee: ${employee.name}`);
        } else {
            console.log(`Found employee: ${employee.name}`);
        }
        employees.push(employee);
    }

    // 3. Create Salary Structures
    console.log('Assigning Salary Structures...');
    const structures = [
        {
            baseSalary: 5000,
            items: [
                { componentId: transportComponent.id, amount: 200 },
                { componentId: taxComponent.id, amount: 500 },
            ],
        },
        {
            baseSalary: 3000,
            items: [
                { componentId: transportComponent.id, amount: 150 },
                { componentId: taxComponent.id, amount: 300 },
            ],
        },
        {
            baseSalary: 4000,
            items: [
                { componentId: transportComponent.id, amount: 100 },
                { componentId: taxComponent.id, amount: 400 },
            ],
        },
    ];

    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const structData = structures[i % structures.length];

        // Check if active structure exists
        const existing = await prisma.salaryStructure.findFirst({
            where: { contactId: emp.id, isActive: true },
        });

        if (!existing) {
            await prisma.salaryStructure.create({
                data: {
                    name: 'Standard Structure 2026',
                    contactId: emp.id,
                    baseSalary: structData.baseSalary,
                    isActive: true,
                    items: {
                        create: structData.items.map((item) => ({
                            componentId: item.componentId,
                            amount: item.amount,
                            formula: '', // Fixed amount
                        })),
                    },
                },
            });
            console.log(`Assigned salary structure to ${emp.name}`);
        } else {
            console.log(`Salary structure already exists for ${emp.name}`);
        }
    }

    // 4. Create Payroll Period
    console.log('Creating Payroll Period...');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodName = `Payroll ${startOfMonth.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

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
        console.log(`Created payroll period: ${periodName}`);
    } else {
        console.log(`Payroll period already exists: ${periodName}`);
    }

    console.log('✅ Payroll Seed Completed Successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
