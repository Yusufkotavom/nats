import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, LayoutDashboard, Receipt, ShoppingCart, Calculator } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function MarketingPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    // Try to use translations if we add them, but for now we hardcode English/Indonesian based on locale or just English for skeleton
    const isId = locale === 'id';

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        NATS <span className="text-primary">Accounting</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        <Link href={`/${locale}/auth`}>
                            <Button variant="ghost" size="sm">
                                {isId ? 'Masuk' : 'Log in'}
                            </Button>
                        </Link>
                        <Link href={`/${locale}/auth`}>
                            <Button size="sm">
                                {isId ? 'Mulai Gratis' : 'Get Started'}
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
                    <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
                        {isId ? 'Sederhanakan Bisnis Anda dengan NATS' : 'Simplify Your Business with NATS'}
                    </h1>
                    <p className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl">
                        {isId
                            ? 'Solusi lengkap untuk point of sale, manajemen inventaris, pembelian, dan akuntansi.'
                            : 'The all-in-one solution for point of sale, inventory management, purchasing, and accounting.'}
                    </p>
                    <div className="flex w-full items-center justify-center space-x-4 py-4 md:pb-10">
                        <Link href={`/${locale}/auth`}>
                            <Button size="lg" className="h-12 px-8">
                                {isId ? 'Coba Gratis Sekarang' : 'Start for Free Today'}
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* Features Section */}
                <section className="container mx-auto space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
                    <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
                        <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
                            {isId ? 'Fitur Unggulan' : 'Core Features'}
                        </h2>
                        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                            {isId
                                ? 'Semua yang Anda butuhkan untuk mengelola dan mengembangkan bisnis Anda.'
                                : 'Everything you need to manage and grow your business.'}
                        </p>
                    </div>
                    <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-2 lg:grid-cols-4">
                        {/* POS */}
                        <div className="relative overflow-hidden rounded-lg border bg-background p-2">
                            <div className="flex h-[180px] flex-col justify-between rounded-md p-6 border border-border/50 bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10">
                                <ShoppingCart className="h-8 w-8 text-indigo-500 mb-4" />
                                <div className="space-y-2">
                                    <h3 className="font-bold">Point of Sale</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isId ? 'Transaksi kasir yang cepat dan terintegrasi.' : 'Fast, integrated retail transactions.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Inventory */}
                        <div className="relative overflow-hidden rounded-lg border bg-background p-2">
                            <div className="flex h-[180px] flex-col justify-between rounded-md p-6 border border-border/50 bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10">
                                <LayoutDashboard className="h-8 w-8 text-emerald-500 mb-4" />
                                <div className="space-y-2">
                                    <h3 className="font-bold">{isId ? 'Inventaris' : 'Inventory'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isId ? 'Lacak stok dan pergerakan barang real-time.' : 'Track stock and item movement in real-time.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Purchasing */}
                        <div className="relative overflow-hidden rounded-lg border bg-background p-2">
                            <div className="flex h-[180px] flex-col justify-between rounded-md p-6 border border-border/50 bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10">
                                <Receipt className="h-8 w-8 text-amber-500 mb-4" />
                                <div className="space-y-2">
                                    <h3 className="font-bold">{isId ? 'Pembelian' : 'Purchasing'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isId ? 'Kelola vendor dan faktur pembelian dengan mudah.' : 'Manage vendors and purchase invoices easily.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Accounting */}
                        <div className="relative overflow-hidden rounded-lg border bg-background p-2">
                            <div className="flex h-[180px] flex-col justify-between rounded-md p-6 border border-border/50 bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
                                <Calculator className="h-8 w-8 text-blue-500 mb-4" />
                                <div className="space-y-2">
                                    <h3 className="font-bold">{isId ? 'Akuntansi' : 'Accounting'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isId ? 'Jurnal, buku besar, dan laporan keuangan komprehensif.' : 'Journals, ledgers, and comprehensive financial reports.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section className="container mx-auto py-8 md:py-12 lg:py-24">
                    <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
                        <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
                            {isId ? 'Harga Spesial' : 'Simple Pricing'}
                        </h2>
                        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                            {isId ? 'Pilih paket yang sesuai dengan ukuran bisnis Anda.' : 'Choose the perfect plan for your business size.'}
                        </p>
                    </div>

                    <div className="grid w-full items-start gap-10 rounded-3xl p-10 md:grid-cols-3 mx-auto max-w-[64rem]">
                        {/* Free Plan */}
                        <Card className="flex flex-col border-border/50 shadow-sm relative">
                            <CardHeader>
                                <CardTitle className="text-xl">Free</CardTitle>
                                <CardDescription>{isId ? 'Sempurna untuk coba-coba.' : 'Perfect for getting started.'}</CardDescription>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                                    $0
                                    <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Maksimal 1 Pengguna' : 'Up to 1 User'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'POS Dasar' : 'Basic POS'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? '50 Transaksi / bulan' : '50 Transactions / month'}</li>
                                    <li className="flex items-center gap-2 text-muted-foreground/50"><div className="w-4 h-4 rounded-full border border-current mr-2" /> {isId ? 'Tidak ada laporan lanjutan' : 'No advanced reporting'}</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/${locale}/auth`} className="w-full">
                                    <Button variant="outline" className="w-full h-12">{isId ? 'Coba Gratis' : 'Get Started'}</Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Basic Plan */}
                        <Card className="flex flex-col shadow-lg border-primary/20 scale-105 relative bg-background z-10">
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                                <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                                    {isId ? 'Terpopuler' : 'Most Popular'}
                                </span>
                            </div>
                            <CardHeader>
                                <CardTitle className="text-xl text-primary">Basic</CardTitle>
                                <CardDescription>{isId ? 'Untuk usaha kecil berkembang.' : 'For growing small businesses.'}</CardDescription>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                                    {isId ? 'Rp 299k' : '$29'}
                                    <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Maksimal 5 Pengguna' : 'Up to 5 Users'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Full Inventaris & Pembelian' : 'Full Inventory & Purchasing'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Transaksi Tak Terbatas' : 'Unlimited Transactions'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Dukungan Prioritas' : 'Priority Support'}</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/${locale}/auth`} className="w-full">
                                    <Button className="w-full h-12 shadow-md">{isId ? 'Mulai Basic' : 'Get Basic'}</Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Pro Plan */}
                        <Card className="flex flex-col border-border/50 shadow-sm relative">
                            <CardHeader>
                                <CardTitle className="text-xl">Pro Unlimited</CardTitle>
                                <CardDescription>{isId ? 'Skala enterprise tanpa batas.' : 'Enterprise scale without limits.'}</CardDescription>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                                    {isId ? 'Rp 999k' : '$99'}
                                    <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Pengguna Tak Terbatas' : 'Unlimited Users'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Multi Cabang / Outlet' : 'Multi-branch / Outlets'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'API Access' : 'API Access'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Akuntan Dedikasi' : 'Dedicated Account Manager'}</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/${locale}/auth`} className="w-full">
                                    <Button variant="outline" className="w-full h-12">{isId ? 'Hubungi Kami' : 'Contact Sales'}</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-6 md:py-0">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        &copy; {new Date().getFullYear()} NATS Accounting. {isId ? 'Hak Cipta Dilindungi.' : 'All rights reserved.'}
                    </p>
                </div>
            </footer>
        </div>
    );
}
