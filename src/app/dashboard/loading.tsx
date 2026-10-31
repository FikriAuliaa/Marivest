export default function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef5fc] px-6 text-[#244c70]">
      <div className="rounded-[28px] border border-white/90 bg-white/75 px-9 py-8 text-center shadow-[0_20px_60px_rgba(38,83,127,0.12)] backdrop-blur-2xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#d9e9f7] border-t-[#347bad]" />
        <p className="text-sm font-semibold">Menyiapkan MARIVEST...</p>
        <p className="mt-1 text-xs text-[#8ba0b4]">Memuat ruang usaha dan marketplace</p>
      </div>
    </main>
  );
}
