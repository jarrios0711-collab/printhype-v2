export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Cargando...</p>
      </div>
    </div>
  )
}