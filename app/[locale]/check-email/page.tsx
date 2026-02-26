"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GalleryVerticalEnd, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CheckEmailPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <GalleryVerticalEnd className="size-4" />
                        </div>
                        Pasak Inc.
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <div className="text-center flex flex-col items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Mail className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl font-bold">Check Your Email</h1>
                            <p className="text-balance text-sm text-muted-foreground">
                                We've sent an activation link to your email address. Please click the link to verify your account and complete registration.
                            </p>
                            <Link href="/auth" className="w-full">
                                <Button className="w-full mt-4">
                                    Return to Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
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
