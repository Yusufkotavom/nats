'use server';

import { revalidatePath } from 'next/cache';
import { PayrollService } from '@/modules/payroll/services/payroll.service';
import { CreatePayrollPeriodDTO, CreateSalaryStructureDTO } from '@/modules/payroll/types/payroll.types';
import { prisma } from '@/lib/prisma';

import { SuperJSON } from "@/lib/superjson";

export async function createPayrollPeriod(data: CreatePayrollPeriodDTO) {
    try {
        const period = await PayrollService.createPayrollPeriod(data);
        revalidatePath('/hr/payroll');
        return { success: true, data: SuperJSON.serialize(period) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function configureSalaryStructure(data: CreateSalaryStructureDTO) {
    try {
        const structure = await PayrollService.configureSalaryStructure(data);
        revalidatePath('/hr/payroll/salary-structures');
        revalidatePath(`/hr/payroll/salary-structures/${data.contactId}`);
        return { success: true, data: SuperJSON.serialize(structure) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getEmployees(search = "") {
    try {
        const where: any = {
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
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSalaryStructure(contactId: string) {
    try {
        const structure = await PayrollService.getSalaryStructure(contactId);
        return { success: true, data: SuperJSON.serialize(structure) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runPayroll(periodId: string) {
    try {
        const result = await PayrollService.runPayroll(periodId);
        revalidatePath('/hr/payroll');
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function approvePayrollRun(periodId: string, userId: string) {
    try {
        await PayrollService.approvePayrollRun(periodId, userId);
        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPayrollPeriods(page = 1, pageSize = 10) {
    try {
        const result = await PayrollService.getPayrollPeriods({ page, pageSize });
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPayrollPeriod(id: string) {
    try {
        const result = await PayrollService.getPayrollPeriod(id);
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

import { SalaryComponentService } from '@/modules/payroll/services/salary-component.service';
import { CreateSalaryComponentDTO } from '@/modules/payroll/types/payroll.types';
import { ContactType } from '@/prisma/generated/prisma/client';

export async function getSalaryComponents() {
    try {
        const components = await SalaryComponentService.findAll();
        return { success: true, data: SuperJSON.serialize(components) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createSalaryComponent(data: CreateSalaryComponentDTO) {
    try {
        const component = await SalaryComponentService.create(data);
        revalidatePath('/hr/payroll/components');
        return { success: true, data: SuperJSON.serialize(component) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
