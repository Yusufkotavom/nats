"use client";

import { useActionState } from "react";
import { managementLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ManagementLoginPage() {
    const [state, action, isPending] = useActionState(managementLogin, undefined);

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6 md:p-10">
            <div className="w-full max-w-md">
                <div className="flex flex-col gap-6 rounded-xl border bg-card text-card-foreground shadow p-6 md:p-10">
                    <div className="flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ShieldCheck className="size-6" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h1 className="text-2xl font-bold">Akses Pengelola SaaS</h1>
                        <p className="text-balance text-sm text-muted-foreground">
                            Masuk untuk mengelola tenant dan konfigurasi sistem.
                        </p>
                    </div>
                    <form action={action} className="grid gap-6 mt-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <CustomInput
                                    label="Email"
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    required
                                    defaultValue=""
                                />
                                {state?.errors?.email && (
                                    <p className="text-sm text-red-500 font-medium">{state.errors.email[0]}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Kata Sandi</Label>
                                </div>
                                <CustomInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    defaultValue=""
                                />
                                {state?.errors?.password && (
                                    <p className="text-sm text-red-500 font-medium">
                                        {state.errors.password[0]}
                                    </p>
                                )}
                            </div>
                            <Button type="submit" className="w-full mt-2" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sedang Masuk...
                                    </>
                                ) : (
                                    "Masuk ke Portal Manajemen"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
