"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
  expense: {
    label: "Expenses",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type FinancialTrendsChartProps = {
  data: {
    name: string;
    revenue: number;
    expense: number;
  }[];
};

import { useFormatCurrency } from "@/hooks/use-format-currency";

export function FinancialTrendsChart({ data }: FinancialTrendsChartProps) {
  const formatCurrency = useFormatCurrency();
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="revenue" fill="var(--color-chart-1)" radius={4} />
        <Bar dataKey="expense" fill="var(--color-chart-5)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
