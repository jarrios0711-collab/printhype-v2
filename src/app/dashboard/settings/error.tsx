'use client'

import ErrorPage from '@/components/ui/ErrorPage'

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPage error={error} reset={reset} message="Error al cargar configuración" />
}
