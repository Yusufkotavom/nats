"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { saveCompanyProfile } from "../actions";
import { useToast } from "@/hooks/use-toast";

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    IDR: "Rp",
    JPY: "¥",
};

interface StepCompanyProfileProps {
    onComplete: () => void;
    hasExisting: boolean;
}

export function StepCompanyProfile({
    onComplete,
    hasExisting,
}: StepCompanyProfileProps) {
    const [isPending, startTransition] = useTransition();
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const { toast } = useToast();

    const handleCurrencyChange = (value: string) => {
        setCurrencySymbol(CURRENCY_SYMBOLS[value] || "");
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const data = {
            name: formData.get("name") as string,
            address: formData.get("address") as string,
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            website: formData.get("website") as string,
            taxId: formData.get("taxId") as string,
            currency: formData.get("currency") as string,
            currencySymbol: formData.get("currencySymbol") as string,
            dateFormat: formData.get("dateFormat") as string,
            currencyFormat: formData.get("currencyFormat") as string,
            locale: formData.get("locale") as string,
            timezone: formData.get("timezone") as string,
        };

        startTransition(async () => {
            const result = await saveCompanyProfile(data);
            if (result.success) {
                toast({
                    title: "Company profile saved",
                    description: "Your company profile has been created successfully.",
                });
                onComplete();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to save company profile",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Company Profile</h2>
                <p className="text-muted-foreground mt-1">
                    Tell us about your business. This information will appear on invoices and reports.
                </p>
            </div>

            {hasExisting && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    A company profile already exists. You can update it or skip this step.
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Company Name *</Label>
                        <Input id="name" name="name" required placeholder="Your Company Name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                        <Input id="taxId" name="taxId" placeholder="e.g. 123-456-789" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="contact@company.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" name="phone" placeholder="+1 555-0100" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" placeholder="123 Business Rd, City" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" name="website" type="url" placeholder="https://company.com" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Regional Settings</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select name="currency" defaultValue="USD" onValueChange={handleCurrencyChange}>
                                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="IDR">IDR (Rp)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currencySymbol">Currency Symbol</Label>
                            <Input
                                id="currencySymbol"
                                name="currencySymbol"
                                value={currencySymbol}
                                onChange={(e) => setCurrencySymbol(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency Format</Label>
                            <Select name="currencyFormat" defaultValue="standard">
                                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Standard (1,234.56)</SelectItem>
                                    <SelectItem value="european">European (1.234,56)</SelectItem>
                                    <SelectItem value="indian">Indian (1,23,456.78)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Date Format</Label>
                            <Select name="dateFormat" defaultValue="MM/dd/yyyy">
                                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (12/31/2023)</SelectItem>
                                    <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (31/12/2023)</SelectItem>
                                    <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2023-12-31)</SelectItem>
                                    <SelectItem value="dd MMM yyyy">dd MMM yyyy (31 Dec 2023)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Locale</Label>
                            <Select name="locale" defaultValue="en-US">
                                <SelectTrigger><SelectValue placeholder="Select locale" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en-US">English (US)</SelectItem>
                                    <SelectItem value="en-GB">English (UK)</SelectItem>
                                    <SelectItem value="id-ID">Indonesian</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Timezone</Label>
                            <Select name="timezone" defaultValue="UTC">
                                <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                    <SelectItem value="America/New_York">New York</SelectItem>
                                    <SelectItem value="Europe/London">London</SelectItem>
                                    <SelectItem value="Asia/Jakarta">Jakarta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    {hasExisting && (
                        <Button type="button" variant="outline" onClick={onComplete}>
                            Skip
                        </Button>
                    )}
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save & Continue
                    </Button>
                </div>
            </form>
        </div>
    );
}
