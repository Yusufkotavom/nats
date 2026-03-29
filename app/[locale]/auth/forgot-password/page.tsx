"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Loader2, GalleryVerticalEnd, Mail } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
    const [state, action, isPending] = useActionState(requestPasswordReset, undefined);
    const t = useTranslations('Auth');

    if (state?.success) {
        return (
            <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Mail className="size-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-bold">{t('reset_link_sent_title')}</h1>
                            <p className="text-balance text-sm text-muted-foreground">
                                {t('reset_link_sent_description')}
                            </p>
                        </div>
                        <Link href="/auth" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
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
                            <h1 className="text-2xl font-bold">{t('forgot_password_title')}</h1>
                            <p className="text-balance text-sm text-muted-foreground">
                                {t('forgot_password_description')}
                            </p>
                        </div>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <CustomInput
                                    label={t('email_label')}
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    defaultValue=""
                                />
                                {state?.errors?.email && (
                                    <p className="text-sm text-red-500">{state.errors.email[0]}</p>
                                )}
                                {state?.errors?._form && (
                                    <p className="text-sm text-red-500">{state.errors._form[0]}</p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('sending_reset_link')}
                                    </>
                                ) : (
                                    t('send_reset_link')
                                )}
                            </Button>
                            <div className="text-center">
                                <Link href="/auth" className="text-sm underline-offset-4 hover:underline">
                                    {t('back_to_login')}
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
