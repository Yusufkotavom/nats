'use server';

import { revalidatePath } from 'next/cache';
import { EmployeeService } from '@/modules/hr/services/employee.service';
import { CreateEmployeeDTO, UpdateEmployeeDTO, ActionResponse } from '@/modules/hr/types';
import { SuperJSON } from "@/lib/superjson";

export async function getEmployees(
    page = 1,
    pageSize = 10,
    search = ""
): Promise<ActionResponse> {
    try {
        const result = await EmployeeService.getEmployees({ page, pageSize, search });
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getEmployee(id: string): Promise<ActionResponse> {
    try {
        const employee = await EmployeeService.getEmployee(id);
        if (!employee) {
            return { success: false, error: "Employee not found" };
        }
        return { success: true, data: SuperJSON.serialize(employee) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function createEmployee(data: CreateEmployeeDTO): Promise<ActionResponse> {
    try {
        const employee = await EmployeeService.createEmployee(data);
        revalidatePath('/hr/employees');
        return { success: true, data: SuperJSON.serialize(employee) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function updateEmployee(id: string, data: UpdateEmployeeDTO): Promise<ActionResponse> {
    try {
        const employee = await EmployeeService.updateEmployee(id, data);
        revalidatePath('/hr/employees');
        revalidatePath(`/hr/employees/${id}`);
        return { success: true, data: SuperJSON.serialize(employee) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
