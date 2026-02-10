"use client"

import { useState } from "react"
import { TaxRate } from "@/prisma/generated/prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TaxRateForm } from "./tax-rate-form"
import { Plus, Edit2 } from "lucide-react"
import { PageListLayout, PageListHeader, PageListTitle, PageListActions, PageListContent } from "@/components/layout/page/list-layout"
import { Badge } from "@/components/ui/badge"

interface TaxRatesViewProps {
  taxRates: TaxRate[]
}

export function TaxRatesView({ taxRates }: TaxRatesViewProps) {
  const [open, setOpen] = useState(false)
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | undefined>(undefined)

  const handleEdit = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate)
    setOpen(true)
  }

  const handleCreate = () => {
    setSelectedTaxRate(undefined)
    setOpen(true)
  }

  const handleSuccess = () => {
    setOpen(false)
    setSelectedTaxRate(undefined)
  }

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Tax Rates" />
        <PageListActions>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Tax Rate
          </Button>
        </PageListActions>
      </PageListHeader>
      
      <PageListContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Rate (%)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates.map((taxRate) => (
                <TableRow key={taxRate.id}>
                  <TableCell className="font-medium">{taxRate.code}</TableCell>
                  <TableCell>{taxRate.name}</TableCell>
                  <TableCell>{Number(taxRate.rate).toFixed(2)}%</TableCell>
                  <TableCell>{taxRate.description}</TableCell>
                  <TableCell>
                    {taxRate.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(taxRate)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {taxRates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No tax rates found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageListContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTaxRate ? "Edit Tax Rate" : "New Tax Rate"}</DialogTitle>
            <DialogDescription>
              Configure tax rate details. Code must be unique.
            </DialogDescription>
          </DialogHeader>
          <TaxRateForm taxRate={selectedTaxRate} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </PageListLayout>
  )
}
