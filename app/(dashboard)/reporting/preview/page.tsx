import { Suspense } from "react";
import { ReportPreview } from "../_components/report-preview";
import { Loader2 } from "lucide-react";

export default function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
      <PreviewContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PreviewContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const code = params.code as string;
  
  if (!code) {
    return <div>Missing report code</div>;
  }

  // Convert rest of params to input
  const input: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    if (key !== "code") {
      input[key] = params[key];
    }
  });

  return (
    <div className="flex h-full flex-col p-4">
      <h1 className="mb-4 text-2xl font-bold">Report Preview</h1>
      <ReportPreview code={code} input={input} />
    </div>
  );
}
