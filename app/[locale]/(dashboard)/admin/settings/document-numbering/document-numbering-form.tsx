"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDocumentNumberingSetting } from "./actions";
import type { DocumentNumbering } from "@/prisma/generated/prisma/client";

const formSchema = z.object({
    prefix: z.string().max(20),
    suffix: z.string().max(20),
    sequenceDigits: z.number().min(3).max(10),
    includeYear: z.boolean(),
    yearFormat: z.string(),
    includeMonth: z.boolean(),
    resetYearly: z.boolean(),
    resetMonthly: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface DocumentNumberingFormProps {
    initialData: DocumentNumbering;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DocumentNumberingForm({
    initialData,
    open,
    onOpenChange,
}: DocumentNumberingFormProps) {
    const router = useRouter();
    const t = useTranslations("Common");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            prefix: initialData.prefix || "",
            suffix: initialData.suffix || "",
            sequenceDigits: initialData.sequenceDigits,
            includeYear: initialData.includeYear,
            yearFormat: initialData.yearFormat,
            includeMonth: initialData.includeMonth,
            resetYearly: initialData.resetYearly,
            resetMonthly: initialData.resetMonthly,
        },
    });

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            const res = await updateDocumentNumberingSetting(initialData.id, data);

            if (res.success) {
                toast({ title: "Success", description: t("success") });
                onOpenChange(false);
                router.refresh();
            } else {
                toast({ title: "Error", description: res.error || t("error"), variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: t("error_occurred"), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("edit")} {initialData.name}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="prefix"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prefix</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. INV-" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="suffix"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Suffix</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. -X" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="sequenceDigits"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sequence Digits</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                        />
                                    </FormControl>
                                    <FormDescription>Number of zeroes for padding (e.g. 5 = 00001)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="text-sm font-medium">Date Formatting</h4>

                            <FormField
                                control={form.control}
                                name="includeYear"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Include Year</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {form.watch("includeYear") && (
                                <FormField
                                    control={form.control}
                                    name="yearFormat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Year Format</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select format" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="YY">2 Digits (YY)</SelectItem>
                                                    <SelectItem value="YYYY">4 Digits (YYYY)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="includeMonth"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Include Month</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="text-sm font-medium">Reset Rules</h4>

                            <FormField
                                control={form.control}
                                name="resetYearly"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Reset Sequence Yearly</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="resetMonthly"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Reset Sequence Monthly</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                {t("cancel")}
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? t("saving") || "Saving..." : t("save")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
