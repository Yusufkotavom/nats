"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Search,
  Contact,
} from "lucide-react";
import { ContactDialog } from "./_components/contact-dialog";
import { deleteContact, getContacts } from "./actions";
import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { CustomInput } from "@/components/ui/custom-input";
import { Protect } from "@/components/ui/protect";
import { ContactType } from "@/prisma/generated/prisma/browser";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { CustomPagination } from "@/components/ui/custom-pagination";

type Contact = Awaited<ReturnType<typeof getContacts>>["data"][number];

export default function ContactsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const confirm = useConfirm();

  const handleAddContact = () => {
    setSelectedContact(undefined);
    setIsDialogOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (contact: Contact) => {
    if (
      await confirm({
        title: "Delete Contact",
        description: `Are you sure you want to delete "${contact.name}"? This action cannot be undone.`,
      })
    ) {
      await deleteContact(contact.id);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const data = await getContacts({ page, search });
      setContacts(data.data);
      setTotal(data.total);
    }

    fetchData();
  }, [search, page]);

  const getTypeBadgeColor = (type: ContactType) => {
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
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Contact Management" />
        <PageListActions>
          <Protect permission="contacts.create">
            <Button onClick={handleAddContact}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <CustomInput
            name="search"
            placeholder="Search contacts..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </PageListFilter>

      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>
                    <Badge
                      className={getTypeBadgeColor(contact.type)}
                      variant="outline"
                    >
                      {contact.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{contact.email || "-"}</TableCell>
                  <TableCell>{contact.phone || "-"}</TableCell>
                  <TableCell>{contact.address || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={contact.isActive ? "default" : "secondary"}>
                      {contact.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(contact.id)
                          }
                        >
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Protect permission="contacts.edit">
                          <DropdownMenuItem
                            onClick={() => handleEditContact(contact)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </Protect>
                        <Protect permission="contacts.delete">
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(contact)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </Protect>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <CustomPagination
          totalEntries={total || 0}
          pageSize={20}
          currentPage={page}
          onPageChange={setPage}
        />
      </PageListContent>
      <ContactDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contact={selectedContact}
      />
    </PageListLayout>
  );
}
