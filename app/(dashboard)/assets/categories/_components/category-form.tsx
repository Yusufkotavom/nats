"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { createAssetCategory, AssetCategoryFormData } from "../../actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Account } from "@/prisma/generated/prisma/browser";

interface CategoryFormProps {
  accounts: Account[];
}

export function CategoryForm({ accounts }: CategoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<AssetCategoryFormData>({
    name: "",
    code: "",
    description: "",
    defaultUsefulLife: 60,
    defaultMethod: "STRAIGHT_LINE",
    assetAccountId: "",
    accumDepreciationAccountId: "",
    depreciationExpenseAccountId: "",
  });

  const handleChange = (field: keyof AssetCategoryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const result = await createAssetCategory(formData);

        if (result.success) {
            toast({ title: "Category created" });
            router.push("/assets/categories");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const assetAccounts = accounts.filter(a => a.type === "asset");
  // Accum Dep is usually a contra-asset, so it's an asset type but credit balance.
  // Expense is expense.
  const expenseAccounts = accounts.filter(a => a.type === "expense");

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="code">Category Code</Label>
                    <Input 
                        id="code" 
                        value={formData.code} 
                        onChange={(e) => handleChange("code", e.target.value)} 
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Category Name</Label>
                    <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={(e) => handleChange("name", e.target.value)} 
                        required 
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="assetAccountId">Asset Account</Label>
                <Select 
                    value={formData.assetAccountId} 
                    onValueChange={(value) => handleChange("assetAccountId", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Asset Account" />
                    </SelectTrigger>
                    <SelectContent>
                        {assetAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="accumDepreciationAccountId">Accumulated Depreciation Account</Label>
                <Select 
                    value={formData.accumDepreciationAccountId} 
                    onValueChange={(value) => handleChange("accumDepreciationAccountId", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                        {assetAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="depreciationExpenseAccountId">Depreciation Expense Account</Label>
                <Select 
                    value={formData.depreciationExpenseAccountId} 
                    onValueChange={(value) => handleChange("depreciationExpenseAccountId", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                        {expenseAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="defaultUsefulLife">Default Useful Life (Months)</Label>
                    <Input 
                        id="defaultUsefulLife" 
                        type="number" 
                        value={formData.defaultUsefulLife} 
                        onChange={(e) => handleChange("defaultUsefulLife", parseInt(e.target.value))} 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="defaultMethod">Default Depreciation Method</Label>
                    <Select 
                        value={formData.defaultMethod} 
                        onValueChange={(value) => handleChange("defaultMethod", value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                            <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                            <SelectItem value="DOUBLE_DECLINING_BALANCE">Double Declining Balance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Category
            </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
