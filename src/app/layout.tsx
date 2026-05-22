import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import SupportChatWidget from '@/components/SupportChatWidget'
import PwaInit from '@/components/PwaInit'

const inter = Inter({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'TillTalk — AI-managed marketing for hospitality & retail',
  description:
    'TillTalk runs your Meta, Google, and TikTok campaigns, reads your till to verify what actually drove revenue, and only charges a percentage of the new revenue we bring in.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TillTalk',
  },
  other: {
    'facebook-domain-verification': 'm16bv7be86vtf0r6qt5awd0e68gllh',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#16a34a" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <Nav />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
        <SupportChatWidget />
        <PwaInit />
      </body>
    </html>
  )
}
