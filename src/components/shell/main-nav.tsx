'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { isActivePath, NAV_ITEMS } from './nav-items';

/**
 * Primary navigation. Inline on wide screens; below 768px it collapses behind a
 * keyboard-operable menu button. The active link is marked with aria-current
 * plus a bold weight and underline, so it never relies on colour alone.
 */
export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  // Close the mobile menu after navigating.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = NAV_ITEMS.map((item) => {
    const active = isActivePath(pathname, item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={`block rounded-md px-3 py-2 text-sm ${
            active ? 'bg-white/20 font-bold underline decoration-2 underline-offset-4' : 'font-medium text-white/85 hover:bg-white/10'
          }`}
        >
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <nav aria-label="Main" className="relative">
      <button
        type="button"
        className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold md:hidden"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span aria-hidden="true">☰</span> Menu
      </button>
      <ul
        id={menuId}
        className={`${open ? 'flex' : 'hidden'} absolute right-0 z-40 mt-2 min-w-48 flex-col gap-1 rounded-lg bg-navy p-2 shadow-lg md:static md:mt-0 md:flex md:min-w-0 md:flex-row md:bg-transparent md:p-0 md:shadow-none`}
      >
        {links}
      </ul>
    </nav>
  );
}
