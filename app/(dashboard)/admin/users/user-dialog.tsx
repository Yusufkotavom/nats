"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "./actions";
import { Loader2 } from "lucide-react";

interface UserDialogProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: {
      id: string;
      name: string;
    };
  };
  roles: { id: string; name: string; description: string | null }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDialog({
  user,
  roles,
  open,
  onOpenChange,
}: UserDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!user;
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (user?.role.id) {
      setSelectedRoleId(user.role.id);
    } else if (!isEditing && roles.length > 0) {
      // Default to the first role if creating new user
      setSelectedRoleId(roles[0].id);
    }
  }, [user, roles, isEditing]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const roleId = formData.get("roleId") as string;
    const password = formData.get("password") as string;

    try {
      if (isEditing) {
        await updateUser(user.id, {
          name,
          email,
          roleId,
          password: password || undefined,
        });
      } else {
        await createUser({ name, email, roleId, password });
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the user profile here."
              : "Add a new user to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user?.name}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email}
                className="col-span-3"
                required
              />
            </div>
            {!isEditing && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  className="col-span-3"
                  required={!isEditing}
                  placeholder={isEditing ? "Leave blank to keep current" : ""}
                />
              </div>
            )}
            {isEditing && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  className="col-span-3"
                  placeholder="Leave blank to keep current"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="role" className="text-right pt-2">
                Role
              </Label>
              <div className="col-span-3 space-y-2">
                <Select
                  name="roleId"
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole?.description && (
                  <p className="text-xs text-muted-foreground">
                    {selectedRole.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
