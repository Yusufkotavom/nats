export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-6 text-stone-900">
      <section className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Offline</p>
        <h1 className="mt-4 text-3xl font-semibold">Koneksi terputus</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          App shell masih tersedia. Data master yang sudah tersimpan lokal tetap bisa dipakai oleh fitur local-first.
        </p>
      </section>
    </main>
  );
}
