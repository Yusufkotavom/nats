"use client";

import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runPayroll, approvePayrollRun } from "../../actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, CheckCircle } from "lucide-react";

// Note: For simplicity using a placeholder userId or assuming authenticated session in actions logic
// If actions require userId, we should pass it or handle in session.
// Service `approvePayrollRun` requires userId. `runPayroll` does not.

export function PayrollActions({
    periodId,
    status,
    userId,
}: {
    periodId: string;
    status: string;
    userId: string;
}) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleRunPayroll = async () => {
        setLoading(true);
        try {
            const result = await runPayroll(periodId);
            if (result.success) {
                const data = result.data ? SuperJSON.deserialize(result.data as SuperJSONResult) : null;
                // @ts-expect-error SuperJSON result is not strongly typed
                if (data?.totalSlips === 0) {
                    toast({
                        title: "No Slips Generated",
                        description: "No active employees with Salary Structures found. Please configure salary structures first.",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Success",
                        // @ts-expect-error SuperJSON result is not strongly typed
                        description: `Generated ${data?.totalSlips} salary slips`,
                    });
                }
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveRun = async () => {
        setLoading(true);
        try {
            // In a real app we'd get the actual logged in user ID
            const result = await approvePayrollRun(periodId, userId);
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Payroll run approved and finalized",
                });
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (status === "COMPLETED") {
        return (
            <Button disabled variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approved
            </Button>
        )
    }

    return (
        <div className="flex gap-2">
            <Button onClick={handleRunPayroll} disabled={loading} variant="default">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {status === "PROCESSING" ? "Re-run Payroll" : "Run Payroll"}
            </Button>
            {status === "PROCESSING" && (
                <Button onClick={handleApproveRun} disabled={loading} variant="default" className="bg-green-600 hover:bg-green-700">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Approve Run
                </Button>
            )}
        </div>
    );
}
