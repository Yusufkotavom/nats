'use server';

import { revalidatePath } from 'next/cache';
import { PayrollService } from '@/modules/payroll/services/payroll.service';
import { CreatePayrollPeriodDTO, CreateSalaryStructureDTO, ActionResponse, CreateSalaryComponentDTO } from '@/modules/payroll/types/payroll.types';
import { prisma } from '@/lib/prisma';
import { verifySession } from "@/lib/auth/auth";
import { SalaryComponentService } from '@/modules/payroll/services/salary-component.service';
import { ContactType } from '@/prisma/generated/prisma/client';

import { SuperJSON } from "@/lib/superjson";

export async function createPayrollPeriod(data: CreatePayrollPeriodDTO): Promise<ActionResponse> {
    try {
        const period = await PayrollService.createPayrollPeriod(data);
        revalidatePath('/hr/payroll');
        return { success: true, data: SuperJSON.serialize(period) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}


export async function configureSalaryStructure(data: CreateSalaryStructureDTO): Promise<ActionResponse> {
    try {
        const { userId } = await verifySession();
        const structure = await PayrollService.configureSalaryStructure({
            ...data,
            createdById: userId,
        });
        revalidatePath('/hr/payroll/salary-structures');
        revalidatePath(`/hr/payroll/salary-structures/${data.contactId}`);
        return { success: true, data: SuperJSON.serialize(structure) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}


export async function getEmployees(search = ""): Promise<ActionResponse> {
    try {
        const where: import('@/prisma/generated/prisma/client').Prisma.ContactWhereInput = {
            type: ContactType.EMPLOYEE,
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };

        const employees = await prisma.contact.findMany({
            where,
            orderBy: { name: "asc" },
            include: {
                salaryStructures: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        return { success: true, data: SuperJSON.serialize(employees) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}


export async function getSalaryStructure(contactId: string): Promise<ActionResponse> {
    try {
        const structure = await PayrollService.getSalaryStructure(contactId);
        return { success: true, data: SuperJSON.serialize(structure) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function runPayroll(periodId: string): Promise<ActionResponse> {
    try {
        const result = await PayrollService.runPayroll(periodId);
        revalidatePath('/hr/payroll');
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function approvePayrollRun(periodId: string, userId: string): Promise<ActionResponse<void>> {
    try {
        await PayrollService.approvePayrollRun(periodId, userId);
        revalidatePath('/hr/payroll');
        return { success: true, data: undefined };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getPayrollPeriods(page = 1, pageSize = 10): Promise<ActionResponse> {
    try {
        const result = await PayrollService.getPayrollPeriods({ page, pageSize });
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getPayrollPeriod(id: string): Promise<ActionResponse> {
    try {
        const result = await PayrollService.getPayrollPeriod(id);
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}



export async function getSalaryComponents(): Promise<ActionResponse> {
    try {
        const components = await SalaryComponentService.findAll();
        return { success: true, data: SuperJSON.serialize(components) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function createSalaryComponent(data: CreateSalaryComponentDTO): Promise<ActionResponse> {
    try {
        const component = await SalaryComponentService.create(data);
        revalidatePath('/hr/payroll/components');
        return { success: true, data: SuperJSON.serialize(component) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getSalaryHistory(contactId: string): Promise<ActionResponse> {
    try {
        const history = await PayrollService.getSalaryHistory(contactId);
        return { success: true, data: SuperJSON.serialize(history) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
