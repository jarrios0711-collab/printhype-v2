'use client'

interface ErrorPageProps {
  error?: Error & { digest?: string }
  reset?: () => void
  message?: string
  title?: string
}

export default function ErrorPage({ error, reset, message, title }: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="text-center">
        <h2 className="text-xl font-black text-red-500 mb-2">
          {title || 'Algo salió mal'}
        </h2>
        <p className="text-sm text-neutral-500">
          {message || error?.message || 'Error desconocido'}
        </p>
      </div>
      {reset && (
        <button
          onClick={reset}
          className="px-6 py-3 bg-brand-orange text-black font-black text-sm rounded-xl hover:scale-105 transition-all"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
