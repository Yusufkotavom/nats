"use client"

import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { loginDemo } from "@/app/[locale]/auth/actions";
import { Loader2, PlayCircle } from "lucide-react";

export function DemoButton({ isId }: { isId: boolean }) {
    const [state, formAction, isPending] = useActionState(loginDemo, null);

    return (
        <form action={formAction}>
            <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-primary/20 hover:bg-primary/5 hover:border-primary transition-all flex items-center gap-2"
                disabled={isPending}
            >
                {isPending ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {isId ? 'Menyiapkan Demo...' : 'Setting up Demo...'}
                    </>
                ) : (
                    <>
                        <PlayCircle className="h-5 w-5 text-primary" />
                        {isId ? 'Coba Live Demo' : 'Live Demo'}
                    </>
                )}
            </Button>
        </form>
    );
}
