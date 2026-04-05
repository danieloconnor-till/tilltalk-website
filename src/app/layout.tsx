import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'

const inter = Inter({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'TillTalk — WhatsApp Sales Analytics for Restaurants',
  description:
    'Connect your POS system and get instant sales insights on WhatsApp. No dashboards needed. Try free for 14 days.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <Nav />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  )
}
