'use client'

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="text-center">
        <h2 className="text-xl font-black text-red-500 mb-2">Algo salió mal</h2>
        <p className="text-sm text-neutral-500">{error.message || 'Error al cargar configuración'}</p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-brand-orange text-black font-black text-sm rounded-xl hover:scale-105 transition-all"
      >
        Reintentar
      </button>
    </div>
  )
}
