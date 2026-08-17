'use client'

import type { CostBreakdown as CostBreakdownData, Currency } from '@/lib/costCalculator'
import { formatMoney } from '@/lib/costCalculator'

interface Props {
    breakdown: CostBreakdownData
    currency: Currency
}

/**
 * Desglose visual de costos de un trabajo 3D.
 * Muestra cada componente del costo total y el precio sugerido con margen.
 */
export default function CostBreakdown({ breakdown: b, currency }: Props) {
    const rows: Array<{ label: string; value: number; hint?: string; accent?: boolean }> = [
        { label: 'Material (filamento)', value: b.material },
        { label: 'Energía (máquina)', value: b.machineEnergy },
        { label: 'Depreciación (máquina)', value: b.machineDepreciation },
        { label: 'Mano de obra', value: b.labor },
        { label: 'Consumibles', value: b.consumables },
        { label: 'Gastos asignados (overhead)', value: b.overhead },
        { label: 'Subtotal', value: b.subtotal, accent: true },
        { label: `Buffer de fallo`, value: b.failBuffer, hint: 'trabajos fallidos no cotizados' },
    ]

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                Desglose de costos
            </p>
            <div className="space-y-1.5 text-sm">
                {rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                        <span className="text-gray-300">{row.label}</span>
                        <span className="font-mono tabular-nums text-gray-100">
                            {formatMoney(row.value, currency)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">Costo total</span>
                    <span className="font-mono text-lg font-bold tabular-nums text-brand-cyan">
                        {formatMoney(b.totalCost, currency)}
                    </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">Precio sugerido</span>
                    <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
                        {formatMoney(b.suggestedPrice, currency)}
                    </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                    <span>Ganancia</span>
                    <span className="font-mono tabular-nums">
                        {formatMoney(b.profitAmount, currency)} · margen {b.marginPercent.toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    )
}
