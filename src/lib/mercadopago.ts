import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'

/**
 * Cliente MercadoPago. Devuelve null si no hay access token configurado
 * (la app funciona en modo Free sin credenciales).
 */
export function getMpConfig(): MercadoPagoConfig | null {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return null
  return new MercadoPagoConfig({ accessToken })
}

export function mercadopagoEnabled(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)
}

export interface CreateSubscriptionParams {
  reason: string
  amount: number
  payerEmail: string
  externalReference: string
  backUrl: string
}

/** Crea una suscripción recurrente mensual (endpoint clásico /preapproval) */
export async function createSubscription(params: CreateSubscriptionParams) {
  const config = getMpConfig()
  if (!config) throw new Error('Pagos no habilitados (MERCADOPAGO_ACCESS_TOKEN no configurado)')
  const preApproval = new PreApproval(config)
  const response = await preApproval.create({
    body: {
      reason: params.reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.amount,
        currency_id: 'ARS',
      },
      payer_email: params.payerEmail,
      external_reference: params.externalReference,
      back_url: params.backUrl,
    },
  })
  return response
}

export async function cancelPreapproval(id: string) {
  const config = getMpConfig()
  if (!config) throw new Error('Pagos no habilitados (MERCADOPAGO_ACCESS_TOKEN no configurado)')
  const preApproval = new PreApproval(config)
  return preApproval.update({ id, body: { status: 'cancelled' } })
}

export async function getPreapproval(id: string) {
  const config = getMpConfig()
  if (!config) throw new Error('Pagos no habilitados (MERCADOPAGO_ACCESS_TOKEN no configurado)')
  const preApproval = new PreApproval(config)
  return preApproval.get({ id })
}

export async function getPayment(id: string) {
  const config = getMpConfig()
  if (!config) throw new Error('Pagos no habilitados (MERCADOPAGO_ACCESS_TOKEN no configurado)')
  const payment = new Payment(config)
  return payment.get({ id })
}
