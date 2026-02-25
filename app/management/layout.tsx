import "@/app/globals.css";
import { ThemeColorProvider } from "@/components/layout/others/theme-color-provider";
import { DialogProvider } from "@/components/providers/dialog-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
    title: "Management - Tenant Administration",
};

export default function ManagementLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id">
            <DialogProvider>
                <ThemeColorProvider>
                    <body className="antialiased min-h-screen bg-background">
                        {children}
                        <Toaster />
                    </body>
                </ThemeColorProvider>
            </DialogProvider>
        </html>
    );
}
