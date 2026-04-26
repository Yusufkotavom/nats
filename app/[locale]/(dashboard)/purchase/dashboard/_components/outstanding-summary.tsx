"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
    label: "Outstanding Amount",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

type OutstandingSummaryProps = {
  data: {
    name: string;
    amount: number;
  }[];
};

export function OutstandingSummary({ data }: OutstandingSummaryProps) {
  const formatCurrency = useFormatCurrency();

  if (data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No outstanding payments to vendors
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 20 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <XAxis dataKey="amount" type="number" hide />
        <ChartTooltip
          cursor={{ fill: "transparent" }}
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Bar
          dataKey="amount"
          fill="var(--color-chart-4)"
          radius={4}
          barSize={32}
        />
      </BarChart>
    </ChartContainer>
  );
}
