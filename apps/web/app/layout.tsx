import type { Metadata } from 'next'
import NavBar from '@/app/components/NavBar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Geist } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Integration Details Portal',
  description: 'Site and facility integration management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="min-h-screen bg-muted/40 text-foreground antialiased">
        <TooltipProvider delay={300}>
          <NavBar />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
