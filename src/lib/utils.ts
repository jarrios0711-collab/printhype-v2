type ClassValue = string | number | boolean | undefined | null | { [key: string]: boolean | undefined }

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .filter(Boolean)
    .map(input => {
      if (typeof input === 'string') return input
      if (typeof input === 'number') return String(input)
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k)
          .join(' ')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}