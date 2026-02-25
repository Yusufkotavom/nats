"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import React from "react";
import { ModeToggle } from "@/components/layout/others/mode-toggle";
import { ThemeCustomizer } from "@/components/layout/others/theme-customizer";
import { useTranslations } from "next-intl";

export function ManagementHeader() {
    const pathname = usePathname();
    // Filter out empty segments and 'management' prefix if we want
    const segments = pathname.split("/").filter((segment) => segment !== "");

    // Optionally prefix with management if management wasn't the base
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        let title = segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
            <React.Fragment key={href}>
                <BreadcrumbItem>
                    {isLast ? (
                        <BreadcrumbPage>
                            {title}
                        </BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink href={href}>
                            {title}
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
        );
    });

    return (
        <header className="sticky top-0 z-10 bg-background flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />

                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.length > 0 ? (
                            breadcrumbs
                        ) : (
                            <BreadcrumbItem>
                                <BreadcrumbPage>Management</BreadcrumbPage>
                            </BreadcrumbItem>
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-2">
                    <ThemeCustomizer />
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}
