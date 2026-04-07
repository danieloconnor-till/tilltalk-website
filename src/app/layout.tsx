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
  title: 'TillTalk — WhatsApp Sales Analytics for Your POS',
  description:
    'Connect your POS system and get instant sales insights on WhatsApp. No dashboards needed. Try free for 14 days.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TillTalk',
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
        <link rel="apple-touch-icon" href="/icon.svg" />
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
