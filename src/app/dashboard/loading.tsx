export default function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />

        <p className="text-sm font-medium text-white">
          Memuat Dashboard MARIVEST...
        </p>
      </div>
    </main>
  );
}
