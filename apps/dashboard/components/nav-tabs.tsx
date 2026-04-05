'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Public Metrics' },
  { href: '/private-insights', label: 'Private Insights' },
];

export const NavTabs = () => {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 rounded-full border border-pine/15 bg-canvas p-1">
      {links.map((link) => {
        const isActive = link.href === '/'
          ? pathname === '/'
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-pine text-white shadow-sm'
                : 'text-pine hover:bg-white hover:text-ink'
            }`}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
