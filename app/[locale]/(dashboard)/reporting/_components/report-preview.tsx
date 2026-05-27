"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { clientRegistry } from "@/lib/reporting/client-registry";
import { getReportData } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { ReportContext } from "@/lib/reporting/types";
import { POSReceiptHtmlPreview } from "@/app/[locale]/pos/_reports/receipt/html-preview";
import { Button } from "@/components/ui/button";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

import { cn } from "@/lib/utils";

interface ReportPreviewProps {
  code: string;
  input: any;
  className?: string;
}

export function ReportPreview({ code, input, className }: ReportPreviewProps) {
  const [data, setData] = useState<ReportContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [nativePdfUrl, setNativePdfUrl] = useState<string | null>(null);
  const [nativePdfLoading, setNativePdfLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getReportData(code, input);
        if (res.success && res.data) {
          setData(SuperJSON.deserialize(res.data));
        } else {
          setError(res.error || "Failed to load report data");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code, JSON.stringify(input)]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    return () => {
      if (nativePdfUrl) {
        URL.revokeObjectURL(nativePdfUrl);
      }
    };
  }, [nativePdfUrl]);

  useEffect(() => {
    if (!data || code === "POS_RECEIPT") return;
    const ReportComponent = clientRegistry[code as keyof typeof clientRegistry];
    if (!ReportComponent) return;

    let cancelled = false;
    setNativePdfLoading(true);

    void import("@react-pdf/renderer")
      .then(async (mod) => {
        const blob = await mod.pdf(<ReportComponent {...data} />).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setNativePdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to generate PDF");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNativePdfLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data, code]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Generating Report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-destructive">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const ReportComponent = clientRegistry[code as keyof typeof clientRegistry];

  if (code === "POS_RECEIPT") {
    return <POSReceiptHtmlPreview {...data} />;
  }

  if (!ReportComponent) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-destructive">
        <p>Report template not found for code: {code}</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={cn("flex h-[70vh] flex-col items-center justify-center gap-3 rounded-md border p-4", className)}>
        {nativePdfLoading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Generating PDF for mobile preview...</p>
          </>
        ) : nativePdfUrl ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <a href={nativePdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open PDF in New Tab
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={nativePdfUrl} download={`${code}.pdf`}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to prepare mobile PDF preview.</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("h-[calc(100vh-100px)] w-full overflow-hidden rounded-md border shadow-sm", className)}>
      <div className="flex items-center justify-end border-b bg-background/95 px-3 py-2">
        <Button variant="outline" size="sm" asChild disabled={!nativePdfUrl || nativePdfLoading}>
          <a href={nativePdfUrl || "#"} download={`${code}.pdf`}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
      </div>
      <PDFViewer width="100%" height="100%" className="border-none">
        <ReportComponent {...data} />
      </PDFViewer>
    </div>
  );
}
