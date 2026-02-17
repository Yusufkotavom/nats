import { prisma } from '@/lib/prisma';
import { CreateSalaryComponentDTO } from '../types/payroll.types';

export class SalaryComponentService {
    static async create(data: CreateSalaryComponentDTO) {
        return prisma.salaryComponent.create({
            data: {
                name: data.name,
                type: data.type,
                isTaxable: data.isTaxable ?? true,
                description: data.description,
            },
        });
    }

    static async findAll() {
        return prisma.salaryComponent.findMany({
            where: { isActive: true },
        });
    }

    static async findById(id: string) {
        return prisma.salaryComponent.findUnique({
            where: { id },
        });
    }
}
