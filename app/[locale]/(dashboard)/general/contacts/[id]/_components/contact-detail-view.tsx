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


interface ContactDetailViewProps {
  contact: Contact;
}

export function ContactDetailView({ contact }: ContactDetailViewProps) {
  const formatDate = useFormatDate();

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
                {contact.type}
              </Badge>
              <Badge variant={contact.isActive ? "default" : "secondary"}>
                {contact.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </PageFormTitle>
      </PageFormHeader>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{contact.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Phone:</span>
              <span className="text-sm">{contact.phone || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Address:</span>
              <span className="text-sm">{contact.address || "-"}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Created At:</span>
              <span className="text-sm">
                {formatDate(contact.createdAt, { includeTime: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Updated At:</span>
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
