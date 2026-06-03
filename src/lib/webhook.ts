import { getServiceClient } from './supabase/admin'

interface WebhookPayload {
  event: string
  title: string
  message: string
  data?: any
  timestamp: string
}

export async function triggerWebhook(
  event: string,
  title: string,
  message: string,
  data?: any,
  userWebhookUrl?: string
) {
  try {
    // Try user's personal webhook first, then fall back to global
    let url = userWebhookUrl || ''

    if (!url) {
      const supabase = getServiceClient()
      const { data: settings } = await supabase
        .from('ajustes')
        .select('webhook_url')
        .eq('id', 'global')
        .single()
      url = settings?.webhook_url || ''
    }

    if (!url) return // No webhook configured

    const payload: WebhookPayload = {
      event,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error(`Webhook ${event} error: ${res.status}`)
    }
  } catch (err) {
    console.error('Webhook error:', err)
  }
}
