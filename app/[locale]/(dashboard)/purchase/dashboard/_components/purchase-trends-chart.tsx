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
import { useFormatCurrency } from "@/hooks/use-format-currency";

const chartConfig = {
  amount: {
    label: "Purchases",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type PurchaseTrendsChartProps = {
  data: {
    name: string;
    amount: number;
  }[];
};

export function PurchaseTrendsChart({ data }: PurchaseTrendsChartProps) {
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
        <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
