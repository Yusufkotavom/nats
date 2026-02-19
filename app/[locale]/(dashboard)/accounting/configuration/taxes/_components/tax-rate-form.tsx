"use client"

import { useState } from "react"
import { TaxRate } from "@/prisma/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { CustomInput } from "@/components/ui/custom-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { createTaxRate, updateTaxRate, TaxRateFormData } from "../actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface TaxRateFormProps {
  taxRate?: TaxRate
  onSuccess: () => void
}

export function TaxRateForm({ taxRate, onSuccess }: TaxRateFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<TaxRateFormData>({
    code: taxRate?.code || "",
    name: taxRate?.name || "",
    rate: taxRate ? Number(taxRate.rate) : 0,
    description: taxRate?.description || "",
    isActive: taxRate?.isActive ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Basic validation
      if (!formData.code) {
        toast({ title: "Error", description: "Code is required", variant: "destructive" })
        setIsLoading(false)
        return
      }
      if (!formData.name) {
        toast({ title: "Error", description: "Name is required", variant: "destructive" })
        setIsLoading(false)
        return
      }

      const result = taxRate
        ? await updateTaxRate(taxRate.id, formData)
        : await createTaxRate(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: `Tax rate ${taxRate ? "updated" : "created"} successfully`,
        })
        onSuccess()
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <CustomInput
          label="Code"
          placeholder="VAT-S"
          value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
          disabled={isLoading}
        />
        <CustomInput
          label="Name"
          placeholder="Standard VAT"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={isLoading}
        />
      </div>

      <CustomInput
        label="Rate (%)"
        type="number"
        step="0.01"
        value={formData.rate}
        onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
        disabled={isLoading}
      />

      <CustomInput
        label="Description"
        placeholder="Optional description"
        value={formData.description || ""}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        disabled={isLoading}
      />

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
          disabled={isLoading}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="isActive">Active</Label>
          <p className="text-sm text-muted-foreground">
            Enable or disable this tax rate
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {taxRate ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  )
}
