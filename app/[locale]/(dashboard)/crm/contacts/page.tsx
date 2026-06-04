"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { ContactDialog } from "@/app/[locale]/(dashboard)/general/contacts/_components/contact-dialog";
import { getContacts, deleteContact } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { useConfirm } from "@/hooks/use-confirm";
import { ContactType } from "@/prisma/generated/prisma/browser";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Contact = Awaited<ReturnType<typeof getContacts>>["data"][number];

const ALL_TYPES_VALUE = "ALL";

export default function CrmContactsPage() {
  const t = useTranslations("General.Contacts");
  const tCommon = useTranslations("Common");
  const tCrm = useTranslations("CRM");
  const confirm = useConfirm();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);

  useEffect(() => {
    async function fetchData() {
      const data = await getContacts({ page, search, type: typeFilter });
      setContacts(data.data);
      setTotal(data.total);
    }
    fetchData();
  }, [page, search, typeFilter]);

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value === ALL_TYPES_VALUE ? undefined : (value as ContactType));
    setPage(1);
  };

  const handleDeleteClick = async (contact: Contact) => {
    if (await confirm({
      title: t("delete_contact"),
      description: t("delete_confirm_desc", { name: contact.name }),
    })) {
      await deleteContact(contact.id);
      const data = await getContacts({ page, search, type: typeFilter });
      setContacts(data.data);
      setTotal(data.total);
    }
  };

  const getTypeBadgeColor = (type: ContactType) => {
    switch (type) {
      case ContactType.CUSTOMER:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-transparent";
      case ContactType.VENDOR:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-transparent";
      case ContactType.EMPLOYEE:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-transparent";
      default:
        return "";
    }
  };

  const getTypeLabel = (type: ContactType) => {
    switch (type) {
      case ContactType.CUSTOMER: return t("customer");
      case ContactType.VENDOR: return t("vendor");
      case ContactType.EMPLOYEE: return t("employee");
      default: return type;
    }
  };

  const customerCount = contacts.filter(c => c.type === ContactType.CUSTOMER).length;
  const vendorCount = contacts.filter(c => c.type === ContactType.VENDOR).length;
  const employeeCount = contacts.filter(c => c.type === ContactType.EMPLOYEE).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tCrm("contacts")}</h1>
          <p className="text-muted-foreground">Single source of truth untuk semua kontak bisnis</p>
        </div>
        <Button onClick={() => { setSelectedContact(undefined); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t("add_contact")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("customer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("vendor")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("employee")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>Total {total} kontak</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <CustomInput
                  name="search"
                  placeholder={t("search_placeholder")}
                  className="pl-8 w-64"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={typeFilter ?? ALL_TYPES_VALUE} onValueChange={handleTypeFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("all_types")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES_VALUE}>{t("all_types")}</SelectItem>
                  <SelectItem value={ContactType.CUSTOMER}>{t("customer")}</SelectItem>
                  <SelectItem value={ContactType.VENDOR}>{t("vendor")}</SelectItem>
                  <SelectItem value={ContactType.EMPLOYEE}>{t("employee")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("address")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">{t("no_contacts_found")}</TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <Link href={`/general/contacts/${contact.id}`} className="hover:underline">
                        {contact.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(contact.type)} variant="outline">
                        {getTypeLabel(contact.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                    <TableCell>{contact.address || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={contact.isActive ? "default" : "secondary"}>
                        {contact.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/general/contacts/${contact.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              {tCommon("view")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedContact(contact); setIsDialogOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(contact)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tCommon("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <CustomPagination
            totalEntries={total}
            pageSize={20}
            currentPage={page}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <ContactDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contact={selectedContact}
      />
    </div>
  );
}
