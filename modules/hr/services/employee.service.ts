import { prisma } from '@/lib/prisma';
import { CreateEmployeeDTO, UpdateEmployeeDTO } from '../types';
import { ContactType, Prisma } from '@/prisma/generated/prisma/client';

export class EmployeeService {
    static async getEmployees({
        page = 1,
        pageSize = 10,
        search = '',
    }: {
        page?: number;
        pageSize?: number;
        search?: string;
    }) {
        const skip = (page - 1) * pageSize;
        const where = {
            type: ContactType.EMPLOYEE,
            OR: search ? [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { employeeDetail: { jobTitle: { contains: search, mode: 'insensitive' as const } } },
                { employeeDetail: { department: { contains: search, mode: 'insensitive' as const } } },
            ] : undefined,
        };

        const [items, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { name: 'asc' },
                include: {
                    employeeDetail: true,
                },
            }),
            prisma.contact.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    static async getEmployee(id: string) {
        return prisma.contact.findFirst({
            where: { id, type: ContactType.EMPLOYEE },
            include: {
                employeeDetail: true,
            },
        });
    }

    static async createEmployee(data: CreateEmployeeDTO) {
        return prisma.$transaction(async (tx) => {
            const contact = await tx.contact.create({
                data: {
                    type: ContactType.EMPLOYEE,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    taxId: data.taxId,
                    isActive: true,
                },
            });

            const employeeDetail = await tx.employeeDetail.create({
                data: {
                    contactId: contact.id,
                    joinDate: data.joinDate,
                    employmentStatus: data.employmentStatus,
                    jobTitle: data.jobTitle,
                    department: data.department,
                    managerId: data.managerId,
                    dateOfBirth: data.dateOfBirth,
                    gender: data.gender,
                    maritalStatus: data.maritalStatus,
                    nationalId: data.nationalId,
                    taxId: data.employeeTaxId,
                    emergencyContactName: data.emergencyContactName,
                    emergencyContactPhone: data.emergencyContactPhone,
                    bankName: data.bankName,
                    bankAccount: data.bankAccount,
                    bankHolder: data.bankHolder,
                },
            });

            return { ...contact, employeeDetail };
        });
    }

    static async updateEmployee(id: string, data: UpdateEmployeeDTO) {
        return prisma.$transaction(async (tx) => {
            // Update Contact info
            const contactData: Prisma.ContactUpdateInput = {};
            if (data.name) contactData.name = data.name;
            if (data.email !== undefined) contactData.email = data.email;
            if (data.phone !== undefined) contactData.phone = data.phone;
            if (data.address !== undefined) contactData.address = data.address;
            if (data.taxId !== undefined) contactData.taxId = data.taxId;
            if (data.isActive !== undefined) contactData.isActive = data.isActive;

            if (Object.keys(contactData).length > 0) {
                await tx.contact.update({
                    where: { id },
                    data: contactData,
                });
            }

            // Update EmployeeDetail info
            const detailData: Prisma.EmployeeDetailUpdateInput = {};
            if (data.joinDate) detailData.joinDate = data.joinDate;
            if (data.employmentStatus) detailData.employmentStatus = data.employmentStatus;
            if (data.jobTitle) detailData.jobTitle = data.jobTitle;
            if (data.department) detailData.department = data.department;
            if (data.managerId !== undefined) detailData.managerId = data.managerId;
            if (data.dateOfBirth !== undefined) detailData.dateOfBirth = data.dateOfBirth;
            if (data.gender !== undefined) detailData.gender = data.gender;
            if (data.maritalStatus !== undefined) detailData.maritalStatus = data.maritalStatus;
            if (data.nationalId !== undefined) detailData.nationalId = data.nationalId;
            if (data.employeeTaxId !== undefined) detailData.taxId = data.employeeTaxId;
            if (data.emergencyContactName !== undefined) detailData.emergencyContactName = data.emergencyContactName;
            if (data.emergencyContactPhone !== undefined) detailData.emergencyContactPhone = data.emergencyContactPhone;
            if (data.bankName !== undefined) detailData.bankName = data.bankName;
            if (data.bankAccount !== undefined) detailData.bankAccount = data.bankAccount;
            if (data.bankHolder !== undefined) detailData.bankHolder = data.bankHolder;

            if (Object.keys(detailData).length > 0) {
                await tx.employeeDetail.upsert({
                    where: { contactId: id },
                    update: detailData,
                    create: {
                        contactId: id,
                        joinDate: data.joinDate || new Date(),
                        employmentStatus: data.employmentStatus || 'FULL_TIME',
                        jobTitle: data.jobTitle || 'Unknown',
                        department: data.department || 'Unknown',
                        managerId: data.managerId,
                        dateOfBirth: data.dateOfBirth,
                        gender: data.gender,
                        maritalStatus: data.maritalStatus,
                        nationalId: data.nationalId,
                        taxId: data.employeeTaxId,
                        emergencyContactName: data.emergencyContactName,
                        emergencyContactPhone: data.emergencyContactPhone,
                        bankName: data.bankName,
                        bankAccount: data.bankAccount,
                        bankHolder: data.bankHolder,
                    }
                });
            }

            return tx.contact.findUnique({
                where: { id },
                include: { employeeDetail: true },
            });
        });
    }
}
