import { cn } from "@/lib/utils";

function renderLine(line: string) {
  const segments = line.split(/(\*[^*]+\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith("*") && segment.endsWith("*") && segment.length >= 2) {
      return (
        <span key={`${segment}-${index}`} className="font-semibold text-stone-900">
          {segment.slice(1, -1)}
        </span>
      );
    }

    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}

export function WhatsAppMessagePreview({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const lines = message.split("\n");

  return (
    <div
      className={cn(
        "whitespace-pre-wrap rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,_#ecfdf5,_#ffffff)] p-4 text-sm leading-6 text-stone-700 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
        Preview WhatsApp
      </div>
      <div className="space-y-1">
        {lines.map((line, index) =>
          line.trim().length === 0 ? (
            <div key={`line-${index}`} className="h-4" />
          ) : (
            <p key={`line-${index}`}>{renderLine(line)}</p>
          ),
        )}
      </div>
    </div>
  );
}
