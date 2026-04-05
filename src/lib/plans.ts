export const PLANS = {
  starter: {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290,
    locations: 1,
    numbers: 2,
    stripePriceId: '',
    features: [
      '1 location',
      '2 WhatsApp numbers',
      'Daily revenue summaries',
      'Basic item queries',
      'Email support',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 490,
    locations: 3,
    numbers: 4,
    stripePriceId: '',
    features: [
      '3 locations',
      '4 WhatsApp numbers',
      'Full reports with charts',
      'Email attachments',
      'Voice note support',
      'Priority email support',
    ],
  },
  business: {
    name: 'Business',
    monthlyPrice: 99,
    annualPrice: 990,
    locations: 10,
    numbers: 999,
    stripePriceId: '',
    features: [
      '10 locations',
      'Unlimited numbers',
      'Multi-user access',
      'All Pro features',
      'Custom setup support',
      'Priority phone support',
    ],
  },
} as const

export type PlanKey = keyof typeof PLANS
