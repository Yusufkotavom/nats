"use client"

import { Fragment, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { saveDefaultAccounts, type DefaultAccountWithAccount } from "../actions"
import { DefaultAccountPurpose } from "@/prisma/generated/prisma/client"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeftIcon, Loader2, LockIcon, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/lib/permissions/use-permission"
import { useConfirm } from "@/hooks/use-confirm"
import { useRouter } from "next/navigation"
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout"

interface DefaultAccountsViewProps {
  defaultAccounts: DefaultAccountWithAccount[]
  accounts: {
    id: string
    code: string
    name: string
    type: string
  }[]
}

const PURPOSE_LABELS: Record<DefaultAccountPurpose, string> = {
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  GOODS_RECEIVED_NOT_INVOICED: "Goods Received Not Invoiced",
  INVENTORY_ASSET: "Inventory Asset",
  COGS: "Cost of Goods Sold",
  SALES_REVENUE: "Sales Revenue",
  SALES_DISCOUNT: "Sales Discount",
  SALES_TAX_PAYABLE: "Sales Tax Payable",
  PURCHASE_TAX_RECEIVABLE: "Purchase Tax Receivable",
  CASH_ON_HAND: "Cash on Hand",
  BANK: "Bank",
  OPENING_BALANCE_EQUITY: "Opening Balance Equity",
  RETAINED_EARNINGS: "Retained Earnings",
  UNCATEGORIZED_EXPENSE: "Uncategorized Expense",
  UNCATEGORIZED_INCOME: "Uncategorized Income",
  UNCATEGORIZED_ASSET: "Uncategorized Asset",
  EXCHANGE_GAIN_LOSS: "Exchange Gain/Loss",
}

const PURPOSE_DESCRIPTIONS: Record<DefaultAccountPurpose, string> = {
  ACCOUNTS_RECEIVABLE: "Tracks money owed to the business by customers for goods or services sold on credit.",
  ACCOUNTS_PAYABLE: "Tracks money owed by the business to suppliers or vendors for goods or services purchased on credit.",
  GOODS_RECEIVED_NOT_INVOICED: "Liability account for goods received but not yet invoiced by the vendor.",
  INVENTORY_ASSET: "Tracks the value of goods held for sale or materials used in production.",
  COGS: "Tracks the direct costs attributable to the production of the goods sold in a company.",
  SALES_REVENUE: "The default income account for recording revenue from sales of products or services.",
  SALES_DISCOUNT: "Tracks discounts given to customers, reducing the total sales revenue.",
  SALES_TAX_PAYABLE: "Tracks sales tax collected from customers that needs to be remitted to the tax authority.",
  PURCHASE_TAX_RECEIVABLE: "Tracks tax paid on purchases that can be claimed back or offset against sales tax payable.",
  CASH_ON_HAND: "Represents physical cash kept at the business location (e.g., petty cash, cash register).",
  BANK: "The primary bank account used for business transactions.",
  OPENING_BALANCE_EQUITY: "Used to record opening balances when setting up accounts to ensure the balance sheet balances.",
  RETAINED_EARNINGS: "Tracks the cumulative net earnings or profits of the business that have not been distributed to owners.",
  UNCATEGORIZED_EXPENSE: "A holding account for expenses that haven't been assigned a specific category yet.",
  UNCATEGORIZED_INCOME: "A holding account for income that hasn't been assigned a specific category yet.",
  UNCATEGORIZED_ASSET: "A holding account for assets that haven't been assigned a specific category yet.",
  EXCHANGE_GAIN_LOSS: "Tracks gains or losses resulting from fluctuations in exchange rates for foreign currency transactions.",
}

const PURPOSE_CATEGORIES: Record<string, DefaultAccountPurpose[]> = {
  "Sales & Receivables": [
    "SALES_REVENUE",
    "SALES_DISCOUNT",
    "ACCOUNTS_RECEIVABLE",
    "SALES_TAX_PAYABLE",
  ],
  "Purchases & Payables": [
    "ACCOUNTS_PAYABLE",
    "PURCHASE_TAX_RECEIVABLE",
    "GOODS_RECEIVED_NOT_INVOICED",
    "COGS",
    "INVENTORY_ASSET",
  ],
  "Cash & Bank": [
    "CASH_ON_HAND",
    "BANK",
  ],
  "Equity & Others": [
    "OPENING_BALANCE_EQUITY",
    "RETAINED_EARNINGS",
    "UNCATEGORIZED_ASSET",
    "UNCATEGORIZED_EXPENSE",
    "UNCATEGORIZED_INCOME",
    "EXCHANGE_GAIN_LOSS",
  ],
}

export function DefaultAccountsView({ defaultAccounts, accounts }: DefaultAccountsViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const canEdit = usePermission("default_accounts.manage")
  const confirm = useConfirm()
  const router = useRouter()

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setChanges({})
  }

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      setIsEditing(false)
      return
    }

    if (await confirm({
      title: "Save Changes",
      description: "Are you sure you want to apply these changes? Previous configuration will be disabled."
    })) {
      setIsSaving(true)
      try {
        const updates = Object.entries(changes).map(([purpose, accountId]) => ({
          purpose: purpose as DefaultAccountPurpose,
          accountId
        }))

        const result = await saveDefaultAccounts(updates)
        if (result.success) {
          toast({
            title: "Success",
            description: "Default accounts updated successfully",
          })
          setIsEditing(false)
          setChanges({})
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update default accounts",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error(error)
        toast({
          title: "Error",
          description: "An error occurred",
          variant: "destructive",
        })
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleChange = (purpose: DefaultAccountPurpose, accountId: string | null) => {
    if (!accountId) return
    setChanges(prev => ({ ...prev, [purpose]: accountId }))
  }

  const accountOptions = accounts.map(a => ({
    value: a.id,
    label: `${a.code} - ${a.name} (${a.type})`
  }))

  const getDefaultAccountId = (purpose: DefaultAccountPurpose) => {
    if (isEditing && changes[purpose]) return changes[purpose]
    return defaultAccounts.find(da => da.purpose === purpose)?.accountId || null
  }

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Default Accounts" />
        <PageListActions className="flex justify-end gap-1">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleEdit} disabled={!canEdit}>
                <LockIcon className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => router.back()} disabled={!canEdit}>
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </Button>
            </>
          )}
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Purpose</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[30%]">Default Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(PURPOSE_CATEGORIES).map(([category, purposes]) => (
              <Fragment key={category}>
                <TableRow key={category} className="bg-muted hover:bg-muted">
                  <TableCell colSpan={3} className="font-semibold">
                    {category}
                  </TableCell>
                </TableRow>
                {purposes.map((purpose) => (
                  <TableRow key={purpose}>
                    <TableCell className="font-medium align-middle">
                      {PURPOSE_LABELS[purpose]}
                    </TableCell>
                    <TableCell className="text-muted-foreground align-middle">
                      {PURPOSE_DESCRIPTIONS[purpose]}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="relative">
                        <SearchableSelect
                          options={accountOptions}
                          value={getDefaultAccountId(purpose)}
                          onValueChange={(val) => handleChange(purpose, val)}
                          placeholder="Select account..."
                          disabled={!isEditing || isSaving}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </PageListContent>
    </PageListLayout>
  )
}
