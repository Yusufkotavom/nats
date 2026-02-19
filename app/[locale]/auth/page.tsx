"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import { Loader2, GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, undefined);
  const t = useTranslations('Auth');
  const tCommon = useTranslations('Common');

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Pasak Inc.
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form action={action} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{t('login_title')}</h1>
                <p className="text-balance text-sm text-muted-foreground">
                  {t('login_description')}
                </p>
              </div>
              <div className="grid gap-6">
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
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">{t('password_label')}</Label>
                    <Link
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      {t('forgot_password')}
                    </Link>
                  </div>
                  <CustomInput
                    id="password"
                    name="password"
                    type="password"
                    required
                    defaultValue=""
                  />
                  {state?.errors?.password && (
                    <p className="text-sm text-red-500">
                      {state.errors.password[0]}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('logging_in')}
                    </>
                  ) : (
                    t('login_button')
                  )}
                </Button>
              </div>
              <div className="text-center text-sm">
                {t('no_account')}{" "}
                <Link href="#" className="underline underline-offset-4">
                  {t('sign_up')}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
//...
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Image"
          fill
          sizes="50vw"
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
