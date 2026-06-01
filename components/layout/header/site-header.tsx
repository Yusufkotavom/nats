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
import { isKnownAppRoute } from "@/lib/navigation/known-routes";

// ...

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter((segment) => segment !== "").slice(1);
  const t = useTranslations();

  const breadcrumbs = segments
    .map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const isLast = index === segments.length - 1;
      const isUuid = isLast && segment.length > 20;
      const tPath = index === 0 ? `Navigation.${segment}` : toTitleCase(`${segments.slice(0, index + 1).join(".")}`);

      let title = segment;
      if (!isUuid) {
        if (t.has(tPath as any)) {
          title = t(tPath as any);
        } else {
          // Fallback nicely formatted text (e.g. document-numbering -> Document Numbering)
          title = segment.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        }
      }

      const isNavigable = !isLast && isKnownAppRoute(href);

      return (
        <React.Fragment key={href}>
          <BreadcrumbItem>
            {isLast || !isNavigable ? (
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
    <header className="sticky top-0 z-10 bg-background shrink-0 border-b transition-[width,height] ease-linear">
      <div className="flex h-(--header-height) w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeCustomizer />
          <ModeToggle />
        </div>
      </div>
      <div className="border-t px-4 py-2 lg:hidden">
        <div className="overflow-x-auto">
          <Breadcrumb className="min-w-max">
            <BreadcrumbList className="flex-nowrap">
              {breadcrumbs.length > 0 ? (
                breadcrumbs
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage>{t('Common.home')}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
      <div className="hidden px-4 py-2 lg:block lg:px-6">
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
      </div>
    </header>
  );
}
