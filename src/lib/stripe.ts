import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export const STRIPE_PRICES: Record<string, Record<string, string>> = {
  starter: {
    monthly: 'price_1TJYzKCMqbySmS17A0h62k2U',
    annual:  'price_1TJYzKCMqbySmS17sm1rPn91',
  },
  pro: {
    monthly: 'price_1TJYzKCMqbySmS17C9qPxm6V',
    annual:  'price_1TJYzLCMqbySmS17RvQ5b7NA',
  },
  business: {
    monthly: 'price_1TJYzLCMqbySmS17NppY04Rr',
    annual:  'price_1TJYzMCMqbySmS17cHwveNUm',
  },
}
