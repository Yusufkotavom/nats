"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ButtonProps } from "@/components/ui/button";

interface DialogOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ButtonProps["variant"];
}

interface DialogContextType {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (
    options: Omit<DialogOptions, "cancelText" | "variant">
  ) => Promise<void>;
}

const DialogContext = React.createContext<DialogContextType | undefined>(
  undefined
);

export function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

interface DialogStateBase extends DialogOptions {
  open: boolean;
}

interface ConfirmState extends DialogStateBase {
  type: "confirm";
  resolve: (value: boolean) => void;
}

interface AlertState extends DialogStateBase {
  type: "alert";
  resolve: (value?: void) => void;
}

type DialogState = ConfirmState | AlertState;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = React.useState<DialogState | null>(null);

  const confirm = React.useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        ...options,
        open: true,
        type: "confirm",
        resolve,
      });
    });
  }, []);

  const alert = React.useCallback(
    (options: Omit<DialogOptions, "cancelText" | "variant">) => {
      return new Promise<void>((resolve) => {
        setDialog({
          ...options,
          open: true,
          type: "alert",
          resolve,
        });
      });
    },
    []
  );

  const handleClose = (value: boolean) => {
    if (dialog) {
      if (dialog.type === "confirm") {
        dialog.resolve(value);
      } else {
        dialog.resolve();
      }
      setDialog(null);
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <AlertDialog
          open={dialog.open}
          onOpenChange={(open) => !open && handleClose(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dialog.title ||
                  (dialog.type === "confirm" ? "Are you sure?" : "Alert")}
              </AlertDialogTitle>
              {dialog.description && (
                <AlertDialogDescription>
                  {dialog.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              {dialog.type === "confirm" && (
                <AlertDialogCancel onClick={() => handleClose(false)}>
                  {dialog.cancelText || "Cancel"}
                </AlertDialogCancel>
              )}
              <AlertDialogAction
                onClick={() => handleClose(true)}
                className={
                  dialog.variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
              >
                {dialog.confirmText || "Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </DialogContext.Provider>
  );
}
