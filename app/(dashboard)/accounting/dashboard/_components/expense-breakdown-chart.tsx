"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useFormatCurrency } from "@/hooks/use-format-currency";

const chartConfig = {
  amount: {
    label: "Amount",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

type ExpenseBreakdownChartProps = {
  data: {
    name: string;
    value: number;
  }[];
};

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const formatCurrency = useFormatCurrency();
  // Assign colors dynamically
  const coloredData = data.map((item, index) => ({
    ...item,
    fill: `var(--color-chart-${(index % 5) + 1})`,
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[300px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Pie
          data={coloredData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          strokeWidth={5}
        />
      </PieChart>
    </ChartContainer>
  );
}
