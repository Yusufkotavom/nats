"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSalaryHistory } from "@/app/(dashboard)/hr/payroll/actions";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SalaryStructureHistoryProps {
    contactId: string;
}

export function SalaryStructureHistory({ contactId }: SalaryStructureHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            setLoading(true);
            const result = await getSalaryHistory(contactId);
            if (result.success && result.data) {
                const data = SuperJSON.deserialize(result.data as SuperJSONResult);
                setHistory(data as any[]);
            }
            setLoading(false);
        }

        fetchHistory();
    }, [contactId]);

    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (history.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Salary History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Effective Date</TableHead>
                            <TableHead>Base Salary</TableHead>
                            <TableHead>Total Components</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map((structure) => (
                            <TableRow key={structure.id}>
                                <TableCell>
                                    {format(new Date(structure.createdAt), "PPP p")}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {Number(structure.baseSalary).toLocaleString()}
                                </TableCell>
                                <TableCell>{structure.items.length}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={structure.isActive ? "default" : "secondary"}
                                        className={!structure.isActive ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : ""}
                                    >
                                        {structure.isActive ? "Active" : "Archived"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {structure.createdBy ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={`https://avatar.vercel.sh/${structure.createdBy.email}`} />
                                                <AvatarFallback>{structure.createdBy.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{structure.createdBy.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
