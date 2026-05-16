import type { Metadata } from 'next'
import NavBar from '@/app/components/NavBar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Integration Details Portal',
  description: 'Site and facility integration management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  )
}
