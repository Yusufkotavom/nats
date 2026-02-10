import { Metadata } from "next"
import { getTaxRates } from "./actions"
import { TaxRatesView } from "./_components/tax-rates-view"

export const metadata: Metadata = {
  title: "Tax Rates",
  description: "Manage tax rates configuration",
}

export default async function TaxRatesPage() {
  const taxRates = await getTaxRates()
  return <TaxRatesView taxRates={taxRates} />
}
