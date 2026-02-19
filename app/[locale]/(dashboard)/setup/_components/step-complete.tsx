"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface StepCompleteProps {
    completedSteps: {
        companyProfile: boolean;
        chartOfAccounts: boolean;
        defaultAccounts: boolean;
        warehouse: boolean;
    };
}

export function StepComplete({ completedSteps }: StepCompleteProps) {
    const router = useRouter();

    const items = [
        { label: "Company Profile", done: completedSteps.companyProfile },
        { label: "Chart of Accounts", done: completedSteps.chartOfAccounts },
        { label: "Default Accounts", done: completedSteps.defaultAccounts },
        { label: "Warehouse & Basics", done: completedSteps.warehouse },
    ];

    return (
        <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <div>
                <h2 className="text-2xl font-semibold">You&apos;re All Set!</h2>
                <p className="text-muted-foreground mt-2">
                    Your accounting system has been configured. Here&apos;s a summary of what was set up:
                </p>
            </div>

            <div className="mx-auto max-w-sm space-y-2">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center gap-3 rounded-lg border p-3"
                    >
                        <CheckCircle2
                            className={`h-5 w-5 ${item.done
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-muted-foreground"
                                }`}
                        />
                        <span className={item.done ? "font-medium" : "text-muted-foreground"}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            <p className="text-sm text-muted-foreground">
                You can change any of these settings later in the Admin → Settings section.
            </p>

            <Button
                size="lg"
                onClick={() => router.push("/")}
                className="mt-4"
            >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
