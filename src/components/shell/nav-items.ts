export interface NavItem {
  readonly href: string;
  readonly label: string;
}

/** Primary navigation (E-00-05 AC-1). */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/imports', label: 'Imports' },
  { href: '/employees', label: 'Employees' },
  { href: '/settings', label: 'Settings' },
  { href: '/audit', label: 'Audit' },
];

/** A nav item is active for its own path and any nested path (e.g. /employees/123). */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
