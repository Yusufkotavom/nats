import { prisma } from '@/lib/prisma';
import { CreatePayrollPeriodDTO, CreateSalaryStructureDTO } from '../types/payroll.types';
import { PayrollPeriodStatus, SalaryComponentType } from '@/prisma/generated/prisma/client';
import { enqueueIntegrationEvent } from '@/modules/integration/outbox';

export class PayrollService {
    static async getPayrollPeriods({
        page = 1,
        pageSize = 10,
    }: {
        page?: number;
        pageSize?: number;
    }) {
        const skip = (page - 1) * pageSize;
        const [items, total] = await Promise.all([
            prisma.payrollPeriod.findMany({
                orderBy: { startDate: 'desc' },
                skip,
                take: pageSize,
                include: {
                    payrollRuns: true,
                },
            }),
            prisma.payrollPeriod.count(),
        ]);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    static async getPayrollPeriod(id: string) {
        return prisma.payrollPeriod.findUnique({
            where: { id },
            include: {
                payrollRuns: true,
                salarySlips: {
                    include: {
                        contact: true,
                        items: {
                            include: { component: true },
                        },
                    },
                },
            },
        });
    }
    static async createPayrollPeriod(data: CreatePayrollPeriodDTO) {
        return prisma.payrollPeriod.create({
            data: {
                name: data.name,
                startDate: data.startDate,
                endDate: data.endDate,
                status: PayrollPeriodStatus.DRAFT,
            },
        });
    }

    static async getSalaryStructure(contactId: string) {
        return prisma.salaryStructure.findFirst({
            where: { contactId, isActive: true },
            include: {
                items: {
                    include: { component: true }
                }
            }
        });
    }

    static async configureSalaryStructure(data: CreateSalaryStructureDTO) {
        // Deactivate existing structure for the employee if any
        await prisma.salaryStructure.updateMany({
            where: { contactId: data.contactId, isActive: true },
            data: { isActive: false },
        });

        return prisma.salaryStructure.create({
            data: {
                name: data.name,
                contactId: data.contactId,
                baseSalary: data.baseSalary,
                createdById: data.createdById,
                items: {
                    create: data.items.map((item) => ({
                        componentId: item.componentId,
                        amount: item.amount,
                        formula: item.formula,
                    })),
                },
            },
            include: { items: true },
        });
    }

    static async getSalaryHistory(contactId: string) {
        return prisma.salaryStructure.findMany({
            where: { contactId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: { component: true }
                }
            }
        });
    }

    static async runPayroll(periodId: string) {
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
        });

        if (!period) throw new Error('Payroll period not found');
        if (period.status === PayrollPeriodStatus.COMPLETED) throw new Error('Payroll period already completed');

        // Fetch all active employees with salary structure
        const employees = await prisma.contact.findMany({
            where: {
                type: 'EMPLOYEE',
                isActive: true,
                salaryStructures: {
                    some: { isActive: true },
                },
            },
            include: {
                salaryStructures: {
                    where: { isActive: true },
                    include: {
                        items: {
                            include: { component: true },
                        },
                    },
                },
            },
        });

        const slips = [];

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // Delete existing draft slips for this period
            await tx.salarySlip.deleteMany({
                where: { periodId, status: 'DRAFT' },
            });

            for (const emp of employees) {
                const structure = emp.salaryStructures[0];
                if (!structure) continue;

                let grossSalary = Number(structure.baseSalary);
                let totalDeductions = 0;
                const slipItems = [];

                for (const item of structure.items) {
                    const amount = Number(item.amount); // Simple fixed amount for now, formula support later
                    slipItems.push({
                        componentId: item.componentId,
                        amount,
                        type: item.component.type,
                    });

                    if (item.component.type === SalaryComponentType.EARNING) {
                        grossSalary += amount;
                    } else if (item.component.type === SalaryComponentType.DEDUCTION) {
                        totalDeductions += amount;
                    }
                }

                const netSalary = grossSalary - totalDeductions;

                const slip = await tx.salarySlip.create({
                    data: {
                        periodId,
                        contactId: emp.id,
                        grossSalary,
                        totalDeductions,
                        netSalary,
                        status: 'DRAFT',
                        items: {
                            create: slipItems,
                        },
                    },
                });
                slips.push(slip);
            }

            // Update Period Status
            await tx.payrollPeriod.update({
                where: { id: periodId },
                data: { status: PayrollPeriodStatus.PROCESSING },
            });
        });

        return {
            periodId,
            totalSlips: slips.length,
        };
    }

    static async approvePayrollRun(periodId: string, userId: string) { // Updated signature
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
        });

        if (!period) throw new Error('Payroll period not found');
        if (period.status !== PayrollPeriodStatus.PROCESSING) throw new Error('Payroll period not in processing state');

        await prisma.$transaction(async (tx) => {
            // 1. Update Period Status
            await tx.payrollPeriod.update({
                where: { id: periodId },
                data: { status: PayrollPeriodStatus.COMPLETED },
            });

            // 2. Publish all Salary Slips
            await tx.salarySlip.updateMany({
                where: { periodId: period.id },
                data: { status: 'PUBLISHED' },
            });

            // 3. Create Payroll Run Record
            // Calculate totals
            const slips = await tx.salarySlip.findMany({
                where: { periodId },
            });

            const totalEarnings = slips.reduce((sum, slip) => sum + Number(slip.grossSalary), 0);
            const totalDeductions = slips.reduce((sum, slip) => sum + Number(slip.totalDeductions), 0);
            const netPay = slips.reduce((sum, slip) => sum + Number(slip.netSalary), 0);

            const payrollRun = await tx.payrollRun.create({
                data: {
                    periodId,
                    runDate: new Date(),
                    totalEarnings,
                    totalDeductions,
                    netPay,
                    status: PayrollPeriodStatus.COMPLETED,
                },
            });

            // Emit PAYROLL_RUN_COMPLETED
            await enqueueIntegrationEvent(tx, {
                topic: 'PAYROLL',
                type: 'PAYROLL_RUN_COMPLETED',
                aggregateType: 'PAYROLL_RUN',
                aggregateId: payrollRun.id,
                payload: {
                    payrollRunId: payrollRun.id,
                    periodId,
                    totalAmount: netPay.toString(),
                    userId,
                },
            });

            // Emit SALARY_SLIP_PUBLISHED for each slip
            for (const slip of slips) {
                await enqueueIntegrationEvent(tx, {
                    topic: 'PAYROLL',
                    type: 'SALARY_SLIP_PUBLISHED',
                    aggregateType: 'SALARY_SLIP',
                    aggregateId: slip.id,
                    payload: {
                        salarySlipId: slip.id,
                        contactId: slip.contactId,
                        netSalary: slip.netSalary.toString(),
                        userId,
                    },
                });
            }
        });
    }
}
