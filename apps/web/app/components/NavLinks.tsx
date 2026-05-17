'use client'

import { usePathname } from 'next/navigation'

const BASE_LINKS = [
  { href: '/sites',      label: 'Sites' },
  { href: '/facilities', label: 'Facilities' },
]

const ADMIN_LINKS = [
  { href: '/admin/audit',  label: 'Audit Log' },
  { href: '/admin/import', label: 'Import' },
]

export default function NavLinks({ showAudit = false }: { showAudit?: boolean }) {
  const pathname = usePathname()
  const links = showAudit ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS

  return (
    <nav className="flex items-center gap-1">
      {links.map(link => {
        const active = pathname.startsWith(link.href)
        return (
          <a
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {link.label}
          </a>
        )
      })}
    </nav>
  )
}
