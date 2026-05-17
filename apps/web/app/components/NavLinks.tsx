'use client'

import { usePathname } from 'next/navigation'

const BASE_LINKS = [
  { href: '/sites',      label: 'Sites' },
  { href: '/facilities', label: 'Facilities' },
]

const ADMIN_LINKS = [
  { href: '/admin/audit',  label: 'Audit Log' },
  { href: '/admin/import', label: 'Import' },
  { href: '/admin/export', label: 'Export' },
  { href: '/admin/roles',  label: 'Roles' },
  { href: '/admin/config', label: 'Config' },
]

export default function NavLinks({ showAudit = false }: { showAudit?: boolean }) {
  const pathname = usePathname()
  const links = showAudit ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS

  return (
    <nav className="flex items-center gap-0.5">
      {links.map(link => {
        const active = pathname === link.href || pathname.startsWith(link.href + '/')
        return (
          <a
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-[#18efe4]'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {link.label}
          </a>
        )
      })}
    </nav>
  )
}
