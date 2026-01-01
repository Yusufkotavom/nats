"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ContactDialog } from "./contact-dialog";
import { deleteContact } from "../actions";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { CustomInput } from "@/components/ui/custom-input";
import { Contact, PaginatedResult } from "../../types";
import { Protect } from "@/components/ui/protect";
import { ContactType } from "@/prisma/generated/prisma/browser";

interface ContactTableProps {
  initialData: PaginatedResult<Contact>;
}

export function ContactTable({ initialData }: ContactTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(
    undefined
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | undefined>(
    undefined
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to page 1
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleAddContact = () => {
    setSelectedContact(undefined);
    setIsDialogOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (contactToDelete) {
      await deleteContact(contactToDelete.id);
      setIsDeleteDialogOpen(false);
      setContactToDelete(undefined);
    }
  };

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <CustomInput
              name="search"
              placeholder="Search contacts..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Protect permission="contacts.create">
          <Button onClick={handleAddContact}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </Protect>
      </div>

      <div className="rounded-md border">
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
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((contact) => (
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
      </div>

      {initialData.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(initialData.page - 1)}
            disabled={initialData.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {initialData.page} of {initialData.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(initialData.page + 1)}
            disabled={initialData.page >= initialData.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ContactDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contact={selectedContact}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Contact"
        description={`Are you sure you want to delete "${contactToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
