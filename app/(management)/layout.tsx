import "@/app/globals.css";
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
            <body className="antialiased min-h-screen bg-background">
                <div className="p-8">
                    {children}
                </div>
                <Toaster />
            </body>
        </html>
    );
}
