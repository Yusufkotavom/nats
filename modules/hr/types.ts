import { ContactType, EmploymentStatus, Gender, MaritalStatus } from '@/prisma/generated/prisma/client';

export type ActionResponse<T = any> =
    | { success: true; data: T }
    | { success: false; error: string };

export interface CreateEmployeeDTO {
    // Contact Info
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string; // Contact tax ID

    // Employee Details
    joinDate: Date;
    employmentStatus: EmploymentStatus;
    jobTitle: string;
    department: string;
    managerId?: string;

    // Personal Info
    dateOfBirth?: Date;
    gender?: Gender;
    maritalStatus?: MaritalStatus;
    nationalId?: string;
    employeeTaxId?: string; // EmployeeDetail tax ID

    // Emergency Contact
    emergencyContactName?: string;
    emergencyContactPhone?: string;

    // Bank Details
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
    isActive?: boolean;
}
