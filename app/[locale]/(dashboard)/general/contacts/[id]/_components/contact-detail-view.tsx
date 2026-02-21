"use client";

import {
  PageFormLayout,
  PageFormHeader,
  PageFormTitle,
} from "@/components/layout/page/form-layout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Mail, Phone, MapPin, Calendar, Clock } from "lucide-react";
import { useFormatDate } from "@/hooks/use-format-date";
import { Contact, ContactType } from "@/prisma/generated/prisma/browser";
import { useTranslations } from "next-intl";


interface ContactDetailViewProps {
  contact: Contact;
}

export function ContactDetailView({ contact }: ContactDetailViewProps) {
  const formatDate = useFormatDate();
  const t = useTranslations("General.Contacts");

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case ContactType.CUSTOMER:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900 dark:text-blue-300 border-transparent";
      case ContactType.VENDOR:
        return "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900 dark:text-orange-300 border-transparent";
      case ContactType.EMPLOYEE:
        return "bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-900 dark:text-purple-300 border-transparent";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300 border-transparent";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case ContactType.CUSTOMER:
        return t("customer");
      case ContactType.VENDOR:
        return t("vendor");
      case ContactType.EMPLOYEE:
        return t("employee");
      default:
        return type;
    }
  };

  return (
    <PageFormLayout>
      <PageFormHeader>
        <PageFormTitle>
          <div className="flex items-center gap-4">
            <span>{contact.name}</span>
            <div className="flex items-center gap-2">
              <Badge
                className={getTypeBadgeColor(contact.type)}
                variant="outline"
              >
                {getTypeLabel(contact.type)}
              </Badge>
              <Badge variant={contact.isActive ? "default" : "secondary"}>
                {contact.isActive ? t("active") : t("inactive")}
              </Badge>
            </div>
          </div>
        </PageFormTitle>
      </PageFormHeader>

      <Card>
        <CardHeader>
          <CardTitle>{t("contact_info")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("email")}:</span>
              <span className="text-sm">{contact.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("phone")}:</span>
              <span className="text-sm">{contact.phone || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("address")}:</span>
              <span className="text-sm">{contact.address || "-"}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("created_at")}</span>
              <span className="text-sm">
                {formatDate(contact.createdAt, { includeTime: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("updated_at")}</span>
              <span className="text-sm">
                {formatDate(contact.updatedAt, { includeTime: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageFormLayout>
  );
}
