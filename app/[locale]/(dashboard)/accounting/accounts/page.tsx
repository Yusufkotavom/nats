"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  CogIcon,
  CalculatorIcon,
} from "lucide-react";
import { updateAccount, deleteAccount, getAccounts } from "./actions";
export const dynamic = "force-dynamic";
import { AccountDialog } from "./_components/account-dialog";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { Account } from "../types";
import { useConfirm, useToast } from "@/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  formatLocalizedAccountLabel,
  getLocalizedAccountName,
} from "@/lib/accounting/account-name-i18n";

import { useLocale, useTranslations } from "next-intl";

export default function AccountListPage() {
  const t = useTranslations("Accounting");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const router = useRouter();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await getAccounts(1);
      return res as Account[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string };
    }) => {
      return await updateAccount(id, data);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast({
          title: tCommon("success"),
          description: t("account_updated_success"),
        });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        setEditingId(null);
        setDraftName("");
      } else {
        setError(res.error || tCommon("error"));
      }
    },
    onError: () => {
      setError(tCommon("error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteAccount(id);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast({
          title: tCommon("success"),
          description: t("account_deleted_success"),
        });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      } else {
        toast({
          title: tCommon("error"),
          description: res.error || tCommon("error"),
          variant: "destructive",
        });
      }
    },
  });

  const byId = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach((a) => (map[a.id] = { ...a, children: [] }));
    accounts.forEach((a) => {
      if (a.parentId && map[a.parentId]) {
        map[a.parentId].children!.push(map[a.id]);
      }
    });
    return map;
  }, [accounts]);

  const roots = useMemo(() => {
    const res: Account[] = [];
    accounts.forEach((a) => {
      if (!a.parentId) {
        res.push(byId[a.id] || a);
      }
    });
    // sort by code for stable view
    res.sort((x, y) => x.code.localeCompare(y.code));
    return res;
  }, [accounts, byId]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function beginEdit(a: Account) {
    setEditingId(a.id);
    setDraftName(a.name);
  }

  function commitEdit(a: Account) {
    if (!editingId) return;
    setError(null);
    updateMutation.mutate({ id: a.id, data: { name: draftName } });
  }

  async function handleDelete(a: Account) {
    if (
      await confirm({
        title: tCommon("are_you_sure") || "Are you sure?",
        description: (
          <>
            {t("delete_account_desc")}
            <span className="font-medium text-foreground">
              {" "}
              {formatLocalizedAccountLabel({ code: a.code, name: a.name }, locale)}
            </span>
            .
          </>
        ),
        confirmText: tCommon("delete"),
        variant: "destructive",
      })
    ) {
      deleteMutation.mutate(a.id);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  function renderRows(a: Account, depth = 0): React.ReactElement[] {
    const hasChildren = (a.children?.length || 0) > 0;
    const isOpen = expanded[a.id] ?? true;
    const isUsed = (a._count?.journalEntryLines || 0) > 0;
    const canDelete = !isUsed && !hasChildren;

    let deleteTooltip = tCommon("delete");
    if (isUsed) deleteTooltip = `${tCommon("cannot_delete") || "Cannot delete"}: ${t("used_in_transactions")}`;
    else if (hasChildren) deleteTooltip = `${tCommon("cannot_delete") || "Cannot delete"}: ${t("has_child_accounts")}`;

    const row = (
      <TableRow key={a.id} className="border-b last:border-b-0">
        <TableCell className="w-12 align-middle">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleExpand(a.id)}
              className="shrink-0"
            >
              {isOpen ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : null}
        </TableCell>
        <TableCell className="w-28 text-muted-foreground align-middle">
          {a.code}
        </TableCell>
        <TableCell className="align-middle">
          <div
            className="group flex items-center gap-2"
            style={{ paddingLeft: depth * 16 }}
          >
            {editingId === a.id ? (
              <>
                <CustomInput
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void commitEdit(a);
                    }
                    if (e.key === "Escape") {
                      setEditingId(null);
                      setDraftName("");
                    }
                  }}
                  className="w-72"
                  autoFocus
                />
                <Button size="sm" onClick={() => commitEdit(a)}>
                  {tCommon("save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setDraftName("");
                  }}
                >
                  {tCommon("cancel")}
                </Button>
              </>
            ) : (
              <>
                <span className="font-medium">
                  {getLocalizedAccountName({ code: a.code, name: a.name, locale })}
                </span>
                <Protect permission="accounts.edit">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => beginEdit(a)}
                    title={t("edit_name")}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil />
                  </Button>
                </Protect>
              </>
            )}
          </div>
        </TableCell>
        <TableCell className="align-middle">
          <span className="capitalize">{a.type.toLowerCase()}</span>
        </TableCell>
        <TableCell className="w-24 text-right align-middle">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canDelete}
            onClick={() => handleDelete(a)}
            title={deleteTooltip}
          >
            <Trash2 />
          </Button>
        </TableCell>
      </TableRow>
    );
    const childrenRows: React.ReactElement[] =
      hasChildren && isOpen
        ? a
          .children!.sort((x, y) => x.code.localeCompare(y.code))
          .flatMap((c) => renderRows(c as Account, depth + 1))
        : [];
    return [row, ...childrenRows];
  }

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("chart_of_accounts")}></PageListTitle>
        <PageListActions className="space-x-1">
          <Button variant="outline" onClick={() => router.push("/accounting/configuration/default-accounts")}>
            <CogIcon /> {t("default_accounts")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/accounting/configuration/beginning-balance")}>
            <CalculatorIcon /> {t("opening_balance")}
          </Button>
          <Button onClick={() => setIsAdding(true)} >
            <Plus /> {t("add_account")}
          </Button>

        </PageListActions>
      </PageListHeader>

      {error && <div className="text-destructive text-sm">{error}</div>}

      <PageListContent>
        <Table className="w-full">
          <TableHeader className="bg-muted">
            <TableRow className="text-left text-sm text-muted-foreground">
              <TableHead className="w-12 rounded-tl-lg"> </TableHead>
              <TableHead className="w-28">{t("code")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead className="w-24 text-right rounded-tr-lg">
                {tCommon("actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{roots.flatMap((r) => renderRows(r))}</TableBody>
        </Table>
      </PageListContent>

      <AccountDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        accounts={accounts}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          toast({
            title: tCommon("success"),
            description: t("account_created_success"),
          });
          setIsAdding(false);
        }}
      />
    </PageListLayout>
  );
}
