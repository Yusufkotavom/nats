"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();

    const switchLocale = (newLocale: string) => {
        // pathname starts with /en or /id
        // split("/") gives ["", "en", "dashboard", ...]
        const segments = pathname.split("/");
        if (segments.length > 1) {
            segments[1] = newLocale;
            const newPath = segments.join("/");
            router.push(newPath);
        } else {
            // Fallback if something is weird, though middleware ensures locale
            router.push(`/${newLocale}`);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Switch Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => switchLocale("en")}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("id")}>
                    Bahasa Indonesia
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
