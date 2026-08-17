/**
 * costCalculator.ts — Modelo de costos completo para PrintHype.
 *
 * Responde la pregunta que la mayoría de talleres 3D no puede responder:
 * "¿cuánto gano realmente por cada trabajo?"
 *
 * Modelo: Material + Tiempo de máquina (energía + depreciación) + Mano de obra
 *         + Consumibles + Overhead + Buffer de fallo → Precio sugerido con margen.
 *
 * Es una librería pura (sin fetch, sin BD) para que sea testeable y reutilizable
 * tanto en el cliente como en el servidor.
 */

export type Currency = 'ARS' | 'USD'

export interface CostSettings {
  /** Precio del kWh en la moneda configurada (ej: 120.50 ARS) */
  kwhPrice: number
  /** Tarifa de mano de obra por hora */
  laborRatePerHour: number
  /** Margen objetivo como % del PRECIO DE VENTA (ej: 30 = 30%) */
  targetMarginPercent: number
  /** Porcentaje de trabajos que fallan (ej: 10 = 10%). Sobre subtotal. */
  failRatePercent: number
  /** Gastos fijos asignados por trabajo (overhead / trabajos al mes) */
  overheadPerJob: number
  currency: Currency
}

export interface PrinterCostProfile {
  purchasePrice: number
  expectedLifetimeHours: number
  powerWatts: number
}

export interface CostInput {
  /** Peso de la pieza en gramos */
  filamentGrams: number
  /** Precio por kg del material (ya viene del inventario) */
  materialPricePerKg: number
  /** Horas de impresión en máquina */
  printHours: number
  /** Horas de mano de obra (setup + monitoreo + post-procesado). Default: printHours */
  laborHours?: number
  /** Costo de consumibles asignado a este trabajo (nozzles, build plate, lija...) */
  consumablesCost?: number
  /** Perfil de la impresora usada (opcional — si falta, energía/depreciación = 0) */
  printer?: PrinterCostProfile | null
  settings: CostSettings
}

export interface CostBreakdown {
  material: number
  machineEnergy: number
  machineDepreciation: number
  machineTotal: number
  labor: number
  consumables: number
  overhead: number
  /** Subtotal = todo menos buffer de fallo */
  subtotal: number
  failBuffer: number
  totalCost: number
  suggestedPrice: number
  profitAmount: number
  /** Margen real sobre venta (%). Cuanto más cerca de targetMarginPercent, mejor */
  marginPercent: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Costo de energía de un trabajo: (watts/1000) × precio_kWh × horas */
export function machineEnergyCost(profile: PrinterCostProfile, kwhPrice: number, hours: number): number {
  return round2((profile.powerWatts / 1000) * kwhPrice * Math.max(0, hours))
}

/** Depreciación de máquina por trabajo: (costo_compra / horas_vida) × horas */
export function machineDepreciationCost(profile: PrinterCostProfile, hours: number): number {
  const lifetime = Math.max(1, profile.expectedLifetimeHours)
  return round2((profile.purchasePrice / lifetime) * Math.max(0, hours))
}

/** Tarifa de máquina por hora (depreciación + energía) — útil para mostrar en el form */
export function machineRatePerHour(profile: PrinterCostProfile, kwhPrice: number): number {
  return round2(machineDepreciationCost(profile, 1) + (profile.powerWatts / 1000) * kwhPrice)
}

export function calculateCost(input: CostInput): CostBreakdown {
  const { settings } = input
  const material = round2((input.filamentGrams / 1000) * (input.materialPricePerKg || 0))
  const hours = Math.max(0, input.printHours)

  let machineEnergy = 0
  let machineDepreciation = 0
  if (input.printer) {
    machineEnergy = machineEnergyCost(input.printer, settings.kwhPrice, hours)
    machineDepreciation = machineDepreciationCost(input.printer, hours)
  }

  const laborHours = input.laborHours ?? hours
  const labor = round2(Math.max(0, laborHours) * settings.laborRatePerHour)
  const consumables = round2(input.consumablesCost ?? 0)
  const overhead = round2(settings.overheadPerJob ?? 0)

  const subtotal = round2(material + machineEnergy + machineDepreciation + labor + consumables + overhead)
  const failBuffer = round2(subtotal * (Math.max(0, settings.failRatePercent) / 100))
  const totalCost = round2(subtotal + failBuffer)

  const target = Math.max(1, settings.targetMarginPercent) / 100
  // Margen sobre venta: precio = costo / (1 - margen%)
  const suggestedPrice = round2(totalCost / (1 - target))
  const profitAmount = round2(suggestedPrice - totalCost)
  const marginPercent = suggestedPrice > 0 ? round2((profitAmount / suggestedPrice) * 100) : 0

  return {
    material,
    machineEnergy,
    machineDepreciation,
    machineTotal: round2(machineEnergy + machineDepreciation),
    labor,
    consumables,
    overhead,
    subtotal,
    failBuffer,
    totalCost,
    suggestedPrice,
    profitAmount,
    marginPercent,
  }
}

/**
 * Formatea un monto según la moneda.
 * - ARS: pesos argentinos, sin decimales, formato es-AR ("$ 1.234.567")
 * - USD: dólares con 2 decimales ("US$ 1.234,56")
 */
export function formatMoney(amount: number, currency: Currency = 'ARS'): string {
  const digits = currency === 'USD' ? 2 : 0
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount || 0)
  } catch {
    return `${amount?.toFixed(2) ?? '0.00'}`
  }
}

/** Valores por defecto sensatos para un taller Argentino */
export function defaultCostSettings(partial?: Partial<CostSettings>): CostSettings {
  return {
    kwhPrice: 120.5,
    laborRatePerHour: 800,
    targetMarginPercent: 60,
    failRatePercent: 10,
    overheadPerJob: 0,
    currency: 'ARS',
    ...partial,
  }
}
