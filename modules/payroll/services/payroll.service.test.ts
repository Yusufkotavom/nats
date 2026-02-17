import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayrollService } from './payroll.service';
import { prisma } from '@/lib/prisma';
import { PayrollPeriodStatus, SalaryComponentType } from '@/prisma/generated/prisma/client';
import { enqueueIntegrationEvent } from '@/modules/integration/outbox';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        payrollPeriod: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        salaryStructure: {
            updateMany: vi.fn(),
            create: vi.fn(),
        },
        contact: {
            findMany: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
        salarySlip: {
            deleteMany: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(),
        },
        payrollRun: {
            create: vi.fn(),
        },
    },
}));

vi.mock('@/modules/integration/outbox', () => ({
    enqueueIntegrationEvent: vi.fn(),
}));

describe('PayrollService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPayrollPeriod', () => {
        it('should create a payroll period', async () => {
            const data = {
                name: 'January 2024',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
            };

            const expectedPeriod = { ...data, id: '1', status: PayrollPeriodStatus.DRAFT };
            vi.mocked(prisma.payrollPeriod.create).mockResolvedValue(expectedPeriod as any);

            const result = await PayrollService.createPayrollPeriod(data);

            expect(prisma.payrollPeriod.create).toHaveBeenCalledWith({
                data: {
                    name: data.name,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    status: PayrollPeriodStatus.DRAFT,
                },
            });
            expect(result).toEqual(expectedPeriod);
        });
    });

    describe('runPayroll', () => {
        it('should generate salary slips for active employees', async () => {
            const periodId = 'period-1';
            const period = { id: periodId, status: PayrollPeriodStatus.DRAFT };
            vi.mocked(prisma.payrollPeriod.findUnique).mockResolvedValue(period as any);

            const structure = {
                baseSalary: 5000,
                items: [
                    { componentId: 'comp-1', amount: 1000, component: { type: SalaryComponentType.EARNING } },
                    { componentId: 'comp-2', amount: 200, component: { type: SalaryComponentType.DEDUCTION } },
                ],
            };
            const employees = [{ id: 'emp-1', salaryStructures: [structure], type: 'EMPLOYEE' }];
            vi.mocked(prisma.contact.findMany).mockResolvedValue(employees as any);

            const createdSlip = { id: 'slip-1', netSalary: 5800 };
            vi.mocked(prisma.salarySlip.create).mockResolvedValue(createdSlip as any);

            const result = await PayrollService.runPayroll(periodId);

            expect(prisma.salarySlip.create).toHaveBeenCalled();
            expect(result.totalSlips).toBe(1);
        });
    });

    describe('approvePayrollRun', () => {
        it('should complete period, publish slips, and emit events', async () => {
            const periodId = 'period-1';
            const userId = 'user-1';
            const period = { id: periodId, status: PayrollPeriodStatus.PROCESSING };
            vi.mocked(prisma.payrollPeriod.findUnique).mockResolvedValue(period as any);

            const slips = [{ id: 'slip-1', grossSalary: 6000, totalDeductions: 200, netSalary: 5800, contactId: 'emp-1' }];
            vi.mocked(prisma.salarySlip.findMany).mockResolvedValue(slips as any);

            const payrollRun = { id: 'run-1' };
            vi.mocked(prisma.payrollRun.create).mockResolvedValue(payrollRun as any);

            await PayrollService.approvePayrollRun(periodId, userId);

            expect(prisma.payrollPeriod.update).toHaveBeenCalledWith({
                where: { id: periodId },
                data: { status: PayrollPeriodStatus.COMPLETED },
            });
            expect(enqueueIntegrationEvent).toHaveBeenCalledTimes(2); // 1 for run, 1 for slip
        });
    });
});
