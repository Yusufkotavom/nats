"use client";

import { useActionState } from "react";
import { resetPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Loader2, GalleryVerticalEnd, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [state, action, isPending] = useActionState(resetPassword, undefined);
    const t = useTranslations('Auth');

    if (state?.success) {
        return (
            <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <CheckCircle2 className="size-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-bold">{t('success')}</h1>
                            <p className="text-balance text-sm text-muted-foreground">
                                {t('password_reset_success')}
                            </p>
                        </div>
                        <Link href="/auth" className="w-full">
                            <Button className="w-full">
                                {t('sign_in')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">{t('error')}</h1>
                        <p className="text-muted-foreground">{t('invalid_token')}</p>
                        <Link href="/auth" className="mt-4 inline-block underline underline-offset-4">
                            {t('back_to_login')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
            <div className="flex justify-center gap-2 md:justify-start">
                <Link href="/" className="flex items-center gap-2 font-medium">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    NATS Inc.
                </Link>
            </div>
            <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-xs">
                    <form action={action} className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1 className="text-2xl font-bold">{t('reset_password_title')}</h1>
                            <p className="text-balance text-sm text-muted-foreground">
                                {t('reset_password_description')}
                            </p>
                        </div>
                        <input type="hidden" name="token" value={token} />
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <CustomInput
                                    label={t('new_password_label')}
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    defaultValue=""
                                />
                                {state?.errors?.password && (
                                    <p className="text-sm text-red-500">{state.errors.password[0]}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <CustomInput
                                    label={t('confirm_password_label')}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    defaultValue=""
                                />
                                {state?.errors?.confirmPassword && (
                                    <p className="text-sm text-red-500">{state.errors.confirmPassword[0]}</p>
                                )}
                                {state?.errors?._form && (
                                    <p className="text-sm text-red-500 font-medium">{state.errors._form[0]}</p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('resetting_password')}
                                    </>
                                ) : (
                                    t('reset_password_button')
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
