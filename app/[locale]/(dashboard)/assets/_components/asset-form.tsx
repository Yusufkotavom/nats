"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { createAsset, updateAsset, AssetFormData } from "../actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AssetCategory, DepreciationMethod } from "@/prisma/generated/prisma/browser";
import {
    PageFormLayout,
    PageFormHeader,
    PageFormTitle,
    PageFormActions,
    PageFormContent,
} from "@/components/layout/page/form-layout";

interface AssetFormProps {
    initialData?: any;
    categories: AssetCategory[];
}

import { useTranslations } from "next-intl";

export function AssetForm({ initialData, categories }: AssetFormProps) {
    const t = useTranslations("Assets");
    const tCommon = useTranslations("Common");
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<AssetFormData>({
        code: initialData?.code || "",
        name: initialData?.name || "",
        description: initialData?.description || "",
        serialNumber: initialData?.serialNumber || "",
        barcode: initialData?.barcode || "",
        purchaseDate: initialData?.purchaseDate ? new Date(initialData.purchaseDate) : new Date(),
        acquisitionCost: initialData?.acquisitionCost ? Number(initialData.acquisitionCost) : 0,
        residualValue: initialData?.residualValue ? Number(initialData.residualValue) : 0,
        usefulLife: initialData?.usefulLife || 60,
        depreciationMethod: initialData?.depreciationMethod || "STRAIGHT_LINE",
        categoryId: initialData?.categoryId || "",
        location: initialData?.location || "",
        department: initialData?.department || "",
        assignedTo: initialData?.assignedTo || "",
    });

    const handleChange = (field: keyof AssetFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let result;
            if (initialData) {
                result = await updateAsset(initialData.id, formData);
            } else {
                result = await createAsset(formData);
            }

            if (result.success) {
                toast({ title: initialData ? t("asset_updated") : t("asset_created") });
                router.push("/assets");
            } else {
                toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: tCommon("error"), description: "Something went wrong", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PageFormLayout>
                <PageFormHeader>
                    <PageFormTitle title={t("asset_information")} />
                    <PageFormActions>
                        <Button variant="outline" type="button" onClick={() => router.back()}>{tCommon("cancel")}</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("save_asset")}
                        </Button>
                    </PageFormActions>
                </PageFormHeader>

                <PageFormContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">{t("asset_code")}</Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => handleChange("code", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">{t("asset_name")}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="categoryId">{t("category")}</Label>
                            <Select
                                value={formData.categoryId}
                                onValueChange={(value) => {
                                    handleChange("categoryId", value);
                                    // Auto-fill defaults if creating
                                    if (!initialData) {
                                        const cat = categories.find(c => c.id === value);
                                        if (cat) {
                                            if (cat.defaultUsefulLife) handleChange("usefulLife", cat.defaultUsefulLife);
                                            if (cat.defaultMethod) handleChange("depreciationMethod", cat.defaultMethod);
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={tCommon("select_category")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="purchaseDate">{t("purchase_date")}</Label>
                                <Input
                                    id="purchaseDate"
                                    type="date"
                                    value={formData.purchaseDate instanceof Date ? formData.purchaseDate.toISOString().split('T')[0] : formData.purchaseDate}
                                    onChange={(e) => handleChange("purchaseDate", new Date(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="acquisitionCost">{t("acquisition_cost")}</Label>
                                <Input
                                    id="acquisitionCost"
                                    type="number"
                                    step="0.01"
                                    value={formData.acquisitionCost}
                                    onChange={(e) => handleChange("acquisitionCost", parseFloat(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="residualValue">{t("residual_value")}</Label>
                                <Input
                                    id="residualValue"
                                    type="number"
                                    step="0.01"
                                    value={formData.residualValue}
                                    onChange={(e) => handleChange("residualValue", parseFloat(e.target.value))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="usefulLife">{t("useful_life_months")}</Label>
                                <Input
                                    id="usefulLife"
                                    type="number"
                                    value={formData.usefulLife}
                                    onChange={(e) => handleChange("usefulLife", parseInt(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="depreciationMethod">{t("depreciation_method")}</Label>
                                <Select
                                    value={formData.depreciationMethod}
                                    onValueChange={(value) => handleChange("depreciationMethod", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STRAIGHT_LINE">{t("straight_line")}</SelectItem>
                                        <SelectItem value="DECLINING_BALANCE">{t("declining_balance")}</SelectItem>
                                        <SelectItem value="DOUBLE_DECLINING_BALANCE">{t("double_declining_balance")}</SelectItem>
                                        <SelectItem value="NO_DEPRECIATION">{t("no_depreciation")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{tCommon("description")}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange("description", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serialNumber">{t("serial_number")}</Label>
                                <Input
                                    id="serialNumber"
                                    value={formData.serialNumber}
                                    onChange={(e) => handleChange("serialNumber", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">{tCommon("location")}</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => handleChange("location", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </PageFormContent>
            </PageFormLayout>
        </form>
    );
}
