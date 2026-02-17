'use server';

import { revalidatePath } from 'next/cache';
import { PayrollService } from '@/modules/payroll/services/payroll.service';
import { CreatePayrollPeriodDTO, CreateSalaryStructureDTO } from '@/modules/payroll/types/payroll.types';

export async function createPayrollPeriod(data: CreatePayrollPeriodDTO) {
    try {
        const period = await PayrollService.createPayrollPeriod(data);
        revalidatePath('/hr/payroll');
        return { success: true, data: period };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function configureSalaryStructure(data: CreateSalaryStructureDTO) {
    try {
        const structure = await PayrollService.configureSalaryStructure(data);
        revalidatePath(`/general/contacts/${data.contactId}`);
        return { success: true, data: structure };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSalaryStructure(contactId: string) {
    try {
        const structure = await PayrollService.getSalaryStructure(contactId);
        return { success: true, data: structure };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function runPayroll(periodId: string) {
    try {
        const result = await PayrollService.runPayroll(periodId);
        revalidatePath('/hr/payroll');
        return { success: true, data: result };
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
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPayrollPeriod(id: string) {
    try {
        const result = await PayrollService.getPayrollPeriod(id);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

import { SalaryComponentService } from '@/modules/payroll/services/salary-component.service';
import { CreateSalaryComponentDTO } from '@/modules/payroll/types/payroll.types';

export async function getSalaryComponents() {
    try {
        const components = await SalaryComponentService.findAll();
        return { success: true, data: components };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createSalaryComponent(data: CreateSalaryComponentDTO) {
    try {
        const component = await SalaryComponentService.create(data);
        revalidatePath('/hr/payroll/components');
        return { success: true, data: component };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
