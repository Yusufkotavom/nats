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

import { useTranslations } from "next-intl"

export function TaxRatesView({ taxRates }: TaxRatesViewProps) {
  const t = useTranslations("Accounting")
  const tCommon = useTranslations("Common")
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
        <PageListTitle title={t("tax_rates")} />
        <PageListActions>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("new_tax_rate")}
          </Button>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("code")}</TableHead>
                <TableHead>{tCommon("name")}</TableHead>
                <TableHead>{t("rate_percent")}</TableHead>
                <TableHead>{tCommon("description")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
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
                        {tCommon("active")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        {tCommon("inactive")}
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
                    {t("no_tax_rates_found")}
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
            <DialogTitle>{selectedTaxRate ? t("edit_tax_rate") : t("new_tax_rate")}</DialogTitle>
            <DialogDescription>
              {t("configure_tax_rate")}
            </DialogDescription>
          </DialogHeader>
          <TaxRateForm taxRate={selectedTaxRate} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </PageListLayout>
  )
}
