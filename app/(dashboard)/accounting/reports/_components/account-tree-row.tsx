import { ReportAccountLine } from "../actions";
import { cn } from "@/lib/utils";

interface AccountTreeRowProps {
  node: ReportAccountLine;
  level?: number;
}

export function AccountTreeRow({ node, level = 0 }: AccountTreeRowProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = level * 20 + (hasChildren ? 0 : 20);

  return (
    <>
      <div
        className={cn(
          "flex justify-between py-1 border-b border-border/50",
          level === 0 && "font-semibold"
        )}
      >
        <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex-1">
          {node.code} - {node.name}
        </div>
        <div className="w-32 text-right">
          {hasChildren
            ? ""
            : node.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
        </div>
      </div>
      {hasChildren && (
        <>
          {node.children!.map((child) => (
            <AccountTreeRow
              key={child.accountId}
              node={child}
              level={level + 1}
            />
          ))}
          <div className="flex justify-between py-1 font-medium bg-muted/20">
            <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex-1">
              Total {node.name}
            </div>
            <div className="w-32 text-right border-t border-black/20">
              {node.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
