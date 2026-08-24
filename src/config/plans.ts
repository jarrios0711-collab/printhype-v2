export type PlanId = 'FREE' | 'BASIC' | 'PRO'

export interface PlanDefinition {
  id: PlanId
  name: string
  /** Precio de lanzamiento en ARS (ajustar al día del lanzamiento) */
  priceARS: number
  maxOrders: number
  maxInventoryItems: number
  aiLab: boolean
  tracking: boolean
  features: string[]
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    priceARS: 0,
    maxOrders: 5,
    maxInventoryItems: 10,
    aiLab: false,
    tracking: false,
    features: [
      'Hasta 5 pedidos / mes',
      'Hasta 10 materiales en stock',
      'Presupuestos con margen real',
      'Cola de impresión manual',
      '1 usuario',
    ],
  },
  BASIC: {
    id: 'BASIC',
    name: 'Basic',
    priceARS: 10900,
    maxOrders: 100,
    maxInventoryItems: 200,
    aiLab: true,
    tracking: true,
    features: [
      'Hasta 100 pedidos / mes',
      'Hasta 200 materiales en stock',
      'AI Lab incluido',
      'Link público de seguimiento',
      'Soporte por WhatsApp',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    priceARS: 21900,
    maxOrders: Infinity,
    maxInventoryItems: Infinity,
    aiLab: true,
    tracking: true,
    features: [
      'Pedidos ilimitados',
      'Stock ilimitado',
      'AI Lab incluido',
      'Link público de seguimiento',
      'Soporte prioritario + acceso anticipado',
    ],
  },
}

export const PLAN_IDS: PlanId[] = ['FREE', 'BASIC', 'PRO']

const PLAN_ORDER: Record<PlanId, number> = { FREE: 0, BASIC: 1, PRO: 2 }

export function isPlanAtLeast(current: PlanId, required: PlanId): boolean {
  return PLAN_ORDER[current] >= PLAN_ORDER[required]
}
