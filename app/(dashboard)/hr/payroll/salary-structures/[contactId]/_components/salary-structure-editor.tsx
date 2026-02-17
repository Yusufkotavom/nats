"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Edit } from "lucide-react";
import { configureSalaryStructure, getSalaryComponents } from "@/app/(dashboard)/hr/payroll/actions";
import { SalaryComponentType } from "@/prisma/generated/prisma/client";

interface SalaryItem {
    componentId: string;
    amount: number;
    formula: string;
    typePlaceholder?: SalaryComponentType;
    component?: {
        id: string;
        name: string;
        type: SalaryComponentType;
    };
}

interface SalaryStructureEditorProps {
    contactId: string;
    initialStructure: any;
}

export function SalaryStructureEditor({ contactId, initialStructure }: SalaryStructureEditorProps) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [baseSalary, setBaseSalary] = useState<number>(0);
    const [items, setItems] = useState<SalaryItem[]>([]);
    const [availableComponents, setAvailableComponents] = useState<any[]>([]);

    useEffect(() => {
        if (initialStructure) {
            setBaseSalary(Number(initialStructure.baseSalary));
            setItems(
                initialStructure.items?.map((item: any) => ({
                    componentId: item.componentId,
                    amount: Number(item.amount),
                    formula: item.formula,
                    component: item.component,
                })) ?? []
            );
        }
    }, [initialStructure]);

    useEffect(() => {
        async function fetchComponents() {
            const result = await getSalaryComponents();
            if (result.success) {
                setAvailableComponents(result.data || []);
            }
        }
        if (isEditing) {
            fetchComponents();
        }
    }, [isEditing]);

    const handleAddItem = (type: SalaryComponentType) => {
        setItems([...items, { componentId: "", amount: 0, formula: "", typePlaceholder: type }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === "componentId") {
            const component = availableComponents.find((c) => c.id === value);
            newItems[index] = { ...newItems[index], componentId: value, component };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!baseSalary || baseSalary < 0) {
            toast({ title: "Error", description: "Base Salary is required and must be positive", variant: "destructive" });
            return;
        }

        for (const item of items) {
            if (!item.componentId) {
                toast({ title: "Error", description: "All items must have a selected component", variant: "destructive" });
                return;
            }
            if (!item.amount || item.amount < 0) {
                toast({
                    title: "Error",
                    description: `Amount for ${item.component?.name || "item"} is invalid`,
                    variant: "destructive",
                });
                return;
            }
        }

        setLoading(true);
        try {
            const result = await configureSalaryStructure({
                name: "Standard Structure",
                contactId,
                baseSalary,
                items: items.map((item) => ({
                    componentId: item.componentId,
                    amount: item.amount,
                    formula: item.formula,
                })),
            });

            if (result.success) {
                toast({ title: "Success", description: "Salary structure updated" });
                setIsEditing(false);
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to save", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const earnings = items.filter((i) => (i.component?.type || i.typePlaceholder) === SalaryComponentType.EARNING);
    const deductions = items.filter((i) => (i.component?.type || i.typePlaceholder) === SalaryComponentType.DEDUCTION);

    if (!isEditing) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Salary Structure</CardTitle>
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Structure
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Base Salary</Label>
                            <div className="text-2xl font-bold">{baseSalary.toLocaleString()}</div>
                        </div>
                    </div>

                    <ComponentTable title="Earnings" items={earnings} />
                    <ComponentTable title="Deductions" items={deductions} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Edit Salary Structure</CardTitle>
                <div className="flex space-x-2">
                    <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 max-w-sm">
                    <div className="space-y-2">
                        <Label>Base Salary</Label>
                        <Input
                            type="number"
                            value={baseSalary}
                            onChange={(e) => setBaseSalary(Number(e.target.value))}
                        />
                    </div>
                </div>

                <EditableComponentSection
                    title="Earnings"
                    type={SalaryComponentType.EARNING}
                    items={items}
                    availableComponents={availableComponents}
                    onAdd={handleAddItem}
                    onRemove={handleRemoveItem}
                    onChange={handleItemChange}
                />

                <EditableComponentSection
                    title="Deductions"
                    type={SalaryComponentType.DEDUCTION}
                    items={items}
                    availableComponents={availableComponents}
                    onAdd={handleAddItem}
                    onRemove={handleRemoveItem}
                    onChange={handleItemChange}
                />
            </CardContent>
        </Card>
    );
}

function ComponentTable({ title, items }: { title: string; items: SalaryItem[] }) {
    return (
        <div>
            <h4 className="mb-2 font-medium">{title}</h4>
            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No {title.toLowerCase()}.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{item.component?.name}</TableCell>
                                <TableCell className="text-right">{Number(item.amount).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}

function EditableComponentSection({
    title,
    type,
    items,
    availableComponents,
    onAdd,
    onRemove,
    onChange,
}: {
    title: string;
    type: SalaryComponentType;
    items: SalaryItem[];
    availableComponents: any[];
    onAdd: (type: SalaryComponentType) => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: string, value: any) => void;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{title}</h4>
                <Button size="sm" variant="outline" onClick={() => onAdd(type)}>
                    <Plus className="mr-2 h-4 w-4" /> Add {title.slice(0, -1)}
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="w-[200px]">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, idx) => {
                        const itemType = item.component?.type || item.typePlaceholder;
                        if (itemType !== type) return null;

                        return (
                            <TableRow key={idx}>
                                <TableCell>
                                    <Select
                                        value={item.componentId}
                                        onValueChange={(val) => onChange(idx, "componentId", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select component" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableComponents
                                                .filter((c) => c.type === type)
                                                .map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) => onChange(idx, "amount", Number(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button size="icon" variant="ghost" onClick={() => onRemove(idx)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
