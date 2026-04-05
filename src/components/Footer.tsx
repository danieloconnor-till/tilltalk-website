import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <span className="text-2xl font-bold text-green-400">TillTalk</span>
            <p className="mt-2 text-sm text-gray-400">
              WhatsApp sales analytics for Irish restaurants
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Built in Ireland 🇮🇪
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <a href="mailto:hello@tilltalk.ie" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* GDPR badge */}
          <div>
            <div className="flex items-start gap-3 bg-gray-800 rounded-lg p-4">
              <Shield className="text-green-400 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-200">GDPR Compliant</p>
                <p className="text-xs text-gray-400 mt-1">
                  Hosted in Ireland. EU data residency. Your data is never sold or shared.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          © 2026 TillTalk. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
