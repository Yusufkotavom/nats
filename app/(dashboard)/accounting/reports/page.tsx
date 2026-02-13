import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  Percent,
} from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      title: "Profit and Loss",
      description:
        "Analyze your revenue, expenses, and net income over a specific period.",
      href: "/accounting/reports/profit-loss",
      icon: TrendingUp,
    },
    {
      title: "Balance Sheet",
      description:
        "View your assets, liabilities, and equity at a specific point in time.",
      href: "/accounting/reports/balance-sheet",
      icon: Landmark,
    },
    {
      title: "Cash Flow",
      description:
        "Track the inflow and outflow of cash from operating, investing, and financing activities.",
      href: "/accounting/reports/cash-flow",
      icon: ArrowLeftRight,
    },
    {
      title: "Statement of Changes in Equity",
      description:
        "See how your equity has changed over a period due to income and distributions.",
      href: "/accounting/reports/equity",
      icon: BarChart3,
    },
    {
      title: "Tax Summary",
      description:
        "View comprehensive VAT/Tax input and output summary and net liability.",
      href: "/accounting/reports/tax-summary",
      icon: Percent,
    },
    {
      title: "Financial Ratios",
      description:
        "Analyze key financial ratios including liquidity, profitability, and solvency metrics.",
      href: "/accounting/reports/ratios",
      icon: BarChart3,
    },
    {
      title: "Data Validation",
      description:
        "Check for data integrity issues such as unbalanced journal entries.",
      href: "/accounting/reports/validation",
      icon: TrendingUp, // Using generic icon for now, maybe AlertTriangle if available
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-lg font-bold mb-2">Financial Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Link href={report.href} key={report.href}>
            <Card className="from-primary/5 bg-linear-to-t hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">
                  {report.title}
                </CardTitle>
                <report.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mt-2">
                  {report.description}
                </CardDescription>
                <div className="flex items-center text-sm text-primary mt-4 font-medium">
                  View Report <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
