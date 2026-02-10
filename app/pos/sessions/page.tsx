import { getPOSSessions } from "@/app/pos/actions";
import { POSSessionsTable } from "./_components/pos-sessions-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function POSSessionsPage() {
  const sessions = await getPOSSessions();

  return (
    <div className="flex h-screen flex-col bg-muted/20">
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">POS Session History</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <POSSessionsTable sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
