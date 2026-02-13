"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Printer, FileText } from "lucide-react";
import { useFormatDate } from "@/hooks/use-format-date";
import { ReportPreviewDialog } from "@/app/(dashboard)/reporting/_components/report-preview-dialog";
import { useState } from "react";

interface ExportButtonProps {
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  isLoading?: boolean;

  // PDF Report Props
  reportCode?: string;
  reportInput?: any;
  reportTitle?: string;
}

export function ExportButton({
  onExportCSV,
  onExportExcel,
  onPrint,
  isLoading,
  reportCode,
  reportInput,
  reportTitle,
}: ExportButtonProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePrint = () => {
    if (reportCode && reportInput) {
      setIsPreviewOpen(true);
    } else if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading}>
          {reportCode ? <FileText className="mr-2 h-4 w-4" /> : <Printer className="mr-2 h-4 w-4" />}
          {reportCode ? "PDF Preview" : "Print"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onExportCSV && (
              <DropdownMenuItem onClick={onExportCSV}>
                Export as CSV
              </DropdownMenuItem>
            )}
            {onExportExcel && (
              <DropdownMenuItem onClick={onExportExcel}>
                Export as Excel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {reportCode && reportInput && (
        <ReportPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          code={reportCode}
          input={reportInput}
          title={reportTitle || "Report Preview"}
        />
      )}
    </>
  );
}

// Helper to convert data to CSV
export function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
