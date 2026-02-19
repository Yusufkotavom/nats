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
import { toTitleCase } from "@/lib/utils";

// ...

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const t = useTranslations();

  const breadcrumbs = segments.filter((_, index) => index > 0).map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    // Try to get translation from Navigation, fall back to title case
    // Note: We need a way to check if key exists or just let it return key?
    // next-intl returns key if missing.
    // For now, let's assume we want to translate mostly known segments.
    // Or just use title case if translation is missing (not easy to check without extra config).
    // Let's use t('Navigation.' + segment) and rely on us populating Navigation keys.
    // However, segment might be an ID (uuid).
    // If segment looks like UUID, don't translate.
    // Simple check: length > 20?
    const isUuid = segment.length > 20 && segment.includes('-');
    const title = isUuid ? segment : t(`Navigation.${segment}`);

    return (
      <React.Fragment key={href}>
        <BreadcrumbItem>
          {isLast ? (
            <BreadcrumbPage>
              {isUuid ? segment : toTitleCase(title === `Navigation.${segment}` ? segment.replace("-", " ") : title)}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink href={href}>
              {isUuid ? segment : toTitleCase(title === `Navigation.${segment}` ? segment.replace("-", " ") : title)}
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
                <BreadcrumbPage>{t('Common.home')}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeCustomizer />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
