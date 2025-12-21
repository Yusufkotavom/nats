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
import { Textarea } from "@/components/ui/textarea";
import { createRole, updateRole } from "../actions";
import { Loader2, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface RoleDialogProps {
  role?: {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    isActive: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleDialog({ role, open, onOpenChange }: RoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!role;
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (role) {
      setIsActive(role.isActive);
    } else {
      setIsActive(true);
    }
  }, [role, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      if (isEditing) {
        await updateRole(role.id, {
          name,
          description,
          permissions: role.permissions, // Keep existing permissions
          isActive,
        });
      } else {
        await createRole({
          name,
          description,
          permissions: [], // Initialize with no permissions
          isActive,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      // Ideally show toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Add Role"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edit role details."
              : "Create a new role."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={role?.name}
              placeholder="e.g. Accountant"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={role?.description || ""}
              placeholder="Describe the role..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
