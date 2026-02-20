"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ContactType, EmploymentStatus, Gender, MaritalStatus } from "@/prisma/generated/prisma/browser";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createEmployee, updateEmployee } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
    PageFormLayout,
    PageFormHeader,
    PageFormTitle,
    PageFormActions,
    PageFormContent,
} from "@/components/layout/page/form-layout";

const employeeSchema = z.object({
    // Contact Info
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),

    // Employee Details
    joinDate: z.date(),
    employmentStatus: z.nativeEnum(EmploymentStatus),
    jobTitle: z.string().min(1, "Job title is required"),
    department: z.string().min(1, "Department is required"),
    managerId: z.string().optional(),

    // Personal Info
    dateOfBirth: z.date().optional(),
    gender: z.nativeEnum(Gender).optional(),
    maritalStatus: z.nativeEnum(MaritalStatus).optional(),
    nationalId: z.string().optional(),
    employeeTaxId: z.string().optional(),

    // Emergency Contact
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),

    // Bank Details
    bankName: z.string().optional(),
    bankAccount: z.string().optional(),
    bankHolder: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
    initialData?: any; // strict typing would be better but keeping it simple for now
    isEditing?: boolean;
}

import { useTranslations } from "next-intl";

export function EmployeeForm({ initialData, isEditing = false }: EmployeeFormProps) {
    const t = useTranslations("HR");
    const tCommon = useTranslations("Common");
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const defaultValues: Partial<EmployeeFormValues> = initialData
        ? {
            ...initialData,
            ...initialData.employeeDetail,
            joinDate: initialData.employeeDetail?.joinDate ? new Date(initialData.employeeDetail.joinDate) : new Date(),
            dateOfBirth: initialData.employeeDetail?.dateOfBirth ? new Date(initialData.employeeDetail.dateOfBirth) : undefined,
            employeeTaxId: initialData.employeeDetail?.taxId,
        }
        : {
            name: "",
            email: "",
            phone: "",
            address: "",
            taxId: "",
            joinDate: new Date(),
            employmentStatus: EmploymentStatus.FULL_TIME,
            jobTitle: "",
            department: "",
            managerId: "",
        };

    const form = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeSchema),
        defaultValues,
    });

    async function onSubmit(data: EmployeeFormValues) {
        setIsLoading(true);
        try {
            const response = isEditing
                ? await updateEmployee(initialData.id, data)
                : await createEmployee(data);

            if (response.success) {
                toast({
                    title: isEditing ? t("employee_updated") : t("employee_created"),
                    description: isEditing
                        ? t("employee_updated_desc")
                        : t("employee_created_desc"),
                });
                if (!isEditing) {
                    router.push(`/hr/employees/${response.data.id}`);
                } else {
                    router.refresh();
                }
            } else {
                toast({
                    variant: "destructive",
                    title: tCommon("error"),
                    description: response.error,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: "Something went wrong. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <PageFormLayout>
                    <PageFormHeader>
                        <PageFormTitle title={isEditing ? t("edit_employee") : t("new_employee")} />
                        <PageFormActions>
                            <Button variant="outline" type="button" onClick={() => router.back()}>
                                {tCommon("cancel")}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? t("update_employee") : t("create_employee")}
                            </Button>
                        </PageFormActions>
                    </PageFormHeader>


                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="general">{t("general_info")}</TabsTrigger>
                            <TabsTrigger value="employment">{t("employment")}</TabsTrigger>
                            <TabsTrigger value="personal">{t("personal_info")}</TabsTrigger>
                            <TabsTrigger value="bank">{t("bank_tax")}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general">
                            <PageFormContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("full_name")}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("email")}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("phone")}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+1234567890" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("address")}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123 Main St" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </PageFormContent>
                        </TabsContent>

                        <TabsContent value="employment">
                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="jobTitle"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("job_title")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Software Engineer" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="department"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("department")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Engineering" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="employmentStatus"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("employment_status")}</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.values(EmploymentStatus).map((status) => (
                                                                <SelectItem key={status} value={status}>
                                                                    {status.replace(/_/g, " ")}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="joinDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("join_date")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="date"
                                                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="personal">
                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="dateOfBirth"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("date_of_birth")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="date"
                                                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="gender"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("gender")}</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select gender" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.values(Gender).map((g) => (
                                                                <SelectItem key={g} value={g}>{g}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="maritalStatus"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("marital_status")}</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.values(MaritalStatus).map((s) => (
                                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Separator className="my-4" />
                                    <h4 className="text-sm font-medium">{t("emergency_contact")}</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="emergencyContactName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("name")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Jane Doe" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="emergencyContactPhone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("phone")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+1234567890" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="bank">
                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="nationalId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("national_id")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="National ID" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="employeeTaxId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("tax_id")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Tax ID" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Separator className="my-4" />
                                    <h4 className="text-sm font-medium">{t("bank_details")}</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="bankName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("bank_name")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Bank Name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="bankAccount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("account_number")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Account Number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="bankHolder"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("account_holder")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Account Holder" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>


                </PageFormLayout>
            </form>
        </Form>
    );
}
