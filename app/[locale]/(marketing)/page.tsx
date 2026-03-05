import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    CheckCircle2,
    LayoutDashboard,
    Receipt,
    ShoppingCart,
    Calculator,
    Landmark,
    LineChart,
    Building2,
    Blocks,
    MessageCircle
} from "lucide-react";
import Link from "next/link";
import { DemoButton } from "./demo-button";

export default async function MarketingPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    const isId = locale === 'id';

    const faqs = isId ? [
        { question: "Apakah ada batasan fitur di paket Simple?", answer: "Paket Simple ditujukan untuk coba-coba, dibatasi hingga 50 transaksi per bulan dan laporan dasar." },
        { question: "Apakah saya perlu mengunduh aplikasi?", answer: "Tidak, NATS Accounting berbasis cloud. Anda hanya butuh browser dan koneksi internet." },
        { question: "Bisakah NATS dihubungkan ke sistem lain?", answer: "Bisa, paket Pro menyediakan akses API untuk integrasi sistem Anda. Kami juga melayani modul custom." },
        { question: "Bagaimana cara meminta Modul Custom/Tailor-made?", answer: "Silakan hubungi tim dukungan kami melalui WhatsApp untuk berdiskusi mengenai kebutuhan spesifik bisnis Anda. Tim engineer kami siap membuat modul tailor-made sesuai request." },
    ] : [
        { question: "Are there feature limits on the Simple plan?", answer: "The Simple plan is designed for getting started, limited to 50 transactions per month and basic reporting." },
        { question: "Do I need to download an app?", answer: "No, NATS Accounting is cloud-based. You only need a web browser and an internet connection." },
        { question: "Can NATS connect to other systems?", answer: "Yes, our Pro plan includes API access for integrations. We also provide custom module development." },
        { question: "How can I request a Custom/Tailor-made Module?", answer: "Reach out to our support team via WhatsApp to discuss your specific business needs. Our engineering team is ready to build tailor-made modules upon request." },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-background relative overflow-x-hidden">
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
                        <Link href={`/${locale}/register`}>
                            <Button size="sm">
                                {isId ? 'Mulai Gratis' : 'Get Started'}
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1 w-full relative">
                {/* Hero Section */}
                <section className="mx-auto flex max-w-[980px] flex-col items-center gap-4 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20 relative px-4">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-50 pointer-events-none" />

                    <h1 className="text-center text-4xl font-extrabold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1] max-w-4xl bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                        {isId ? 'Sederhanakan Bisnis Anda dengan NATS' : 'Simplify Your Business with NATS'}
                    </h1>
                    <p className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl md:text-2xl font-light">
                        {isId
                            ? 'Solusi lengkap untuk point of sale, manajemen inventaris, pembelian, dan akuntansi.'
                            : 'The all-in-one solution for point of sale, inventory management, purchasing, and accounting.'}
                    </p>
                    <div className="flex w-full items-center justify-center space-x-4 py-4 md:pb-10">
                        <DemoButton isId={isId} />
                        <Link href={`/${locale}/register`}>
                            <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-1">
                                {isId ? 'Coba Gratis Sekarang' : 'Start for Free Today'}
                            </Button>
                        </Link>
                    </div>

                    {/* Hero Image */}
                    <div className="w-full max-w-5xl mx-auto rounded-xl border bg-background/50 p-2 shadow-2xl backdrop-blur-sm relative overflow-hidden hidden sm:block mt-8 group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 rounded-xl z-0 transition-opacity group-hover:opacity-75" />

                        <div className="aspect-[16/9] w-full rounded-lg bg-card border border-border/50 flex flex-col items-center justify-start relative z-10 overflow-hidden shadow-inner">
                            {/* Browser Top Bar Mockup */}
                            <div className="w-full h-10 border-b bg-muted/30 flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="h-6 w-full max-w-md mx-auto bg-background/50 rounded-md border text-xs flex items-center justify-center text-muted-foreground">
                                        app.nats-accounting.com
                                    </div>
                                </div>
                            </div>

                            {/* Dashboard Mockup Layout */}
                            <div className="flex flex-1 w-full bg-background/50">
                                {/* Sidebar Mockup */}
                                <div className="w-48 h-full border-r bg-muted/20 p-4 space-y-4">
                                    <div className="h-4 w-24 bg-primary/20 rounded mb-8" />
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="h-3 w-full bg-muted rounded" />
                                    ))}
                                </div>
                                {/* Main Content Mockup */}
                                <div className="flex-1 p-6 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div className="h-6 w-40 bg-foreground/10 rounded" />
                                        <div className="h-8 w-8 bg-foreground/10 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-24 rounded-lg border bg-card p-4 flex flex-col justify-between">
                                                <div className="h-4 w-12 bg-muted rounded" />
                                                <div className="h-6 w-20 bg-foreground/10 rounded" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-4 h-64">
                                        <div className="flex-1 border rounded-lg bg-card p-4">
                                            <div className="h-full w-full bg-muted/30 rounded flex items-end justify-between p-4 gap-2">
                                                {[40, 70, 45, 90, 65, 80, 50, 100].map((h, i) => (
                                                    <div key={i} className="w-full bg-primary/40 rounded-t-sm transition-all" style={{ height: `${h}%` }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="w-1/3 border rounded-lg bg-card p-4">
                                            <div className="h-32 w-32 bg-primary/20 rounded-full mx-auto my-auto mt-8 border-8 border-muted/30" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="w-full space-y-6 bg-slate-50 py-12 dark:bg-slate-900/20 md:py-20 lg:py-24 border-y">
                    <div className="container mx-auto px-4">
                        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
                            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
                                {isId ? 'Fitur Unggulan' : 'Core Features'}
                            </h2>
                            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                                {isId
                                    ? 'Semua yang Anda butuhkan untuk mengelola dan mengembangkan bisnis Anda.'
                                    : 'Everything you need to manage and grow your business.'}
                            </p>
                        </div>
                        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[72rem] md:grid-cols-3 lg:grid-cols-4">
                            {/* POS */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10">
                                    <ShoppingCart className="h-10 w-10 text-indigo-500 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Point of Sale</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Transaksi kasir yang cepat dan terintegrasi.' : 'Fast, integrated retail transactions.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Inventory */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10">
                                    <LayoutDashboard className="h-10 w-10 text-emerald-500 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Inventaris' : 'Inventory'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Lacak stok dan pergerakan barang real-time.' : 'Track stock and item movement in real-time.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Purchasing */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10">
                                    <Receipt className="h-10 w-10 text-amber-500 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Pembelian' : 'Purchasing'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Kelola vendor dan faktur pembelian dengan mudah.' : 'Manage vendors and purchase invoices easily.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Accounting */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
                                    <Calculator className="h-10 w-10 text-blue-500 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Akuntansi' : 'Accounting'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Jurnal, buku besar, dan laporan keuangan komprehensif.' : 'Journals, ledgers, and comprehensive financial reports.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Cash & Bank */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-teal-50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10">
                                    <Landmark className="h-10 w-10 text-teal-600 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Kas & Bank' : 'Cash & Bank'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Pencatatan arus kas dan rekonsiliasi bank.' : 'Cash flow tracking and bank reconciliation.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Analytics */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10">
                                    <LineChart className="h-10 w-10 text-purple-500 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Analisa Cerdas' : 'Smart Analytics'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Dashboard informatif untuk pengambilan keputusan.' : 'Informative dashboards for decision making.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Multi Branch */}
                            <div className="relative overflow-hidden rounded-xl border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-rose-50 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10">
                                    <Building2 className="h-10 w-10 text-rose-500 mb-6 drop-shadow-sm" />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Multi Cabang' : 'Multi-branch'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Pusatkan pengelolaan berbagai outlet di satu tempat.' : 'Center management of multiple outlets in one place.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Custom Module */}
                            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex h-full flex-col justify-between rounded-lg p-6 bg-gradient-to-br from-fuchsia-50 to-fuchsia-100/50 dark:from-fuchsia-950/30 dark:to-fuchsia-900/20">
                                    <div className="flex justify-between items-start">
                                        <Blocks className="h-10 w-10 text-fuchsia-600 mb-6 drop-shadow-sm" />
                                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-full tracking-wider">
                                            {isId ? 'Eksklusif' : 'Exclusive'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{isId ? 'Modul Kustom' : 'Custom Module'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {isId ? 'Butuh fitur khusus? Kami bisa buatkan modul tailor-made ' : 'Need specific features? We can build tailor-made modules '}
                                            <Link href="https://wa.me/6281234567890" target="_blank" className="text-primary hover:underline font-medium">({isId ? 'Mari diskusi!' : 'Lets talk!'})</Link>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section className="container mx-auto py-12 md:py-24 px-4 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2" />
                    <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
                        <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
                            {isId ? 'Pilihan Paket' : 'Simple Pricing'}
                        </h2>
                        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                            {isId ? 'Pilih paket yang sesuai dengan skala bisnis Anda.' : 'Choose the perfect plan for your business scale.'}
                        </p>
                    </div>

                    <div className="grid w-full items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3 mx-auto max-w-7xl">
                        {/* Simple Plan */}
                        <Card className="flex flex-col border-border/50 shadow-sm relative h-full hover:shadow-md transition-all hover:-translate-y-1 group">
                            <CardHeader>
                                <CardTitle className="text-xl">Simple</CardTitle>
                                <CardDescription>{isId ? 'Sempurna untuk percobaan.' : 'Perfect for getting started.'}</CardDescription>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold group-hover:text-primary transition-colors">
                                    $0
                                    <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Maksimal 1 Pengguna' : 'Up to 1 User'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'POS Dasar' : 'Basic POS'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? '50 Transaksi / bulan' : '50 Transactions / month'}</li>
                                    <li className="flex items-center gap-2 text-muted-foreground/50 opacity-50"><div className="w-4 h-4 rounded-full border border-current mr-0" /> {isId ? 'Tidak ada laporan lanjutan' : 'No advanced reporting'}</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/${locale}/register`} className="w-full">
                                    <Button variant="outline" className="w-full h-11">{isId ? 'Coba Gratis' : 'Start Free'}</Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Pro Plan */}
                        <Card className="flex flex-col border-primary/20 shadow-xl relative bg-card h-full hover:shadow-2xl transition-all hover:-translate-y-1 scale-100 dark:bg-card/50 ring-1 ring-primary/20">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary font-bold">Pro</CardTitle>
                                <CardDescription>{isId ? 'Skala enterprise menengah.' : 'Scale for medium enterprise.'}</CardDescription>
                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-primary">
                                    {isId ? 'Rp 999k' : '$99'}
                                    <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3 text-sm text-foreground/80">
                                    <li className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Pengguna Tak Terbatas' : 'Unlimited Users'}</li>
                                    <li className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Multi Cabang / Outlet' : 'Multi-branch / Outlets'}</li>
                                    <li className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Akses API' : 'API Access'}</li>
                                    <li className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Smart Analytics Dashboard' : 'Smart Analytics Dashboard'}</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/${locale}/register`} className="w-full">
                                    <Button className="w-full h-11 shadow-lg bg-primary hover:bg-primary/90">{isId ? 'Mulai Pro' : 'Get Pro'}</Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Custom / On-Premise Plan */}
                        <Card className="flex flex-col border-border/50 shadow-sm relative h-full hover:shadow-md transition-all hover:-translate-y-1 group bg-muted/30">
                            <CardHeader>
                                <CardTitle className="text-xl group-hover:text-primary transition-colors">{isId ? 'Exclusive' : 'Ekslusif'}</CardTitle>
                                <CardDescription>{isId ? 'Solusi khusus operasional Anda.' : 'Specific solutions for your operations.'}</CardDescription>
                                <div className="mt-4 flex items-baseline text-2xl font-bold italic text-muted-foreground group-hover:text-primary transition-colors">
                                    {isId ? 'Harga Spesial' : 'Custom Pricing'}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Tailor-made / Modul Kustom' : 'Tailor-made / Custom Modules'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Instalasi On-Premise' : 'On-Premise Deployment'}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isId ? 'Migrasi Data Penuh' : 'Full Data Migration'}</li>
                                    <li className="flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="h-4 w-4" /> {isId ? 'Full Support Engineer' : 'Full Engineer Support'}</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href="https://wa.me/6281234567890" target="_blank" className="w-full">
                                    <Button variant="outline" className="w-full h-11 border-primary/20 hover:bg-primary/5 group-hover:border-primary transition-colors">
                                        {isId ? 'Hubungi Sales' : 'Contact Sales'}
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="w-full bg-slate-50 dark:bg-slate-900/20 py-12 md:py-24 border-y">
                    <div className="container mx-auto px-4 max-w-3xl">
                        <div className="mx-auto flex flex-col items-center space-y-4 text-center mb-10">
                            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
                                {isId ? 'Pertanyaan yang Sering Diajukan' : 'Frequently Asked Questions'}
                            </h2>
                            <p className="leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                                {isId ? 'Punya pertanyaan? Kami punya jawabannya.' : 'Got questions? We have answers.'}
                            </p>
                        </div>

                        <Accordion type="single" collapsible className="w-full bg-background rounded-xl p-4 shadow-sm border">
                            {faqs.map((faq, i) => (
                                <AccordionItem key={i} value={`item-${i}`}>
                                    <AccordionTrigger className="text-left font-semibold text-lg hover:text-primary">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground sm:text-base leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-6 md:py-0 w-full bg-background">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        NATS <span className="text-primary">Accounting</span>
                    </div>
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        &copy; {new Date().getFullYear()} NATS Accounting. {isId ? 'Hak Cipta Dilindungi.' : 'All rights reserved.'}
                    </p>
                </div>
            </footer>

            {/* Floating WhatsApp Support Button */}
            <div id="contact" className="fixed bottom-6 right-6 z-50">
                <Link
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-full h-14 w-14 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group"
                    title={isId ? 'Hubungi Bantuan WhatsApp' : 'Contact WhatsApp Support'}
                >
                    <MessageCircle className="h-7 w-7" />
                    <span className="sr-only">WhatsApp Support</span>
                </Link>
            </div>
        </div>
    );
}
