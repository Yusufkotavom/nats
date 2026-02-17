"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StepCompanyProfile } from "./step-company-profile";
import { StepChartOfAccounts } from "./step-chart-of-accounts";
import { StepDefaultAccounts } from "./step-default-accounts";
import { StepWarehouse } from "./step-warehouse";
import { StepComplete } from "./step-complete";
import type { SetupStatus } from "../actions";
import {
    Building2,
    BookOpen,
    Settings2,
    Warehouse,
    CheckCircle2,
} from "lucide-react";

const WIZARD_STEPS = [
    { id: "company", label: "Company Profile", icon: Building2 },
    { id: "accounts", label: "Chart of Accounts", icon: BookOpen },
    { id: "defaults", label: "Default Accounts", icon: Settings2 },
    { id: "warehouse", label: "Warehouse & Basics", icon: Warehouse },
    { id: "complete", label: "All Done", icon: CheckCircle2 },
] as const;

type AccountOption = {
    id: string;
    code: string;
    name: string;
    type: string;
};

type ExistingDefault = {
    purpose: string;
    accountId: string;
};

interface SetupWizardProps {
    initialStatus: SetupStatus;
    accounts: AccountOption[];
    existingDefaults: ExistingDefault[];
}

export function SetupWizard({
    initialStatus,
    accounts,
    existingDefaults,
}: SetupWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [status, setStatus] = useState(initialStatus);

    const goToNextStep = () => {
        setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    };

    const completedSteps = {
        companyProfile: status.hasCompanyProfile,
        chartOfAccounts: status.accountCount > 0,
        defaultAccounts: status.defaultAccountCount > 0,
        warehouse: status.warehouseCount > 0,
    };

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome to NATS Accounting
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Let&apos;s set up your accounting system in a few easy steps.
                </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-1">
                {WIZARD_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isPast = index < currentStep;

                    return (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => {
                                    if (isPast) setCurrentStep(index);
                                }}
                                disabled={!isPast}
                                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${isActive
                                        ? "bg-primary text-primary-foreground"
                                        : isPast
                                            ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden md:inline">{step.label}</span>
                            </button>
                            {index < WIZARD_STEPS.length - 1 && (
                                <div
                                    className={`mx-1 h-px w-6 ${isPast ? "bg-primary" : "bg-border"
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <Card>
                <CardContent className="p-6 md:p-8">
                    {currentStep === 0 && (
                        <StepCompanyProfile
                            onComplete={() => {
                                setStatus((s) => ({ ...s, hasCompanyProfile: true }));
                                goToNextStep();
                            }}
                            hasExisting={status.hasCompanyProfile}
                        />
                    )}
                    {currentStep === 1 && (
                        <StepChartOfAccounts
                            onComplete={goToNextStep}
                            existingAccountCount={status.accountCount}
                        />
                    )}
                    {currentStep === 2 && (
                        <StepDefaultAccounts
                            onComplete={() => {
                                setStatus((s) => ({ ...s, defaultAccountCount: 17 }));
                                goToNextStep();
                            }}
                            accounts={accounts}
                            existingDefaults={existingDefaults as any}
                            existingDefaultCount={status.defaultAccountCount}
                        />
                    )}
                    {currentStep === 3 && (
                        <StepWarehouse
                            onComplete={() => {
                                setStatus((s) => ({
                                    ...s,
                                    warehouseCount: Math.max(s.warehouseCount, 1),
                                    unitCount: Math.max(s.unitCount, 3),
                                }));
                                goToNextStep();
                            }}
                            existingWarehouseCount={status.warehouseCount}
                            existingUnitCount={status.unitCount}
                        />
                    )}
                    {currentStep === 4 && (
                        <StepComplete completedSteps={completedSteps} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
