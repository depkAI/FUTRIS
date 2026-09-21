import type { Metadata } from 'next'
import { Poppins, Cinzel } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Four Cups',
  description:
    'An old-school love fortune, held in a folded paper fortune teller. Fold it open, choose by instinct, and let the numbers reveal the rest.',
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%230b0911%22/%3E%3Cpath d=%22M32 8L56 32L32 56L8 32Z%22 fill=%22none%22 stroke=%22%23d9b36a%22 stroke-width=%225%22/%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%224%22 fill=%22%23d9b36a%22/%3E%3C/svg%3E',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${cinzel.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}