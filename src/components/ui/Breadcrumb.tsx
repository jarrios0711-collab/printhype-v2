import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-4">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={10} className="text-neutral-700" />}
          {crumb.href ? (
            <Link href={crumb.href} className="text-neutral-500 hover:text-brand-orange transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-neutral-400">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
